"""Pure PV1 outcome evaluation and exact-decimal value calculations.

The functions in this module do not mutate ORM records. They are shared by
API projections and command validation so task progress cannot become an
implicit outcome signal.
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Iterable


ZERO = Decimal("0")
HUNDRED = Decimal("100")


def decimal_value(value: Any, *, field: str = "value") -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be an exact decimal value") from exc


def decimal_text(value: Decimal | None) -> str | None:
    if value is None:
        return None
    normalized = value.normalize()
    return format(normalized, "f")


def metric_definition(metric: Any) -> dict[str, Any]:
    return {
        "id": metric.id,
        "name": metric.name,
        "kind": metric.kind,
        "description": metric.description,
        "unit": metric.unit,
        "direction": metric.direction,
        "baseline": decimal_text(decimal_value(metric.baseline)) if metric.baseline is not None else None,
        "target_spec": metric.target_spec,
        "target_date": metric.target_date.isoformat() if metric.target_date else None,
        "steward_id": metric.steward_id,
        "measurement_method": metric.measurement_method,
        "population_definition": metric.population_definition,
        "population_version": getattr(metric, "population_version", None),
        "cadence_days": metric.cadence_days,
        "required_for_success": metric.required_for_success,
        "required_consecutive_periods": metric.required_consecutive_periods,
        "definition_revision": metric.definition_revision,
    }


def _target_spec(metric: Any) -> dict[str, Any]:
    value = metric.target_spec
    return value if isinstance(value, dict) else {}


def measurement_value(metric: Any, measurement: Any) -> tuple[Decimal | bool | None, str]:
    """Return the comparable value and its honest display state."""
    denominator = measurement.denominator
    numerator = measurement.numerator
    imported = getattr(measurement, "imported_percentage", None)
    if metric.kind == "Adoption":
        if numerator is not None or denominator is not None:
            if numerator is None or denominator is None:
                return None, "Invalid population counts"
            if denominator == 0:
                return None, "Not applicable to this period"
            return decimal_value(numerator) * HUNDRED / decimal_value(denominator), "Count-based"
        if imported is not None:
            return decimal_value(imported), "Reported percentage — denominator unavailable"
    if measurement.observed_binary is not None:
        return bool(measurement.observed_binary), "Observed"
    if measurement.observed_numeric is not None:
        return decimal_value(measurement.observed_numeric), "Observed"
    return None, "No observation"


def meets_target(metric: Any, value: Decimal | bool | None) -> bool:
    if value is None:
        return False
    spec = _target_spec(metric)
    if isinstance(value, bool):
        expected = spec.get("value", spec.get("expected"))
        return expected is None or value == bool(expected)
    try:
        actual = decimal_value(value)
    except ValueError:
        return False
    operator = spec.get("operator")
    if operator in {">", ">=", "<", "<=", "="}:
        target = decimal_value(spec.get("value"), field="target_spec.value")
        return {">": actual > target, ">=": actual >= target, "<": actual < target, "<=": actual <= target, "=": actual == target}[operator]
    minimum = spec.get("min", spec.get("minimum"))
    maximum = spec.get("max", spec.get("maximum"))
    if minimum is not None and actual < decimal_value(minimum, field="target_spec.min"):
        return False
    if maximum is not None and actual > decimal_value(maximum, field="target_spec.max"):
        return False
    if minimum is not None or maximum is not None:
        return True
    return False


def _active_measurements(measurements: Iterable[Any]) -> list[Any]:
    rows = list(measurements)
    superseded = {row.supersedes_id for row in rows if row.supersedes_id}
    active = [row for row in rows if row.id not in superseded]
    active.sort(key=lambda row: (row.period_end, row.period_start, row.recorded_at or date.min, row.id), reverse=True)
    return active


def evaluate_metric(metric: Any, measurements: Iterable[Any], *, as_of: date | None = None) -> dict[str, Any]:
    """Evaluate current-definition qualification without changing history."""
    today = as_of or date.today()
    current = [row for row in _active_measurements(measurements) if row.definition_revision == metric.definition_revision]
    # The domain command supplies PV1's two-period default for new Adoption
    # definitions. An explicit stored value remains authoritative so legacy
    # and test definitions that intentionally require one period retain their
    # declared semantics.
    required = metric.required_consecutive_periods or (2 if metric.kind == "Adoption" else 1)
    if not current:
        return {"status": "No data", "qualified": False, "required_periods": required, "periods": [], "reason": "No observation has been recorded for the current definition."}
    latest = current[0]
    latest_value, latest_state = measurement_value(metric, latest)
    freshness_deadline = latest.period_end + timedelta(days=max(1, metric.cadence_days or 14))
    if latest_state == "Not applicable to this period":
        return {"status": "Not applicable", "qualified": False, "required_periods": required, "periods": [latest.id], "latest_value": None, "reason": latest_state, "freshness_deadline": freshness_deadline.isoformat()}
    if today > freshness_deadline:
        return {"status": "Stale", "qualified": False, "required_periods": required, "periods": [latest.id], "latest_value": decimal_text(latest_value) if isinstance(latest_value, Decimal) else latest_value, "reason": "The latest period is beyond its freshness deadline.", "freshness_deadline": freshness_deadline.isoformat()}
    selected: list[Any] = []
    previous_end: date | None = None
    reason = "The required verified consecutive periods are not complete."
    for row in current:
        if previous_end is not None and row.period_end != previous_end:
            break
        value, state = measurement_value(metric, row)
        if state == "Not applicable to this period":
            reason = state
            break
        if state == "Reported percentage — denominator unavailable":
            reason = "A reported percentage without an eligible population cannot qualify adoption."
            break
        if row.quality != "Verified" or not row.evidence or row.reviewer_id is None:
            reason = "Every qualifying period must be Verified with evidence and a reviewer."
            break
        if not meets_target(metric, value):
            reason = "A qualifying period does not meet the current target."
            break
        selected.append(row)
        previous_end = row.period_start
        if len(selected) == required:
            break
    qualified = len(selected) == required
    return {
        "status": "Qualified" if qualified else "Unqualified",
        "qualified": qualified,
        "required_periods": required,
        "periods": [row.id for row in selected],
        "latest_value": decimal_text(latest_value) if isinstance(latest_value, Decimal) else latest_value,
        "latest_state": latest_state,
        "reason": "Current definition has the required verified consecutive periods." if qualified else reason,
        "freshness_deadline": freshness_deadline.isoformat(),
    }


def _attribution_fraction(row: Any) -> Decimal | None:
    """Return an explicit attribution fraction without truthiness coercion.

    PV1 requires attribution to be an evidence-bearing field.  A missing
    fraction is therefore not an implicit full allocation: legacy/incomplete
    rows remain visible to the caller but contribute no financial value until
    they are reconciled.  In particular, Decimal('0') is a valid allocation.
    """
    value = getattr(row, "fraction", None)
    if value is None:
        return None
    fraction = decimal_value(value, field="fraction")
    if fraction < ZERO or fraction > Decimal("1"):
        raise ValueError("fraction must be between 0 and 1")
    return fraction


def _weighted(row: Any) -> Decimal:
    fraction = _attribution_fraction(row)
    if fraction is None:
        return ZERO
    return decimal_value(row.amount) * fraction


def _deduplicate_rollup_rows(rows: list[Any]) -> tuple[list[Any], int]:
    """Exclude a superseded direct parent when a child rollup is explicit.

    A parent_value_id is the durable relationship between a direct economic
    entry and its child/rollup representation.  The child remains the
    contribution; the referenced parent row is not counted a second time.
    Unrelated entries with the same attribution key are intentionally retained
    because they may be sibling allocations whose fractions sum to one.
    """
    parent_ids = {str(row.parent_value_id) for row in rows if getattr(row, "parent_value_id", None)}
    kept = [row for row in rows if str(getattr(row, "id", "")) not in parent_ids]
    return kept, len(rows) - len(kept)


def calculate_value_summary(values: Iterable[Any]) -> dict[str, Any]:
    rows, excluded_rollup_count = _deduplicate_rollup_rows(list(values))
    measured = [row for row in rows if getattr(row, "kind", "Measured") == "Measured" and row.quality == "Verified"]
    cash_benefits = [row for row in measured if row.classification in {"Cash saving", "Revenue"}]
    costs = [row for row in measured if row.classification == "Cost"]
    capacity = [row for row in measured if row.classification == "Capacity value"]
    avoidance = [row for row in measured if row.classification == "Cost avoidance"]
    currencies = sorted({row.currency_or_unit for row in [*cash_benefits, *costs]})
    groups: list[dict[str, Any]] = []
    for currency in currencies:
        benefits = [row for row in cash_benefits if row.currency_or_unit == currency]
        currency_costs = [row for row in costs if row.currency_or_unit == currency]
        benefit_periods = {(row.period_start, row.period_end) for row in benefits}
        cost_periods = {(row.period_start, row.period_end) for row in currency_costs}
        common_periods = benefit_periods & cost_periods
        periods = sorted(benefit_periods | cost_periods)
        # Benefits remain visible even when costs are incomplete; only the
        # ROI calculation requires a matching verified cost period. Hiding a
        # measured benefit merely because ROI is unavailable loses evidence.
        matched_benefits = [row for row in benefits if (row.period_start, row.period_end) in common_periods]
        matched_costs = [row for row in currency_costs if (row.period_start, row.period_end) in common_periods]
        gross = sum((_weighted(row) for row in benefits), ZERO)
        cost = sum((_weighted(row) for row in matched_costs), ZERO)
        if not currency_costs or not common_periods:
            roi = None
            roi_state = "ROI unavailable"
            roi_reason = "No complete verified benefit and cost totals share the same currency and period."
        else:
            roi = (gross - cost) * HUNDRED / cost if cost != ZERO else None
            roi_state = "Measured" if roi is not None else "ROI unavailable"
            roi_reason = None if roi is not None else "Verified cost total is zero; ROI is unavailable."
        cumulative_benefit = ZERO
        cumulative_cost = ZERO
        payback = None
        for period_start, period_end in periods:
            cumulative_benefit += sum((_weighted(row) for row in matched_benefits if row.period_start == period_start and row.period_end == period_end), ZERO)
            cumulative_cost += sum((_weighted(row) for row in matched_costs if row.period_start == period_start and row.period_end == period_end), ZERO)
            if payback is None and cumulative_benefit >= cumulative_cost and cumulative_cost > ZERO:
                payback = period_end.isoformat()
        groups.append({
            "currency": currency,
            "periods": [{"start": start.isoformat(), "end": end.isoformat()} for start, end in periods],
            "gross_cash_benefit": decimal_text(gross),
            "cost": decimal_text(cost),
            "net_cash_value": decimal_text(gross - cost),
            "roi_percent": decimal_text(roi),
            "roi_state": roi_state,
            "roi_reason": roi_reason,
            "payback": payback or "Not yet recovered",
            "contributing_entry_count": len([*benefits, *matched_costs]),
        })
    capacity_units = sum((_weighted(row) for row in capacity), ZERO)
    capacity_value = sum((_weighted(row) * decimal_value(row.valuation_rate) for row in capacity if row.valuation_rate is not None), ZERO)
    avoidance_value = sum((_weighted(row) for row in avoidance), ZERO)
    return {
        "groups": groups,
        "capacity": {"units": decimal_text(capacity_units), "valued_amount": decimal_text(capacity_value), "unit": capacity[0].currency_or_unit if capacity else None},
        "cost_avoidance": {"amount": decimal_text(avoidance_value), "unit": avoidance[0].currency_or_unit if avoidance else None},
        "estimated": {"amount": decimal_text(sum((_weighted(row) for row in rows if getattr(row, "kind", "Measured") == "Estimated"), ZERO))},
        "forecast": {"amount": decimal_text(sum((_weighted(row) for row in rows if getattr(row, "kind", "Measured") == "Forecast"), ZERO))},
        "excluded_unverified_count": len([row for row in rows if row.quality != "Verified"]),
        "excluded_unattributed_count": len([row for row in rows if _attribution_fraction(row) is None]),
        "excluded_rollup_parent_count": excluded_rollup_count,
    }
