"""Canonical project communication, resource, activity and report services.

This module deliberately consumes PV1 project/task/event projections.  Updates
and reports are snapshots or drafts; they never become a second place to edit
delivery truth.
"""

from __future__ import annotations

import base64
import binascii
import csv
import hashlib
import html
import io
import re
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from . import domain, models


RESOURCE_KINDS = {
    "Brief supplement",
    "Specification",
    "Runbook",
    "Test evidence",
    "Design decision",
    "General note",
    "External link",
    "Uploaded file",
}
REPORT_TYPES = {"Stakeholder summary", "Delivery acceptance", "Outcome review"}
HEALTH_ASSESSMENTS = {"On track", "At risk", "Off track"}
MAX_RESOURCE_CONTENT = 100_000
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/svg+xml",
    "text/plain",
    "text/markdown",
    "text/csv",
}


def _error(code: str, message: str, *, http_status: int = status.HTTP_422_UNPROCESSABLE_ENTITY, details: dict[str, Any] | None = None) -> domain.PV1DomainError:
    return domain.PV1DomainError(code, message, http_status=http_status, details=details or {})


def sanitize_markdown(value: Any, *, limit: int = MAX_RESOURCE_CONTENT) -> str:
    """Return safe Markdown interchange text, never executable HTML or URLs."""
    if value is None:
        return ""
    if not isinstance(value, str):
        raise _error("VALIDATION_FAILED", "Document content must be text.")
    if len(value) > limit:
        raise _error("VALIDATION_FAILED", f"Document content must be at most {limit} characters.")
    lowered = value.casefold()
    if re.search(r"<\s*(script|iframe|object|embed|applet|form|style)\b", lowered) or re.search(r"on[a-z]+\s*=", lowered):
        raise _error("UNSAFE_CONTENT", "Executable or event-handler markup is not allowed.", details={"field": "content"})
    if re.search(r"(?:javascript|vbscript|data):", lowered):
        raise _error("UNSAFE_CONTENT", "Executable and data URLs are not allowed.", details={"field": "content"})
    # HTML is not the persistence format.  Remove harmless-looking raw tags as
    # well so a future renderer cannot accidentally treat them as instructions.
    return re.sub(r"<[^>]*>", "", value).strip()


def render_safe_markdown(value: Any) -> str:
    """Render a small accessible subset without trusting document markup."""
    text = html.escape(sanitize_markdown(value), quote=True)
    lines: list[str] = []
    for raw in text.splitlines() or [""]:
        if raw.startswith("### "):
            lines.append(f"<h3>{raw[4:]}</h3>")
        elif raw.startswith("## "):
            lines.append(f"<h2>{raw[3:]}</h2>")
        elif raw.startswith("# "):
            lines.append(f"<h1>{raw[2:]}</h1>")
        elif raw.startswith("- "):
            lines.append(f"<p>• {raw[2:]}</p>")
        elif raw:
            lines.append(f"<p>{raw}</p>")
    return "\n".join(lines)


def _decode_upload(upload: dict[str, Any]) -> tuple[bytes, str, str]:
    filename = str(upload.get("filename") or "attachment").strip()[:255]
    mime_type = str(upload.get("mime_type") or "application/octet-stream").strip().casefold()
    encoded = upload.get("content_base64")
    if encoded is None:
        raw = b""
    else:
        try:
            raw = base64.b64decode(str(encoded), validate=True)
        except (ValueError, binascii.Error) as exc:
            raise _error("VALIDATION_FAILED", "The uploaded file content is not valid base64.") from exc
    return raw, filename, mime_type


