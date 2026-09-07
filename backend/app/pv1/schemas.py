from datetime import date
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class PV1Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CommandEnvelope(PV1Model):
    command_id: UUID
    type: str = Field(min_length=1, max_length=80)
    expected: dict[str, Any] = Field(default_factory=dict)
    payload: dict[str, Any] = Field(default_factory=dict)


class SchedulePreviewRequest(PV1Model):
    operation: Literal["move", "resize", "set_dates", "group_move", "recalculate_earliest", "change_calendar"]
    selection_ids: list[str] = Field(default_factory=list, max_length=1000)
    parameters: dict[str, Any] = Field(default_factory=dict)
    graph_revision: int = Field(ge=1)
    calendar_revision: int = Field(ge=1)

    @field_validator("selection_ids")
    @classmethod
    def unique_selection(cls, value: list[str]) -> list[str]:
        normalized = [item.strip() for item in value]
        if any(not item for item in normalized) or len(normalized) != len(set(normalized)):
            raise ValueError("selection_ids must contain unique non-empty task IDs")
        return normalized


class ProjectCreate(PV1Model):
    name: str = Field(min_length=1, max_length=120)
    objective: str | None = Field(default=None, max_length=500)
    problem: str | None = None
    in_scope: str | None = None
    out_of_scope: str | None = None
    team_id: int | None = None
    owner_id: str | None = Field(default=None, max_length=200)
    template_key: str | None = Field(default=None, max_length=120)
    template_version: str | None = Field(default=None, max_length=40)
    phase: Literal["Draft", "Proposed", "Planning"] = "Draft"
    priority: Literal["Low", "Medium", "High", "Critical"] = "Medium"
    start_date: date | None = None
    target_date: date | None = None
    no_deadline_reason: str | None = Field(default=None, max_length=500)
    timezone: str = Field(default="UTC", min_length=1, max_length=64)
    calendar_id: str | None = Field(default=None, max_length=120)
    calendar_revision: int | None = Field(default=None, ge=1)
    visibility: Literal["Team", "Restricted"] = "Team"

    @field_validator("name", "timezone", mode="before")
    @classmethod
    def trim_required_text(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
        return value

    @model_validator(mode="after")
    def validate_deadline(self):
        template_keys = {"automation", "product-feature", "infrastructure-platform", "reliability", "engineering-improvement", "experiment", "process-improvement"}
        if self.template_key is None and self.template_version is not None:
            raise ValueError("template_version requires template_key")
        if self.template_key is not None and (self.template_key not in template_keys or self.template_version != "1.0.0"):
            raise ValueError("template_key and template_version must identify a supported versioned template")
        if self.target_date is None and not self.no_deadline_reason and self.phase in {"Planning"}:
            raise ValueError("no_deadline_reason is required when Planning has no target_date")
        if self.start_date and self.target_date and self.target_date < self.start_date:
            raise ValueError("target_date must be on or after start_date")
        return self


class ProjectPatch(PV1Model):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    objective: str | None = Field(default=None, max_length=500)
    problem: str | None = None
    in_scope: str | None = None
    out_of_scope: str | None = None
    priority: Literal["Low", "Medium", "High", "Critical"] | None = None
    start_date: date | None = None
    target_date: date | None = None
    no_deadline_reason: str | None = Field(default=None, max_length=500)
    timezone: str | None = Field(default=None, min_length=1, max_length=64)


class MetricCreate(PV1Model):
    name: str = Field(min_length=1, max_length=120)
    kind: Literal["Adoption", "Value", "Quality", "Reliability", "Decision", "Custom"]
    description: str | None = None
    unit: str = Field(min_length=1, max_length=64)
    direction: Literal["Increase", "Decrease", "Within range", "Binary"]
    baseline: Decimal | None = None
    target_spec: dict[str, Any] | None = None
    target_date: date | None = None
    steward_id: str | None = Field(default=None, max_length=200)
    measurement_method: str = Field(min_length=1)
    population_definition: str | None = None
    cadence_days: int = Field(default=14, ge=1)
    required_for_success: bool = False
    required_consecutive_periods: int = Field(default=1, ge=1)


class MeasurementCreate(PV1Model):
    metric_id: str = Field(min_length=1, max_length=80)
    definition_revision: int = Field(ge=1)
    period_start: date
    period_end: date
    observed_numeric: Decimal | None = None
    observed_binary: bool | None = None
    numerator: int | None = Field(default=None, ge=0)
    denominator: int | None = Field(default=None, ge=0)
    unit: str = Field(min_length=1, max_length=64)
    source: str = Field(min_length=1)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    observed_at: str | None = None
    quality: Literal["Verified", "Estimated", "Unverified"] = "Unverified"

    @model_validator(mode="after")
    def validate_period_and_population(self):
        if self.period_end <= self.period_start:
            raise ValueError("period_end must be after period_start")
        if self.numerator is not None and self.denominator is not None and self.numerator > self.denominator:
            raise ValueError("numerator cannot exceed denominator")
        if self.observed_numeric is None and self.observed_binary is None and self.numerator is None:
            raise ValueError("a measurement value or numerator/denominator is required")
        return self


class ValueEntryCreate(PV1Model):
    classification: Literal["Cash saving", "Capacity value", "Revenue", "Cost avoidance", "Cost"]
    amount: Decimal
    currency_or_unit: str = Field(min_length=1, max_length=64)
    period_start: date
    period_end: date
    attribution_key: str = Field(min_length=1, max_length=160)
    fraction: Decimal = Field(default=Decimal("1"), ge=Decimal("0"), le=Decimal("1"))
    source: str = Field(min_length=1)
    quality: Literal["Verified", "Estimated", "Unverified"] = "Unverified"
    evidence: list[dict[str, Any]] = Field(default_factory=list)


class ProjectView(PV1Model):
    id: str
    display_key: str
    tenant_id: int
    name: str
    objective: str | None
    problem: str | None
    phase: str
    run_state: str
    outcome_phase: str
    outcome_result: str
    priority: str
    owner_id: str
    visibility: str
    revision: int
    graph_revision: int
    legacy_project_id: int | None = None


class TaskView(PV1Model):
    id: str
    project_id: str
    title: str
    kind: str
    status: str
    priority: str
    progress: int
    owner_id: str | None
    parent_task_id: str | None
    revision: int
