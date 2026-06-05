from __future__ import annotations

from dataclasses import dataclass, field
import io
import json
from typing import Any, Awaitable, Callable, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import inspect, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..database import get_db
from ..models import models
from .monitoring import build_monitoring_payload, save_monitoring_history
from .utils import filter_valid_columns, get_current_user_id

router = APIRouter(prefix="/import", tags=["Intelligence Engine"])


@dataclass
class ImportField:
    name: str
    label: str
    required: bool = False
    description: str = ""
    input_kind: str = "text"
    input_control: str = "text"
    template_hint: str = ""
    aliases: list[str] = field(default_factory=list)
    accepts_multiple: bool = False
    supported_in_builder: bool = True
    unsupported_reason: str = ""
    validation_rules: list[str] = field(default_factory=list)
    options_key: Optional[str] = None


@dataclass
class ImportProfile:
    key: str
    display_name: str
    model: Any
    fields: list[ImportField]
    execute_rows: Callable[[AsyncSession, list[dict[str, Any]], Optional[str]], Any]
    preview_rows: Callable[[AsyncSession, list[dict[str, Any]]], Any]
    schema_context: Optional[Callable[[AsyncSession], Awaitable[dict[str, Any]]]] = None
    serialize_example_row: Optional[Callable[[AsyncSession, Any], Awaitable[dict[str, Any]]]] = None


GENERIC_EXCLUDE_COLUMNS = {
    "id",
    "created_at",
    "updated_at",
    "created_by_user_id",
    "hardware_age",
    "open_incident_count",
}