def validate_upload(upload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(upload, dict):
        raise _error("VALIDATION_FAILED", "Upload metadata must be an object.")
    raw, filename, mime_type = _decode_upload(upload)
    declared_size = upload.get("size_bytes")
    size = len(raw) if raw else int(declared_size or 0)
    if size < 0 or size > MAX_UPLOAD_BYTES:
        raise _error("FILE_TOO_LARGE", "Files must be 25 MB or smaller.")
    if mime_type not in ALLOWED_MIME_TYPES:
        raise _error("UNSAFE_FILE", "This file type is not allowed by the project policy.")
    if mime_type == "application/pdf" and raw and not raw.startswith(b"%PDF"):
        raise _error("UNSAFE_FILE", "The file content does not match its declared PDF type.")
    if mime_type == "image/png" and raw and not raw.startswith(b"\x89PNG\r\n\x1a\n"):
        raise _error("UNSAFE_FILE", "The file content does not match its declared PNG type.")
    if mime_type == "image/jpeg" and raw and not raw.startswith(b"\xff\xd8"):
        raise _error("UNSAFE_FILE", "The file content does not match its declared JPEG type.")
    if mime_type == "image/svg+xml" and raw:
        svg = raw.decode("utf-8", errors="replace")
        if re.search(r"<!DOCTYPE|<!ENTITY|<\s*script\b|on[a-z]+\s*=|(?:javascript|data|file|https?):", svg, re.I) or re.search(r"(?:href|src|url)\s*=", svg, re.I):
            raise _error("UNSAFE_FILE", "SVG scripts and external resource URLs are not allowed.")
    if raw and re.search(rb"(?:EICAR|<script|javascript:)", raw, re.I):
        raise _error("UNSAFE_FILE", "The file failed the deterministic safety scan.")
    return {
        "filename": filename,
        "mime_type": mime_type,
        "size_bytes": size,
        "content_sha256": hashlib.sha256(raw).hexdigest() if raw else str(upload.get("content_sha256") or ""),
        "storage_ref": str(upload.get("storage_ref") or f"pending/{hashlib.sha256((filename + str(size)).encode()).hexdigest()}"),
        "scan_state": "Pending",
    }


def validate_storage_ref(value: Any) -> str | None:
    """Accept opaque tenant storage references, never filesystem paths."""
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip() or len(value) > 500:
        raise _error("VALIDATION_FAILED", "storage_ref is invalid.")
    candidate = value.strip()
    if candidate.startswith(("/", "\\")) or ".." in candidate.split("/") or ".." in candidate.split("\\") or re.match(r"^[A-Za-z]:", candidate):
        raise _error("UNSAFE_FILE", "storage_ref may not address a filesystem path.")
    if not re.fullmatch(r"[A-Za-z0-9._:/-]+", candidate):
        raise _error("VALIDATION_FAILED", "storage_ref contains unsupported characters.")
    return candidate


def neutralize_csv_cell(value: Any) -> str:
    text = "" if value is None else str(value)
    return "'" + text if text.startswith(("=", "+", "-", "@")) else text


def _source_revisions(project: models.PV1Project, *, event_start: int | None = None, event_end: int | None = None) -> dict[str, Any]:
    return {
        "project_revision": project.revision,
        "graph_revision": project.graph_revision,
        "event_sequence_start": event_start,
        "event_sequence_end": event_end,
    }


async def _events_between(session: AsyncSession, *, tenant_id: int, project_id: str, start: date, end: date) -> list[models.PV1Event]:
    result = await session.execute(
        select(models.PV1Event).where(
            models.PV1Event.tenant_id == tenant_id,
            models.PV1Event.project_id == project_id,
            models.PV1Event.timestamp >= datetime.combine(start, time.min, tzinfo=timezone.utc),
            models.PV1Event.timestamp < datetime.combine(end + timedelta(days=1), time.min, tzinfo=timezone.utc),
        ).order_by(models.PV1Event.sequence, models.PV1Event.event_id)
    )
    return list(result.scalars())


async def deterministic_update_draft(session: AsyncSession, *, project: models.PV1Project, actor_id: str, period_start: date, period_end: date) -> dict[str, Any]:
    if period_end < period_start:
        raise _error("VALIDATION_FAILED", "The reporting period must end on or after its start date.")
    events = await _events_between(session, tenant_id=project.tenant_id, project_id=project.id, start=period_start, end=period_end)
    task_ids = {event.aggregate_id for event in events if event.aggregate_type == "task"}
    tasks: dict[str, models.PV1Task] = {}
    if task_ids:
        task_result = await session.execute(select(models.PV1Task).where(models.PV1Task.tenant_id == project.tenant_id, models.PV1Task.project_id == project.id, models.PV1Task.id.in_(task_ids)))
        tasks = {task.id: task for task in task_result.scalars()}
    sections: dict[str, list[dict[str, Any]]] = {}
    source_refs: dict[str, list[str]] = {}

    def add(section: str, text: str, refs: list[str]) -> None:
        if not text or section in {"Summary", "Outcomes"} and not refs:
            return
        bucket = sections.setdefault(section, [])
        if len(bucket) >= 5:
            return
        bucket.append({"text": text, "source_ids": sorted(set(refs))})
        source_refs.setdefault(section, []).extend(refs)

    for event in events:
        delta = event.delta or {}
        if event.event_type in {"task.transition", "task.bulk"}:
            if event.event_type == "task.transition":
                task = tasks.get(event.aggregate_id)
                title = task.title if task else event.aggregate_id
                status_value = delta.get("status")
                if status_value == "Done":
                    add("Completed", f"{title} was recorded Done.", [event.aggregate_id, event.event_id])
                elif status_value == "In progress":
                    add("In progress", f"{title} moved to In progress.", [event.aggregate_id, event.event_id])
                elif status_value == "Blocked":
                    add("Risks/blockers", f"{title} was recorded Blocked.", [event.aggregate_id, event.event_id])
            else:
                operation = delta.get("operation") or "updated"
                ids = [str(item) for item in (delta.get("task_ids") or [])]
                add("Completed" if operation == "status" and delta.get("value") == "Done" else "In progress", f"A bulk task action ({operation}) changed {len(ids)} persisted task record(s).", ids + [event.event_id])
        elif event.event_type == "task.created":
            task = tasks.get(event.aggregate_id)
            title = task.title if task else event.aggregate_id
            add("Next", f"{title} was added to the canonical task graph.", [event.aggregate_id, event.event_id])
        elif event.event_type in {"task.update_fields", "schedule.apply", "dependency.create", "dependency.update", "dependency.remove"}:
            add("Schedule", f"{event.event_type} was recorded in the canonical project graph.", [event.aggregate_id, event.event_id])
        elif event.event_type in {"risk.save", "blocker.resolve", "blocker.created"}:
            add("Risks/blockers", f"{event.event_type} was recorded.", [event.aggregate_id, event.event_id])
        elif event.event_type in {"decision.request", "decision.decide"}:
            add("Decisions needed", f"{event.event_type} was recorded for the project decision record.", [event.aggregate_id, event.event_id])
        elif event.event_type.startswith("measurement.") or event.event_type.startswith("outcomes."):
            add("Outcomes", f"{event.event_type} was recorded from persisted outcome data.", [event.aggregate_id, event.event_id])

    for section in list(sections):
        sections[section] = sections[section][:5]
    end_sequence = events[-1].sequence if events else None
    start_sequence = events[0].sequence if events else None
    summary = f"{len(events)} persisted project event(s) recorded from {period_start.isoformat()} through {period_end.isoformat()}." if events else "No persisted project changes were recorded in this interval."
    sections = {"Summary": [{"text": summary, "source_ids": [event.event_id for event in events[:5]]}], **sections}
    story = await domain.project_story_projection(session, project)
    return {
        "title": f"Project update · {period_end.isoformat()}",
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "sections": sections,
        "source_refs": {key: sorted(set(value)) for key, value in source_refs.items()},
        "computed_health": story.get("health") or {"level": "Unknown", "reason": "Health is not available."},
        "history_gap": False,
        "ai_enabled": False,
        "generated_by": "pv1-deterministic-update-v1",
        "source_revisions": _source_revisions(project, event_start=start_sequence, event_end=end_sequence),
        "author_id": actor_id,
    }


def _update_dict(update: models.PV1Update) -> dict[str, Any]:
    return {
        "id": update.id,
        "project_id": update.project_id,
        "state": update.state,
        "period_start": domain._serialize(update.period_start),
        "period_end": domain._serialize(update.period_end),
        "author_id": update.author_id,
        "content": update.content,
        "source_revisions": update.source_revisions or {},
        "health_assessment": update.health_assessment,
        "health_rationale": update.health_rationale,
        "reporting_timezone": update.reporting_timezone,
        "published_at": domain._serialize(update.published_at),
        "supersedes_id": update.supersedes_id,
        "withdrawn_at": domain._serialize(update.withdrawn_at),
        "withdrawal_reason": update.withdrawal_reason,
        "revision": update.revision,
    }


def _activity_category(event_type: str) -> str:
    if event_type.startswith("task") or event_type.startswith("schedule") or event_type.startswith("dependency"):
        return "Delivery"
    if event_type.startswith("resource"):
        return "Resource"
    if event_type.startswith("update") or event_type.startswith("report"):
        return "Communication"
    if event_type.startswith("decision") or event_type.startswith("risk") or event_type.startswith("blocker"):
        return "Governance"
    return "Project"


def activity_summary(event_type: str, delta: dict[str, Any]) -> str:
    if event_type == "task.bulk":
        return f"Bulk task action: {delta.get('operation', 'updated')} ({len(delta.get('task_ids') or [])} item(s))."
    if event_type == "task.transition":
        return f"Task status changed to {delta.get('status', 'updated')}."
    if event_type == "update.published":
        return "Project update published."
    if event_type.startswith("report"):
        return "Project report snapshot captured."
    return event_type.replace(".", " ").capitalize() + "."


def report_payload(project: models.PV1Project, story: dict[str, Any], report_type: str, period_start: date, period_end: date) -> dict[str, Any]:
    if report_type == "Stakeholder summary":
        return {
            "objective": project.objective,
            "owner_id": project.owner_id,
            "phase": project.phase,
            "health": story.get("health"),
            "target_date": domain._serialize(project.target_date),
            "next_milestone": story.get("next_milestone"),
            "risks_and_decisions": story.get("governance", [])[:5],
            "outcomes": {"phase": project.outcome_phase, "result": project.outcome_result},
        }
    if report_type == "Delivery acceptance":
        return {
            "phase": project.phase,
            "delivery": story.get("delivery"),
            "acceptance_criteria": story.get("acceptance_criteria", []),
            "attention": story.get("attention", []),
            "period": {"start": period_start.isoformat(), "end": period_end.isoformat()},
        }
    return {
        "outcome_phase": project.outcome_phase,
        "outcome_result": project.outcome_result,
        "primary_metric": story.get("primary_metric"),
        "latest_update": story.get("latest_update"),
        "period": {"start": period_start.isoformat(), "end": period_end.isoformat()},
    }


def report_html(project: models.PV1Project, report_type: str, payload: dict[str, Any], snapshot_id: str, project_revision: int, created_at: datetime) -> str:
    def value(item: Any) -> str:
        return html.escape(str(item if item is not None else "Not recorded"))
    rows = "".join(f"<tr><th scope=\"row\">{value(key.replace('_', ' '))}</th><td>{value(item)}</td></tr>" for key, item in payload.items())
    return (
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>"
        f"{value(report_type)} · {value(project.name)}</title><style>@media print{{.metadata{{break-after:avoid}}}}"
        "body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;line-height:1.5}"
        "table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccd3dc;padding:.5rem;text-align:left;vertical-align:top}"
        "</style></head><body><main><p class=\"metadata\"><strong>Immutable report snapshot</strong> · "
        f"{value(snapshot_id)} · source project revision {project_revision} · {value(created_at.isoformat())}</p>"
        f"<h1>{value(report_type)}: {value(project.name)}</h1><table><tbody>{rows}</tbody></table></main></body></html>"
    )


def minimal_pdf(title: str, lines: list[str]) -> bytes:
    safe_lines = [title, *lines][:18]
    stream_lines = ["BT", "/F1 12 Tf", "50 760 Td"]
    for index, line in enumerate(safe_lines):
        if index:
            stream_lines.append("0 -18 Td")
        escaped = str(line).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")[:180]
        stream_lines.append(f"({escaped}) Tj")
    stream_lines.append("ET")
    stream = "\n".join(stream_lines).encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode() + obj + b"\nendobj\n")
    startxref = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    output.extend(b"".join(f"{offset:010d} 00000 n \n".encode() for offset in offsets[1:]))
    output.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{startxref}\n%%EOF\n".encode())
    return bytes(output)


