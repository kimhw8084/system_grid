"""Deterministic PV1 Focus projection shared by My day and Project Work."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any, Iterable


BUCKET_LABELS = {
    1: "Overdue blocker or decision",
    2: "Overdue mandatory critical work",
    3: "Due today",
    4: "Active critical-path work",
    5: "In progress or review",
    6: "Due within three working days",
    7: "Overdue follow-up",
    8: "Other assigned work",
}
PRIORITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
WORK_STATUSES = {"To Do", "In progress", "Blocked", "Review", "Done", "Cancelled"}


def _as_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _as_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.min


def _working_days_after(start: date, count: int) -> date:
    current = start
    remaining = count
    while remaining:
        current += timedelta(days=1)
        if current.weekday() < 5:
            remaining -= 1
    return current


def _due_context(due: date | None, today: date) -> str:
    if due is None:
        return "No due date"
    if due < today:
        return f"Overdue · {due.isoformat()}"
    if due == today:
        return "Due today"
    return f"Due · {due.isoformat()}"


@dataclass
class FocusCandidate:
    id: str
    entity_kind: str
    entity_id: str
    project_id: str
    project_name: str
    title: str
    due_date: date | None
    priority: str
    bucket: int
    reason_tags: list[str] = field(default_factory=list)
    primary_action: str = "Open work"
    pinned: bool = False
    snoozed_until: date | None = None
    actionable_at: datetime = datetime.min

    @property
    def rank_key(self) -> tuple[Any, ...]:
        return (
            self.bucket,
            self.due_date is None,
            self.due_date or date.max,
            PRIORITY_ORDER.get(self.priority, 2),
            self.actionable_at,
            self.entity_id,
        )

    def as_dict(self, today: date) -> dict[str, Any]:
        label = BUCKET_LABELS[self.bucket]
        reasons = list(dict.fromkeys(self.reason_tags))
        return {
            "id": self.id,
            "entity_kind": self.entity_kind,
            "entity_id": self.entity_id,
            "project_id": self.project_id,
            "project_name": self.project_name,
            "title": self.title,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "due_context": _due_context(self.due_date, today),
            "priority": self.priority,
            "bucket": self.bucket,
            "bucket_label": label,
            "reason_tags": reasons,
            "reason": reasons[0] if reasons else label,
            "why_here": f"{label}: " + "; ".join(reasons or [label]),
            "primary_action": self.primary_action,
            "pinned": self.pinned,
            "pin_label": "Pinned by you" if self.pinned else None,
            "snoozed_until": self.snoozed_until.isoformat() if self.snoozed_until else None,
        }


def _is_active_project(project: Any) -> bool:
    return (
        getattr(project, "archived_at", None) is None
        and getattr(project, "run_state", "Active") not in {"Paused", "Cancelled"}
        and getattr(project, "phase", "Draft") != "Delivered"
    )


def _task_is_critical_path(task_id: str, dependencies: Iterable[Any], tasks_by_id: dict[str, Any]) -> bool:
    for dependency in dependencies:
        if not getattr(dependency, "active", True):
            continue
        if str(getattr(dependency, "successor_id", "")) != task_id:
            continue
        predecessor = tasks_by_id.get(str(getattr(dependency, "predecessor_id", "")))
        if predecessor and getattr(predecessor, "status", None) not in {"Done", "Cancelled"}:
            return True
    return False


def build_focus(
    *,
    actor_id: str,
    projects: Iterable[Any],
    tasks: Iterable[Any],
    dependencies: Iterable[Any] = (),
    blockers: Iterable[Any] = (),
    governance: Iterable[Any] = (),
    metrics: Iterable[Any] = (),
    pins: Iterable[Any] = (),
    snoozes: Iterable[Any] = (),
    today: date | None = None,
    project_id: str | None = None,
) -> dict[str, Any]:
    today = today or date.today()
    project_map = {str(getattr(project, "id")): project for project in projects if _is_active_project(project)}
    if project_id is not None:
        project_map = {key: value for key, value in project_map.items() if key == str(project_id)}
    task_list = [task for task in tasks if str(getattr(task, "project_id", "")) in project_map]
    task_map = {str(getattr(task, "id")): task for task in task_list}
    deps = [dependency for dependency in dependencies if str(getattr(dependency, "project_id", "")) in project_map]
    blocker_list = [blocker for blocker in blockers if getattr(blocker, "state", "Open") == "Open"]
    pin_keys = {
        (str(getattr(pin, "entity_kind", "")), str(getattr(pin, "entity_id", "")))
        for pin in pins
    }
    snooze_map = {
        (str(getattr(item, "entity_kind", "")), str(getattr(item, "entity_id", ""))): _as_date(getattr(item, "until_date", None))
        for item in snoozes
    }
    candidates: list[FocusCandidate] = []

    def add(candidate: FocusCandidate) -> None:
        key = (candidate.entity_kind, candidate.entity_id)
        candidate.pinned = key in pin_keys
        candidate.snoozed_until = snooze_map.get(key)
        if candidate.snoozed_until and candidate.snoozed_until > today and candidate.bucket > 1:
            return
        candidates.append(candidate)

    for task in task_list:
        task_id = str(task.id)
        if task.kind in {"Summary", "Milestone"} or task.status in {"Done", "Cancelled"} or task.owner_id != actor_id:
            continue
        due = _as_date(task.end_date or task.point_date)
        critical_path = _task_is_critical_path(task_id, deps, task_map)
        task_blockers = [item for item in blocker_list if str(item.task_id) == task_id]
        predecessor_blocked = critical_path and task.status not in {"Done", "Cancelled"}
        reasons: list[str] = []
        if task_blockers:
            reasons.append("Open blocker owned by you" if any(item.resolver_id == actor_id for item in task_blockers) else "Open blocker")
        if predecessor_blocked:
            reasons.append("Unblock/waiting: predecessor is incomplete")
        if due and due < today and task.mandatory and task.priority == "Critical":
            bucket = 2
            reasons.append("Overdue mandatory critical task")
        elif due == today:
            bucket = 3
            reasons.append("Due today")
        elif critical_path:
            bucket = 4
            reasons.append("Active critical-path task")
        elif task.status in {"In progress", "Review"}:
            bucket = 5
            reasons.append(f"{task.status} work")
        elif due and today < due <= _working_days_after(today, 3):
            bucket = 6
            reasons.append("Due within three project working days")
        else:
            bucket = 8
            reasons.append("Assigned work")
        if predecessor_blocked:
            action = "Unblock/waiting"
        elif task.status == "Blocked":
            action = "Resolve blocker"
        else:
            action = "Open task"
        add(FocusCandidate(
            id=f"task:{task_id}", entity_kind="task", entity_id=task_id,
            project_id=str(task.project_id), project_name=project_map[str(task.project_id)].name,
            title=task.title, due_date=due, priority=task.priority, bucket=bucket,
            reason_tags=reasons, primary_action=action,
            actionable_at=_as_datetime(getattr(task, "created_at", None) or getattr(task, "updated_at", None)),
        ))

    for blocker in blocker_list:
        if blocker.resolver_id != actor_id:
            continue
        task = task_map.get(str(blocker.task_id))
        if not task:
            continue
        critical = task.mandatory and task.priority == "Critical" and task.status != "Done"
        add(FocusCandidate(
            id=f"blocker:{blocker.id}", entity_kind="blocker", entity_id=str(blocker.id),
            project_id=str(blocker.project_id), project_name=project_map[str(blocker.project_id)].name,
            title=blocker.reason, due_date=_as_date(blocker.review_date), priority="Critical" if critical else task.priority,
            bucket=1 if critical else 8,
            reason_tags=["Blocking mandatory critical work" if critical else "Blocker resolution assigned to you"],
            primary_action="Resolve blocker", actionable_at=_as_datetime(getattr(blocker, "created_at", None)),
        ))

    for record in governance:
        if str(getattr(record, "record_type", "")) != "Decision" or record.state in {"Approved", "Rejected", "Superseded"}:
            continue
        payload = record.payload or {}
        if str(payload.get("approver_id") or record.owner_id or "") != actor_id:
            continue
        due = _as_date(payload.get("due_date"))
        bucket = 1 if due and due < today else 3 if due == today else 8
        add(FocusCandidate(
            id=f"decision:{record.id}", entity_kind="decision", entity_id=str(record.id),
            project_id=str(record.project_id), project_name=project_map[str(record.project_id)].name,
            title=record.title, due_date=due, priority="High", bucket=bucket,
            reason_tags=["Overdue decision assigned to you" if bucket == 1 else "Decision assigned to you"],
            primary_action="Open decision", actionable_at=_as_datetime(getattr(record, "created_at", None)),
        ))

    for metric in metrics:
        if str(getattr(metric, "steward_id", "")) != actor_id or not metric.target_date:
            continue
        due = _as_date(metric.target_date)
        if due is None or due > _working_days_after(today, 3):
            continue
        add(FocusCandidate(
            id=f"measurement:{metric.id}", entity_kind="measurement", entity_id=str(metric.id),
            project_id=str(metric.project_id), project_name=project_map[str(metric.project_id)].name,
            title=metric.name, due_date=due, priority="Medium", bucket=3 if due <= today else 6,
            reason_tags=["Outcome measurement due"], primary_action="Record measurement",
            actionable_at=_as_datetime(getattr(metric, "created_at", None)),
        ))

    pinned = sorted((item for item in candidates if item.pinned), key=lambda item: item.rank_key)[:3]
    pinned_keys = {(item.entity_kind, item.entity_id) for item in pinned}
    recommendations = sorted((item for item in candidates if (item.entity_kind, item.entity_id) not in pinned_keys), key=lambda item: item.rank_key)
    selected: list[FocusCandidate] = []
    project_counts: dict[str, int] = {}
    display_limit = 3 if project_id is not None else 5
    for candidate in recommendations:
        if len(selected) >= max(0, display_limit - len(pinned)):
            break
        same_or_higher_other = any(
            other.project_id != candidate.project_id and other.bucket <= candidate.bucket
            for other in recommendations
            if other not in selected
        )
        if candidate.bucket > 2 and project_counts.get(candidate.project_id, 0) >= 3 and same_or_higher_other:
            continue
        selected.append(candidate)
        project_counts[candidate.project_id] = project_counts.get(candidate.project_id, 0) + 1
    all_items = sorted(candidates, key=lambda item: (not item.pinned, item.rank_key))
    displayed = pinned + selected
    return {
        "scope": "project" if project_id is not None else "my-day",
        "project_id": project_id,
        "engine_version": "pv-focus-1",
        "items": [item.as_dict(today) for item in displayed],
        "all_priorities": [item.as_dict(today) for item in all_items],
        "total": len(all_items),
        "pinned_count": len(pinned),
        "as_of": today.isoformat(),
    }