def normalize_scalar(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    if isinstance(value, str):
      trimmed = value.strip()
      return trimmed or None
    return value


def stringify_json(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return value


def coerce_bool(value: Any) -> bool:
    normalized = str(value).strip().lower()
    if normalized in {"true", "1", "yes", "y"}:
        return True
    if normalized in {"false", "0", "no", "n"}:
        return False
    raise ValueError("must be a boolean")


def coerce_value_for_column(column: Any, value: Any) -> Any:
    normalized = normalize_scalar(value)
    if normalized is None:
        return None
    python_type = column.type.python_type
    if python_type == bool:
        return coerce_bool(normalized)
    if python_type == int:
        return int(normalized)
    if python_type == float:
        return float(normalized)
    if python_type in {dict, list}:
        if isinstance(normalized, str):
            return json.loads(normalized)
        return normalized
    return normalized


def split_multi_value(value: Any) -> list[str]:
    normalized = normalize_scalar(value)
    if normalized is None:
        return []
    if isinstance(normalized, list):
        return [str(entry).strip() for entry in normalized if str(entry).strip()]
    raw = str(normalized).replace("\n", ",")
    return [entry.strip() for entry in raw.split(",") if entry.strip()]


def rows_from_dataframe(df: pd.DataFrame) -> list[dict[str, Any]]:
    normalized = df.where(pd.notnull(df), None)
    return [dict(row) for _, row in normalized.iterrows()]


def load_dataframe_from_upload(file: UploadFile, content: bytes) -> pd.DataFrame:
    lower_name = (file.filename or "").lower()
    if lower_name.endswith(".csv"):
        return pd.read_csv(io.BytesIO(content))
    if lower_name.endswith(".xlsx") or lower_name.endswith(".xls"):
        return pd.read_excel(io.BytesIO(content))
    raise HTTPException(status_code=400, detail="Only CSV and Excel uploads are supported")


def generic_fields_for_model(model: Any) -> list[ImportField]:
    mapper = inspect(model)
    fields: list[ImportField] = []
    for column in mapper.columns:
        if column.primary_key or column.name in GENERIC_EXCLUDE_COLUMNS:
            continue
        hint = "[STRING]"
        try:
            python_type = column.type.python_type
            if python_type == int:
                hint = "[INTEGER]"
            elif python_type == float:
                hint = "[FLOAT]"
            elif python_type == bool:
                hint = "[BOOLEAN]"
            elif python_type == dict:
                hint = "[JSON_OBJECT]"
            elif python_type == list:
                hint = "[JSON_ARRAY]"
        except NotImplementedError:
            pass
        fields.append(
            ImportField(
                name=column.name,
                label=column.name.replace("_", " ").title(),
                required=not column.nullable and column.default is None and column.server_default is None,
                template_hint=hint,
            )
        )
    return fields


async def preview_generic_rows(db: AsyncSession, model: Any, rows: list[dict[str, Any]]) -> dict[str, Any]:
    mapper = inspect(model)
    relevant_columns = {
        column.name: column
        for column in mapper.columns
        if not column.primary_key and column.name not in GENERIC_EXCLUDE_COLUMNS
    }
    results = []
    for index, raw_row in enumerate(rows):
        normalized_row: dict[str, Any] = {}
        errors: list[str] = []
        for column_name, column in relevant_columns.items():
            try:
                normalized_row[column_name] = coerce_value_for_column(column, raw_row.get(column_name))
            except (ValueError, TypeError, json.JSONDecodeError):
                errors.append(f"{column_name} has an invalid value")

            value = normalized_row.get(column_name)
            if not column.nullable and value is None and column.default is None and column.server_default is None:
                errors.append(f"{column_name} is required")

        results.append({
            "row": index + 1,
            "source": raw_row,
            "normalized": normalized_row,
            "status": "VALID" if not errors else "INVALID",
            "errors": errors,
        })

    valid = [result for result in results if result["status"] == "VALID"]
    invalid = [result for result in results if result["status"] == "INVALID"]
    return {
        "total_rows": len(results),
        "valid_rows": len(valid),
        "invalid_rows": len(invalid),
        "total_errors": sum(len(result["errors"]) for result in invalid),
        "results": results,
    }


async def execute_generic_rows(db: AsyncSession, model: Any, rows: list[dict[str, Any]], user_id: Optional[str]) -> dict[str, Any]:
    preview = await preview_generic_rows(db, model, rows)
    invalid = [result for result in preview["results"] if result["status"] == "INVALID"]
    if invalid:
        return {"status": "failed", "errors": [f"Row {result['row']}: {', '.join(result['errors'])}" for result in invalid], "count": 0}

    mapper = inspect(model)
    relevant_columns = {
        column.name: column
        for column in mapper.columns
        if not column.primary_key and column.name not in GENERIC_EXCLUDE_COLUMNS
    }
    count = 0
    for raw_row in rows:
        clean_data = {}
        for column_name, column in relevant_columns.items():
            clean_data[column_name] = coerce_value_for_column(column, raw_row.get(column_name))
        clean_data = filter_valid_columns(model, clean_data)
        if hasattr(model, "created_by_user_id") and user_id:
            clean_data["created_by_user_id"] = user_id
        db.add(model(**clean_data))
        count += 1

    await db.commit()
    if user_id:
        db.add(models.AuditLog(
            user_id=user_id,
            action="BULK_IMPORT",
            target_table=model.__tablename__.upper(),
            target_id="MULTIPLE",
            description=f"Bulk imported {count} records into {model.__tablename__}.",
        ))
        await db.commit()
    return {"status": "success", "count": count}


MONITORING_IMPORT_REQUIRED_FIELD_NAMES = {"category", "status", "title"}
MONITORING_IMPORT_SUPPORTED_FIELD_NAMES = {
    "device_name",
    "category",
    "status",
    "title",
    "platform",
    "purpose",
    "impact",
    "notification_method",
    "notification_recipients",
    "owner_team",
    "monitoring_url",
    "severity",
    "check_interval",
    "alert_duration",
    "notification_throttle",
}


def build_monitoring_import_fields() -> list[ImportField]:
    return [
        ImportField("device_name", "Target Asset", description="Existing asset name. Resolves to device_id.", template_hint="[Existing asset name]", input_control="select", options_key="device_name"),
        ImportField("category", "Category", required="category" in MONITORING_IMPORT_REQUIRED_FIELD_NAMES, template_hint="[Monitoring category]", input_control="select", options_key="category"),
        ImportField("status", "Status", required="status" in MONITORING_IMPORT_REQUIRED_FIELD_NAMES, template_hint="[Existing|Planned|Cancelled|Decommissioned]", input_control="select", options_key="status"),
        ImportField("title", "Title", required="title" in MONITORING_IMPORT_REQUIRED_FIELD_NAMES, template_hint="[Short monitor title]", validation_rules=["Required. Keep it concise and unique enough to identify the monitor."]),
        ImportField("platform", "Platform", required=False, template_hint="[Monitoring platform]", input_control="select", options_key="platform"),
        ImportField("purpose", "Purpose", template_hint="[Why this monitor exists]", input_kind="multiline", input_control="textarea"),
        ImportField("impact", "Impact", template_hint="[What happens if it fails]", input_kind="multiline", input_control="textarea"),
        ImportField("notification_method", "Notification Method", template_hint="[Notification route]", input_control="select", options_key="notification_method"),
        ImportField("notification_recipients", "Notification Recipients", input_kind="multiline", input_control="textarea", template_hint="[comma separated user IDs or emails]", accepts_multiple=True, validation_rules=["Comma-separated recipients only."]),
        ImportField("owner_team", "Owner Team", required=True, template_hint="[Managed team name]", input_control="select", options_key="owner_team", validation_rules=["Bulk import supports team ownership only. Individual owners stay in the add/edit workspace."]),
        ImportField("monitoring_url", "Monitoring URL", template_hint="[https://...]", input_control="url", validation_rules=["Must be a valid http/https URL with a host."]),
        ImportField("severity", "Severity", required=False, template_hint="[Critical|Warning|Info]", input_control="select", options_key="severity"),
        ImportField("check_interval", "Check Interval (sec)", template_hint="[15-86400]", input_control="number", validation_rules=["Must be between 15 and 86400 seconds."]),
        ImportField("alert_duration", "Alert Duration (sec)", template_hint="[0-86400]", input_control="number", validation_rules=["Must be between 0 and 86400 seconds."]),
        ImportField("notification_throttle", "Notification Throttle (sec)", template_hint="[60-604800]", input_control="number", validation_rules=["Must be between 60 and 604800 seconds."]),
        ImportField("spec", "Spec", input_kind="multiline", input_control="unsupported", template_hint="[Use add/edit workspace]", supported_in_builder=False, unsupported_reason="Spec content is freeform threshold documentation and is not standardized enough for strict bulk import."),
        ImportField("logic", "Logic", input_kind="multiline", input_control="unsupported", template_hint="[Use add/edit workspace]", supported_in_builder=False, unsupported_reason="Logic belongs in the structured monitoring logic editor, not the simplified import grid."),
        ImportField("monitored_service_names", "Services", input_control="unsupported", template_hint="[Use add/edit workspace]", accepts_multiple=True, supported_in_builder=False, unsupported_reason="Service coverage depends on the linked asset and must be chosen from the add/edit workspace."),
        ImportField("recovery_doc_titles", "Recovery Documents", input_control="unsupported", template_hint="[Use add/edit workspace]", accepts_multiple=True, supported_in_builder=False, unsupported_reason="Recovery documents should be linked from the knowledge workspace search, not typed into bulk import."),
    ]


MONITORING_IMPORT_FIELDS = build_monitoring_import_fields()


async def fetch_setting_options(db: AsyncSession, category: str) -> list[dict[str, str]]:
    result = await db.execute(
        select(models.SettingOption.value, models.SettingOption.label, models.SettingOption.description)
        .where(models.SettingOption.category == category)
        .order_by(models.SettingOption.label)
    )
    return [
        {
            "value": value,
            "label": label or value,
            "description": description or "",
        }
        for value, label, description in result.all()
        if value
    ]


async def build_monitoring_schema_context(db: AsyncSession) -> dict[str, Any]:
    devices = await db.execute(select(models.Device.name).where(models.Device.is_deleted == False).order_by(models.Device.name))
    teams = await db.execute(select(models.Team.name).where(models.Team.is_archived == False).order_by(models.Team.name))
    methods = await fetch_setting_options(db, "NotificationMethod")
    if not methods:
        methods = [
            {"value": "Email", "label": "Email", "description": "Deliver alerts by email."},
            {"value": "Slack", "label": "Slack", "description": "Deliver alerts to Slack."},
            {"value": "PagerDuty", "label": "PagerDuty", "description": "Trigger PagerDuty escalation."},
        ]

    example_items_res = await db.execute(
        select(models.MonitoringItem.id, models.MonitoringItem.title)
        .where(models.MonitoringItem.is_deleted == False)
        .order_by(models.MonitoringItem.updated_at.desc(), models.MonitoringItem.id.desc())
        .limit(20)
    )

    return {
        "options": {
            "device_name": [{"value": name, "label": name, "description": "Existing asset"} for name in devices.scalars().all() if name],
            "category": await fetch_setting_options(db, "MonitoringCategory"),
            "platform": await fetch_setting_options(db, "MonitoringPlatform"),
            "notification_method": methods,
            "owner_team": [{"value": name, "label": name, "description": "Registered team"} for name in teams.scalars().all() if name],
            "severity": [
                {"value": "Critical", "label": "Critical", "description": "Requires linked recovery guidance."},
                {"value": "Warning", "label": "Warning", "description": "Actionable but not highest urgency."},
                {"value": "Info", "label": "Info", "description": "Informational visibility only."},
            ],
            "status": [
                {"value": "Existing", "label": "Existing", "description": "Already in production."},
                {"value": "Planned", "label": "Planned", "description": "Approved but not yet active."},
                {"value": "Cancelled", "label": "Cancelled", "description": "Retired before implementation."},
                {"value": "Decommissioned", "label": "Decommissioned", "description": "Previously active and now retired."},
            ],
        },
        "example_records": [
            {"id": item_id, "label": title}
            for item_id, title in example_items_res.all()
            if title
        ],
    }


async def serialize_monitoring_example_row(db: AsyncSession, item: models.MonitoringItem) -> dict[str, Any]:
    device_name = None
    if item.device_id:
        device_name = await db.scalar(select(models.Device.name).where(models.Device.id == item.device_id))

    return {
        "device_name": device_name or "",
        "category": item.category or "",
        "status": item.status or "",
        "title": item.title or "",
        "platform": item.platform or "",
        "purpose": item.purpose or "",
        "impact": item.impact or "",
        "notification_method": item.notification_method or "",
        "notification_recipients": ", ".join(item.notification_recipients or []),
        "owner_team": item.owner_team or "",
        "monitoring_url": item.monitoring_url or "",
        "severity": item.severity or "",
        "check_interval": item.check_interval,
        "alert_duration": item.alert_duration,
        "notification_throttle": item.notification_throttle,
    }


async def build_monitoring_import_row(db: AsyncSession, raw_row: dict[str, Any]) -> dict[str, Any]:
    row = {key: normalize_scalar(value) for key, value in raw_row.items()}
    next_row: dict[str, Any] = {}

    for field_name in ("category", "status", "title", "platform", "purpose", "impact", "notification_method", "owner_team", "monitoring_url", "severity", "spec", "logic"):
        if field_name in row:
            next_row[field_name] = row.get(field_name)

    for integer_field in ("check_interval", "alert_duration", "notification_throttle"):
        if integer_field in row and row.get(integer_field) is not None:
            next_row[integer_field] = int(row[integer_field])

    if row.get("device_id") is not None:
        next_row["device_id"] = int(row["device_id"])
    elif row.get("device_name"):
        result = await db.execute(select(models.Device.id).where(models.Device.name == row["device_name"]))
        device_id = result.scalar_one_or_none()
        if device_id is None:
            raise HTTPException(status_code=400, detail=f"Unknown device_name: {row['device_name']}")
        next_row["device_id"] = device_id

    if "notification_recipients" in row:
        next_row["notification_recipients"] = split_multi_value(row.get("notification_recipients"))

    if row.get("monitored_services") is not None:
        next_row["monitored_services"] = row["monitored_services"]
    elif row.get("monitored_service_names"):
        names = split_multi_value(row.get("monitored_service_names"))
        if names:
            result = await db.execute(select(models.LogicalService.id, models.LogicalService.name).where(models.LogicalService.name.in_(names)))
            mapping = {name: service_id for service_id, name in result.all()}
            missing = [name for name in names if name not in mapping]
            if missing:
                raise HTTPException(status_code=400, detail=f"Unknown monitored services: {', '.join(missing)}")
            next_row["monitored_services"] = [mapping[name] for name in names]

    if row.get("recovery_docs") is not None:
        next_row["recovery_docs"] = row["recovery_docs"]
    elif row.get("recovery_doc_titles"):
        titles = split_multi_value(row.get("recovery_doc_titles"))
        if titles:
            result = await db.execute(select(models.KnowledgeEntry.id, models.KnowledgeEntry.title).where(models.KnowledgeEntry.title.in_(titles)))
            mapping = {title: knowledge_id for knowledge_id, title in result.all()}
            missing = [title for title in titles if title not in mapping]
            if missing:
                raise HTTPException(status_code=400, detail=f"Unknown recovery documents: {', '.join(missing)}")
            next_row["recovery_docs"] = [mapping[title] for title in titles]

    return next_row


async def preview_monitoring_rows(db: AsyncSession, rows: list[dict[str, Any]]) -> dict[str, Any]:
    results = []
    for index, raw_row in enumerate(rows):
        errors: list[str] = []
        normalized_row: dict[str, Any] = {}
        try:
            candidate = await build_monitoring_import_row(db, raw_row)
            clean_data, owners_data = await build_monitoring_payload(db, candidate, partial=False)
            normalized_row = {**clean_data, "owners": owners_data or []}
        except HTTPException as exc:
            detail = exc.detail
            if isinstance(detail, list):
                errors.extend(str(entry) for entry in detail)
            else:
                errors.append(str(detail))
        except (ValueError, TypeError) as exc:
            errors.append(str(exc))

        results.append({
            "row": index + 1,
            "source": raw_row,
            "normalized": normalized_row,
            "status": "VALID" if not errors else "INVALID",
            "errors": errors,
        })

    valid = [result for result in results if result["status"] == "VALID"]
    invalid = [result for result in results if result["status"] == "INVALID"]
    return {
        "total_rows": len(results),
        "valid_rows": len(valid),
        "invalid_rows": len(invalid),
        "total_errors": sum(len(result["errors"]) for result in invalid),
        "results": results,
    }


async def execute_monitoring_rows(db: AsyncSession, rows: list[dict[str, Any]], user_id: Optional[str]) -> dict[str, Any]:
    preview = await preview_monitoring_rows(db, rows)
    invalid = [result for result in preview["results"] if result["status"] == "INVALID"]
    if invalid:
        return {"status": "failed", "errors": [f"Row {result['row']}: {', '.join(result['errors'])}" for result in invalid], "count": 0}

    count = 0
    for raw_row in rows:
        candidate = await build_monitoring_import_row(db, raw_row)
        item_data, owners_data = await build_monitoring_payload(db, candidate, partial=False)
        if user_id:
            item_data["created_by_user_id"] = user_id
        db_obj = models.MonitoringItem(**item_data)
        db.add(db_obj)
        await db.flush()
        for owner in owners_data or []:
            db.add(models.MonitoringOwner(**owner, monitoring_item_id=db_obj.id))
        count += 1

    await db.commit()

    result = await db.execute(
        select(models.MonitoringItem)
        .options(joinedload(models.MonitoringItem.owners).joinedload(models.MonitoringOwner.operator))
        .order_by(models.MonitoringItem.id.desc())
        .limit(count)
    )
    created_items = list(reversed(result.unique().scalars().all()))
    for item in created_items:
        await save_monitoring_history(item.id, item.version, db, "Import create")
    await db.commit()

    if user_id:
        db.add(models.AuditLog(
            user_id=user_id,
            action="BULK_IMPORT",
            target_table=models.MonitoringItem.__tablename__.upper(),
            target_id="MULTIPLE",
            description=f"Bulk imported {count} records into monitoring_items.",
        ))
        await db.commit()

    return {"status": "success", "count": count}


def profile_fields_to_payload(fields: list[ImportField], context: Optional[dict[str, Any]] = None) -> list[dict[str, Any]]:
    options_map = (context or {}).get("options", {})
    return [
        {
            "name": field.name,
            "label": field.label,
            "required": field.required,
            "description": field.description,
            "input_kind": field.input_kind,
            "input_control": field.input_control,
            "template_hint": field.template_hint,
            "aliases": field.aliases,
            "accepts_multiple": field.accepts_multiple,
            "supported_in_builder": field.supported_in_builder,
            "unsupported_reason": field.unsupported_reason,
            "validation_rules": field.validation_rules,
            "options": options_map.get(field.options_key or "", []),
        }
        for field in fields
    ]


GENERIC_MODEL_MAPPING = {
    "devices": models.Device,
    "racks": models.Rack,
    "logical_services": models.LogicalService,
    "far_records": models.FarFailureMode,
    "port_connections": models.PortConnection,
}


def build_import_profiles() -> dict[str, ImportProfile]:
    profiles: dict[str, ImportProfile] = {
        "monitoring_items": ImportProfile(
            key="monitoring_items",
            display_name="Monitoring",
            model=models.MonitoringItem,
            fields=MONITORING_IMPORT_FIELDS,
            preview_rows=preview_monitoring_rows,
            execute_rows=execute_monitoring_rows,
            schema_context=build_monitoring_schema_context,
            serialize_example_row=serialize_monitoring_example_row,
        )
    }

    for key, model in GENERIC_MODEL_MAPPING.items():
        profiles[key] = ImportProfile(
            key=key,
            display_name=model.__tablename__.replace("_", " ").title(),
            model=model,
            fields=generic_fields_for_model(model),
            preview_rows=lambda db, rows, current_model=model: preview_generic_rows(db, current_model, rows),
            execute_rows=lambda db, rows, user_id, current_model=model: execute_generic_rows(db, current_model, rows, user_id),
        )
    return profiles


IMPORT_PROFILES = build_import_profiles()


def get_import_profile(table_name: str) -> ImportProfile:
    profile = IMPORT_PROFILES.get(table_name)
    if not profile:
        raise HTTPException(status_code=404, detail="Import profile not found")
    return profile


def resolve_template_fields(profile: ImportProfile, requested_columns: Optional[str]) -> list[ImportField]:
    field_map = {field.name: field for field in profile.fields}
    required_names = [field.name for field in profile.fields if field.required]
    if not requested_columns:
        ordered_names = [field.name for field in profile.fields]
    else:
        requested_names = [column.strip() for column in requested_columns.split(",") if column.strip()]
        ordered_names = []
        for name in required_names + requested_names:
            if name in field_map and name not in ordered_names:
                ordered_names.append(name)
    return [field_map[name] for name in ordered_names]


@router.get("/schema/{table_name}")
async def get_import_schema(table_name: str, db: AsyncSession = Depends(get_db)):
    profile = get_import_profile(table_name)
    context = await profile.schema_context(db) if profile.schema_context else {}
    return {
        "table_name": profile.key,
        "display_name": profile.display_name,
        "fields": profile_fields_to_payload(profile.fields, context),
        "required_fields": [field.name for field in profile.fields if field.required],
        "example_records": context.get("example_records", []),
    }


@router.get("/template/{table_name}")
async def download_template(
    table_name: str,
    columns: Optional[str] = None,
    mode: str = "hints",
    example_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    profile = get_import_profile(table_name)
    fields = resolve_template_fields(profile, columns)
    df = pd.DataFrame(columns=[field.name for field in fields])

    if fields and mode in {"hints", "example"}:
        df.loc[0] = {field.name: field.template_hint or "[STRING]" for field in fields}
    if fields and mode == "example" and profile.serialize_example_row:
        example_row = None
        if example_id is not None:
            example_row = await db.get(profile.model, example_id)
        if example_row is None:
            query = select(profile.model).order_by(profile.model.updated_at.desc(), profile.model.id.desc()).limit(1)
            result = await db.execute(query)
            example_row = result.scalar_one_or_none()
        if example_row is not None:
            serialized_example = await profile.serialize_example_row(db, example_row)
            df.loc[len(df)] = {field.name: serialized_example.get(field.name, "") for field in fields}

    stream = io.BytesIO()
    df.to_csv(stream, index=False)
    stream.seek(0)
    return StreamingResponse(
        stream,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=SYSGRID_{table_name}_Template.csv"}
    )


@router.get("/snapshot/{table_name}")
async def download_snapshot(table_name: str, db: AsyncSession = Depends(get_db)):
    profile = get_import_profile(table_name)
    model = profile.model
    mapper = inspect(model)
    exclude = {"id", "created_at", "updated_at", "created_by_user_id"}
    cols = [column.name for column in mapper.columns if column.name not in exclude]

    query = select(model)
    if hasattr(model, "is_deleted"):
        query = query.where(model.is_deleted == False)

    result = await db.execute(query)
    records = result.scalars().all()
    data = []
    for record in records:
        row = {}
        for column in cols:
            row[column] = stringify_json(getattr(record, column))
        data.append(row)

    df = pd.DataFrame(data, columns=cols)
    stream = io.BytesIO()
    df.to_csv(stream, index=False)
    stream.seek(0)
    return StreamingResponse(
        stream,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=SYSGRID_{table_name}_Snapshot.csv"}
    )


@router.post("/preview-file")
async def preview_import_file(table_name: str = Form(...), file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    profile = get_import_profile(table_name)
    content = await file.read()
    try:
        df = load_dataframe_from_upload(file, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    preview = await profile.preview_rows(db, rows_from_dataframe(df))
    return {"table_name": table_name, **preview}


@router.post("/preview-rows")
async def preview_import_rows(
    table_name: str,
    payload: dict[str, Any] = Body(...),
    db: AsyncSession = Depends(get_db),
):
    profile = get_import_profile(table_name)
    rows = payload.get("rows")
    if not isinstance(rows, list):
        raise HTTPException(status_code=400, detail="rows must be a list")
    preview = await profile.preview_rows(db, rows)
    return {"table_name": table_name, **preview}


@router.post("/audit")
async def audit_import(table_name: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    return await preview_import_file(table_name=table_name, file=file, db=db)


@router.post("/execute")
async def execute_import(
    table_name: str,
    request: Request,
    body: Any = Body(...),
    db: AsyncSession = Depends(get_db),
):
    profile = get_import_profile(table_name)
    if isinstance(body, dict):
        rows = body.get("rows")
    else:
        rows = body
    if not isinstance(rows, list):
        raise HTTPException(status_code=400, detail="rows must be a list")

    user_id = get_current_user_id(request)
    return await profile.execute_rows(db, rows, user_id)