def csv_export(rows: list[dict[str, Any]], columns: list[str]) -> str:
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({column: neutralize_csv_cell(row.get(column)) for column in columns})
    return stream.getvalue()


async def _bump_project(session: AsyncSession, *, project: models.PV1Project, actor_id: str) -> int:
    """Bump the project revision for a durable communication record."""
    next_revision = project.revision + 1
    # The command handler has already checked the expected project revision;
    # this row is transaction scoped under the same command.
    project.revision = next_revision
    project.updated_by = actor_id
    project.updated_at = domain._now()
    return next_revision


async def queue_update_notifications(session: AsyncSession, *, project: models.PV1Project, update_id: str, actor_id: str) -> int:
    member_result = await session.execute(select(models.PV1ProjectMember).where(models.PV1ProjectMember.tenant_id == project.tenant_id, models.PV1ProjectMember.project_id == project.id))
    created = 0
    for member in member_result.scalars():
        if member.user_id == actor_id:
            continue
        subscription = await session.scalar(select(models.PV1NotificationSubscription).where(
            models.PV1NotificationSubscription.tenant_id == project.tenant_id,
            models.PV1NotificationSubscription.project_id == project.id,
            models.PV1NotificationSubscription.user_id == member.user_id,
        ))
        if subscription and not subscription.enabled:
            continue
        dedupe_key = f"published-update:{update_id}"
        existing = await session.scalar(select(models.PV1Notification).where(
            models.PV1Notification.tenant_id == project.tenant_id,
            models.PV1Notification.recipient_id == member.user_id,
            models.PV1Notification.dedupe_key == dedupe_key,
        ))
        if existing:
            continue
        session.add(models.PV1Notification(
            id=domain._new_id(), tenant_id=project.tenant_id, project_id=project.id,
            recipient_id=member.user_id, kind="published_update", dedupe_key=dedupe_key,
            payload={"update_id": update_id, "project_id": project.id, "title": "A project update was published."},
            access_epoch=f"project:{project.id}:revision:{project.revision}",
        ))
        created += 1
    return created


async def queue_due_cadence_notification(session: AsyncSession, *, project: models.PV1Project, as_of: datetime | None = None) -> int:
    """Queue at most one in-app cadence reminder for a due cadence point."""
    if project.phase not in {"Executing", "Validating"} or project.update_cadence_kind == "disabled":
        return 0
    try:
        local_now = (as_of or domain._now()).astimezone(ZoneInfo(project.timezone or "UTC"))
    except Exception:
        local_now = as_of or domain._now()
    if local_now.weekday() != project.update_weekday:
        return 0
    try:
        due_time = time.fromisoformat(project.update_time or "15:00")
    except ValueError:
        due_time = time(15, 0)
    if local_now.time().replace(tzinfo=None) < due_time:
        return 0
    if project.update_cadence_kind == "biweekly" and local_now.isocalendar().week % 2:
        return 0
    period_key = f"{project.update_cadence_kind}:{local_now.date().isoformat()}"
    dedupe_key = f"cadence-reminder:{project.id}:{period_key}"
    owner = project.owner_id
    existing = await session.scalar(select(models.PV1Notification).where(models.PV1Notification.tenant_id == project.tenant_id, models.PV1Notification.project_id == project.id, models.PV1Notification.recipient_id == owner, models.PV1Notification.dedupe_key == dedupe_key))
    if existing:
        return 0
    session.add(models.PV1Notification(id=domain._new_id(), tenant_id=project.tenant_id, project_id=project.id, recipient_id=owner, kind="cadence_reminder", dedupe_key=dedupe_key, payload={"project_id": project.id, "period_key": period_key, "title": "Project update is due."}, access_epoch=f"project:{project.id}:revision:{project.revision}"))
    return 1


def _update_content_for_save(content: Any) -> dict[str, Any]:
    if not isinstance(content, dict):
        raise _error("VALIDATION_FAILED", "Update content must be an object.")
    result = dict(content)
    for key in ("title", "summary", "body", "commentary"):
        if key in result:
            result[key] = sanitize_markdown(result[key])
    for section, items in list(result.get("sections", {}).items() if isinstance(result.get("sections"), dict) else []):
        if not isinstance(items, list) or len(items) > 8:
            raise _error("VALIDATION_FAILED", "Update sections must contain bounded lists.")
        result["sections"][section] = [
            {**item, "text": sanitize_markdown(item.get("text", ""))}
            for item in items if isinstance(item, dict)
        ]
    return result


async def execute_communication_command(
    session: AsyncSession,
    *,
    project: models.PV1Project,
    actor_id: str,
    role: str,
    command_id: str,
    command_type: str,
    expected: dict[str, Any],
    payload: dict[str, Any],
) -> tuple[dict[str, Any], str | None]:
    """Execute one allowlisted communication/resource command."""
    event_id: str | None = None
    project_revision = project.revision
    if command_type == "update.draft":
        period_start = domain._date(payload.get("period_start")) or domain._now().date()
        period_end = domain._date(payload.get("period_end")) or period_start
        content = await deterministic_update_draft(session, project=project, actor_id=actor_id, period_start=period_start, period_end=period_end)
        draft_id = str(payload.get("draft_id") or "")
        draft = await session.get(models.PV1Update, draft_id) if draft_id else None
        if draft and (draft.tenant_id != project.tenant_id or draft.project_id != project.id or draft.state != "Draft" or draft.author_id != actor_id):
            raise _error("FORBIDDEN", "Only the draft owner may regenerate this draft.", http_status=status.HTTP_403_FORBIDDEN)
        if draft:
            draft.content = content; draft.source_revisions = content["source_revisions"]; draft.period_start = period_start; draft.period_end = period_end; draft.revision += 1; draft.updated_by = actor_id; draft.updated_at = domain._now()
        else:
            draft_id = domain._new_id()
            draft = models.PV1Update(id=draft_id, tenant_id=project.tenant_id, project_id=project.id, state="Draft", period_start=period_start, period_end=period_end, author_id=actor_id, content=content, source_revisions=content["source_revisions"], reporting_timezone=project.timezone, created_by=actor_id, updated_by=actor_id)
            session.add(draft)
        await session.flush()
        project_revision = await _bump_project(session, project=project, actor_id=actor_id)
        event_id, _ = await domain.append_event(session, tenant_id=project.tenant_id, project_id=project.id, actor_id=actor_id, command_id=command_id, event_type="update.drafted", aggregate_type="update", aggregate_id=draft_id, aggregate_revision=draft.revision, delta={"update_id": draft_id, "period_start": period_start.isoformat(), "period_end": period_end.isoformat()})
        return domain._success(command_id, revisions={"project_revision": project_revision, "graph_revision": project.graph_revision, "update_revision": draft.revision}, changed_entities=[{"kind": "update", "id": draft_id}], event_id=event_id), event_id

    if command_type == "update.autosave":
        update_id = str(payload.get("draft_id") or "")
        draft = await session.get(models.PV1Update, update_id)
        if not draft or draft.tenant_id != project.tenant_id or draft.project_id != project.id or draft.state != "Draft":
            raise _error("NOT_FOUND", "Draft update not found.", http_status=status.HTTP_404_NOT_FOUND)
        if draft.author_id != actor_id:
            raise _error("FORBIDDEN", "Only the draft author may autosave this update.", http_status=status.HTTP_403_FORBIDDEN)
        draft.content = _update_content_for_save(payload.get("content") or {})
        draft.health_assessment = payload.get("health_assessment") or draft.health_assessment
        draft.health_rationale = sanitize_markdown(payload.get("health_rationale") or draft.health_rationale or "") or None
        if draft.health_assessment and draft.health_assessment not in HEALTH_ASSESSMENTS:
            raise _error("VALIDATION_FAILED", "Health assessment is invalid.")
        draft.revision += 1; draft.updated_by = actor_id; draft.updated_at = domain._now()
        project_revision = await _bump_project(session, project=project, actor_id=actor_id)
        return domain._success(command_id, revisions={"project_revision": project_revision, "graph_revision": project.graph_revision, "update_revision": draft.revision}, changed_entities=[{"kind": "update", "id": update_id}], event_id=None), None

    if command_type in {"update.publish", "update.correct"}:
        if role not in {"Owner", "Lead", "Tenant administrator"}:
            raise _error("FORBIDDEN", "Owner or Lead capability is required to publish an update.", http_status=status.HTTP_403_FORBIDDEN)
        update_id = str(payload.get("update_id") or "")
        update_record = await session.get(models.PV1Update, update_id)
        if command_type == "update.correct":
            new_draft_id = str(payload.get("new_draft_id") or "")
            original = update_record
            update_record = await session.get(models.PV1Update, new_draft_id)
            if not original or original.state != "Published" or not update_record:
                raise _error("VALIDATION_FAILED", "Correction requires a published update and a new draft.")
            update_record.supersedes_id = original.id
            update_id = new_draft_id
        if not update_record or update_record.tenant_id != project.tenant_id or update_record.project_id != project.id:
            raise _error("NOT_FOUND", "Update not found.", http_status=status.HTTP_404_NOT_FOUND)
        if update_record.state != "Draft":
            raise _error("IMMUTABLE_RECORD", "Published updates cannot be edited; create a correction.", http_status=status.HTTP_409_CONFLICT)
        assessment = payload.get("health_assessment") or update_record.health_assessment
        if assessment and assessment not in HEALTH_ASSESSMENTS:
            raise _error("VALIDATION_FAILED", "Health assessment is invalid.")
        computed = (update_record.content or {}).get("computed_health", {}).get("level")
        rationale = sanitize_markdown(payload.get("health_rationale") or update_record.health_rationale or "")
        if assessment and computed and assessment != computed and not rationale:
            raise _error("VALIDATION_FAILED", "A rationale is required when author and computed health differ.", details={"field": "health_rationale"})
        update_record.health_assessment = assessment
        update_record.health_rationale = rationale or None
        update_record.state = "Published"
        update_record.published_at = domain._now()
        update_record.updated_by = actor_id; update_record.updated_at = domain._now()
        event_id, _ = await domain.append_event(session, tenant_id=project.tenant_id, project_id=project.id, actor_id=actor_id, command_id=command_id, event_type="update.published", aggregate_type="update", aggregate_id=update_id, aggregate_revision=update_record.revision, delta={"update_id": update_id, "health_assessment": assessment})
        await queue_update_notifications(session, project=project, update_id=update_id, actor_id=actor_id)
        return domain._success(command_id, revisions={"project_revision": project.revision, "graph_revision": project.graph_revision, "update_revision": update_record.revision}, changed_entities=[{"kind": "update", "id": update_id}], event_id=event_id), event_id

    if command_type == "update.withdraw":
        if role not in {"Owner", "Lead", "Tenant administrator"}:
            raise _error("FORBIDDEN", "Owner or Lead capability is required to withdraw an update.", http_status=status.HTTP_403_FORBIDDEN)
        update_id = str(payload.get("update_id") or "")
        update_record = await session.get(models.PV1Update, update_id)
        reason = sanitize_markdown(payload.get("reason") or "")
        if not update_record or update_record.project_id != project.id or update_record.state != "Published" or not reason:
            raise _error("VALIDATION_FAILED", "A published update and a withdrawal reason are required.")
        update_record.state = "Withdrawn"; update_record.withdrawn_at = domain._now(); update_record.withdrawal_reason = reason; update_record.updated_by = actor_id; update_record.updated_at = domain._now()
        event_id, _ = await domain.append_event(session, tenant_id=project.tenant_id, project_id=project.id, actor_id=actor_id, command_id=command_id, event_type="update.withdrawn", aggregate_type="update", aggregate_id=update_id, aggregate_revision=update_record.revision, delta={"update_id": update_id})
        return domain._success(command_id, revisions={"project_revision": project.revision, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "update", "id": update_id}], event_id=event_id), event_id

    if command_type == "update.cadence.set":
        if role not in {"Owner", "Lead", "Tenant administrator"}:
            raise _error("FORBIDDEN", "Owner or Lead capability is required to change cadence.", http_status=status.HTTP_403_FORBIDDEN)
        cadence_kind = str(payload.get("cadence_kind") or "weekly").casefold()
        if cadence_kind not in {"weekly", "biweekly", "disabled"}:
            raise _error("VALIDATION_FAILED", "Cadence must be weekly, biweekly, or disabled.")
        weekday = int(payload.get("weekday", project.update_weekday))
        update_time = str(payload.get("time") or project.update_time)
        if weekday not in range(7) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", update_time):
            raise _error("VALIDATION_FAILED", "Cadence weekday or time is invalid.")
        disabled_reason = sanitize_markdown(payload.get("disabled_reason") or "")
        if cadence_kind == "disabled" and not disabled_reason:
            raise _error("VALIDATION_FAILED", "Disabling cadence requires a rationale.")
        project.update_cadence_kind = cadence_kind; project.update_cadence = 14 if cadence_kind == "biweekly" else 7; project.update_weekday = weekday; project.update_time = update_time; project.update_disabled_reason = disabled_reason or None
        project_revision = await _bump_project(session, project=project, actor_id=actor_id)
        event_id, _ = await domain.append_event(session, tenant_id=project.tenant_id, project_id=project.id, actor_id=actor_id, command_id=command_id, event_type="update.cadence.set", aggregate_type="project", aggregate_id=project.id, aggregate_revision=project_revision, delta={"cadence_kind": cadence_kind, "weekday": weekday, "time": update_time})
        return domain._success(command_id, revisions={"project_revision": project_revision, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "project", "id": project.id}], event_id=event_id), event_id

    if command_type == "resource.scan":
        resource_id = str(payload.get("resource_id") or "")
        resource = await session.get(models.PV1Resource, resource_id)
        verdict = str(payload.get("verdict") or "").casefold()
        if not resource or resource.tenant_id != project.tenant_id or resource.project_id != project.id:
            raise _error("NOT_FOUND", "Resource not found.", http_status=status.HTTP_404_NOT_FOUND)
        if resource.scan_state != "Pending" or verdict not in {"clean", "unsafe"}:
            raise _error("VALIDATION_FAILED", "A pending resource requires a clean or unsafe scan verdict.")
        resource.scan_state = "Available" if verdict == "clean" else "Rejected"; resource.revision += 1; resource.updated_by = actor_id; resource.updated_at = domain._now()
        event_id, _ = await domain.append_event(session, tenant_id=project.tenant_id, project_id=project.id, actor_id=actor_id, command_id=command_id, event_type="resource.scanned", aggregate_type="resource", aggregate_id=resource.id, aggregate_revision=resource.revision, delta={"resource_id": resource.id, "scan_state": resource.scan_state})
        return domain._success(command_id, revisions={"project_revision": project.revision, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "resource", "id": resource.id}], event_id=event_id), event_id

    if command_type == "notification.subscription.save":
        user_id = str(payload.get("user_id") or actor_id)
        if user_id != actor_id and role not in {"Owner", "Lead", "Tenant administrator"}:
            raise _error("FORBIDDEN", "Only the user or project lead may change notification preferences.", http_status=status.HTTP_403_FORBIDDEN)
        subscription = await session.scalar(select(models.PV1NotificationSubscription).where(models.PV1NotificationSubscription.tenant_id == project.tenant_id, models.PV1NotificationSubscription.project_id == project.id, models.PV1NotificationSubscription.user_id == user_id))
        if subscription:
            subscription.enabled = bool(payload.get("enabled", subscription.enabled)); subscription.digest_enabled = bool(payload.get("digest_enabled", subscription.digest_enabled)); subscription.preferences = payload.get("preferences") or subscription.preferences; subscription.revision += 1; subscription.updated_by = actor_id; subscription.updated_at = domain._now()
            subscription_id = subscription.id
        else:
            subscription_id = domain._new_id(); session.add(models.PV1NotificationSubscription(id=subscription_id, tenant_id=project.tenant_id, project_id=project.id, user_id=user_id, enabled=bool(payload.get("enabled", True)), digest_enabled=bool(payload.get("digest_enabled", True)), preferences=payload.get("preferences") or {}, created_by=actor_id, updated_by=actor_id))
        return domain._success(command_id, revisions={"project_revision": project.revision, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "notification_subscription", "id": subscription_id}], event_id=None), None

    if command_type == "report.capture":
        report_type = str(payload.get("report_type") or "")
        period_start = domain._date(payload.get("period_start")) or domain._now().date()
        period_end = domain._date(payload.get("period_end")) or period_start
        if report_type not in REPORT_TYPES or period_end < period_start:
            raise _error("VALIDATION_FAILED", "Report type and period are invalid.")
        story = await domain.project_story_projection(session, project)
        report_id = domain._new_id()
        report = models.PV1ReportSnapshot(id=report_id, tenant_id=project.tenant_id, project_id=project.id, report_type=report_type, period_start=period_start, period_end=period_end, project_revision=project.revision, source_revisions=_source_revisions(project), payload=report_payload(project, story, report_type, period_start, period_end), html="", confidentiality=project.visibility, author_id=actor_id)
        report.html = report_html(project, report_type, report.payload, report_id, project.revision, domain._now())
        session.add(report)
        event_id, _ = await domain.append_event(session, tenant_id=project.tenant_id, project_id=project.id, actor_id=actor_id, command_id=command_id, event_type="report.captured", aggregate_type="report", aggregate_id=report_id, aggregate_revision=1, delta={"report_type": report_type, "report_id": report_id})
        return domain._success(command_id, revisions={"project_revision": project.revision, "graph_revision": project.graph_revision}, changed_entities=[{"kind": "report", "id": report_id}], event_id=event_id), event_id

    raise _error("VALIDATION_FAILED", f"Unsupported communication command: {command_type}.")
