from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import date, timedelta
from hashlib import sha256
from heapq import heappop, heappush
import json
from math import ceil
from typing import Any, Iterable, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


CALCULATION_VERSION = "pv1-schedule-1"
DEPENDENCY_TYPES = {"FS", "SS", "FF", "SF"}
PREVIEW_OPERATIONS = {"move", "resize", "set_dates", "group_move", "recalculate_earliest", "change_calendar"}
Normalization = Literal["previous", "next"]


class ScheduleError(ValueError):
    def __init__(self, code: str, message: str, *, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.details = details or {}


@dataclass(frozen=True)
class ProjectCalendar:
    timezone: str = "UTC"
    working_weekdays: tuple[int, ...] = (0, 1, 2, 3, 4)
    exceptions: tuple[tuple[date, bool], ...] = ()
    revision: int = 1

    def __post_init__(self) -> None:
        weekdays = tuple(sorted(set(self.working_weekdays)))
        if not weekdays or any(day < 0 or day > 6 for day in weekdays):
            raise ScheduleError("INVALID_CALENDAR", "working_weekdays must contain unique values from 0 (Monday) through 6 (Sunday).")
        if self.revision < 1:
            raise ScheduleError("INVALID_CALENDAR", "calendar revision must be positive.")
        if not self.timezone.strip():
            raise ScheduleError("INVALID_CALENDAR", "calendar timezone is required.")
        try:
            ZoneInfo(self.timezone)
        except ZoneInfoNotFoundError as exc:
            raise ScheduleError("INVALID_CALENDAR", f"{self.timezone} is not an IANA timezone.") from exc
        object.__setattr__(self, "working_weekdays", weekdays)
        object.__setattr__(self, "exceptions", tuple(sorted(dict(self.exceptions).items())))

    @property
    def exception_map(self) -> dict[date, bool]:
        return dict(self.exceptions)

    def is_working(self, value: date) -> bool:
        override = self.exception_map.get(value)
        return override if override is not None else value.weekday() in self.working_weekdays

    def normalize(self, value: date, direction: Normalization | None = None) -> date:
        if self.is_working(value):
            return value
        if direction not in {"previous", "next"}:
            raise ScheduleError(
                "NON_WORKING_DATE",
                f"{value.isoformat()} is not a working date; choose previous or next explicitly.",
                details={"date": value.isoformat(), "choices": ["previous", "next"]},
            )
        step = -1 if direction == "previous" else 1
        candidate = value
        for _ in range(3700):
            candidate += timedelta(days=step)
            if self.is_working(candidate):
                return candidate
        raise ScheduleError("INVALID_CALENDAR", "No working date could be found within the supported range.")

    def shift(self, value: date, workdays: int) -> date:
        value = self.normalize(value)
        if workdays == 0:
            return value
        if not self.exceptions:
            working_weekdays = set(self.working_weekdays)
            step = 1 if workdays > 0 else -1
            remaining = abs(workdays)
            full_weeks, remainder = divmod(remaining - 1, len(working_weekdays))
            candidate = value + timedelta(days=step * full_weeks * 7)
            remaining_steps = remainder + 1
            while remaining_steps:
                candidate += timedelta(days=step)
                if candidate.weekday() in working_weekdays:
                    remaining_steps -= 1
            return candidate
        step = 1 if workdays > 0 else -1
        remaining = abs(workdays)
        candidate = value
        while remaining:
            candidate += timedelta(days=step)
            if self.is_working(candidate):
                remaining -= 1
        return candidate

    def duration(self, start: date, finish: date) -> int:
        start = self.normalize(start)
        finish = self.normalize(finish)
        if finish < start:
            raise ScheduleError("INVALID_DATES", "finish must be on or after start.")
        if not self.exceptions:
            working_weekdays = set(self.working_weekdays)
            days = (finish - start).days + 1
            full_weeks, remainder = divmod(days, 7)
            return full_weeks * len(working_weekdays) + sum(
                (start + timedelta(days=offset)).weekday() in working_weekdays
                for offset in range(remainder)
            )
        count = 0
        candidate = start
        while candidate <= finish:
            if self.is_working(candidate):
                count += 1
            candidate += timedelta(days=1)
        return count

    def boundary_delta(self, start: date, finish: date) -> int:
        """Return working boundaries from start to finish (positive when finish is later)."""
        start = self.normalize(start)
        finish = self.normalize(finish)
        if finish == start:
            return 0
        if finish > start:
            if not self.exceptions:
                return self._count_working_dates(start + timedelta(days=1), finish)
            count = 0
            cursor = start
            while cursor < finish:
                cursor += timedelta(days=1)
                if self.is_working(cursor):
                    count += 1
            return count
        return -self.boundary_delta(finish, start)

    def _count_working_dates(self, start: date, finish: date) -> int:
        """Count working dates in an inclusive range without date-by-date scans."""
        if finish < start:
            return 0
        working_weekdays = set(self.working_weekdays)
        days = (finish - start).days + 1
        full_weeks, remainder = divmod(days, 7)
        return full_weeks * len(working_weekdays) + sum(
            (start + timedelta(days=offset)).weekday() in working_weekdays
            for offset in range(remainder)
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "timezone": self.timezone,
            "working_weekdays": list(self.working_weekdays),
            "exceptions": [{"date": day.isoformat(), "working": working} for day, working in self.exceptions],
            "revision": self.revision,
        }


@dataclass(frozen=True)
class ScheduleTask:
    id: str
    title: str
    kind: str = "Task"
    start: date | None = None
    finish: date | None = None
    point_date: date | None = None
    anchor: Literal["start", "finish"] = "start"
    duration: int | None = None
    parent_id: str | None = None
    status: str = "To Do"
    progress: int = 0
    remaining_workdays: int | None = None
    actual_finish: date | None = None
    pinned: bool = False
    not_before: date | None = None
    external: bool = False
    revision: int = 1

    @property
    def milestone(self) -> bool:
        return self.kind == "Milestone"

    @property
    def completed(self) -> bool:
        return self.status in {"Done", "Completed"} or self.actual_finish is not None

    def resolved_duration(self, calendar: ProjectCalendar) -> int | None:
        if self.milestone:
            return 0
        if self.duration is not None:
            if self.duration < 1:
                raise ScheduleError("INVALID_DURATION", f"Task {self.id} must have duration >= 1.")
            return self.duration
        if self.start is None or self.finish is None:
            return None
        return calendar.duration(self.start, self.finish)

    def start_boundary_date(self, calendar: ProjectCalendar) -> date | None:
        if self.milestone:
            if self.point_date is None:
                return None
            point = calendar.normalize(self.point_date)
            return calendar.shift(point, 1) if self.anchor == "finish" else point
        return calendar.normalize(self.start) if self.start else None

    def with_start_boundary(self, boundary: date, calendar: ProjectCalendar, duration: int | None = None) -> ScheduleTask:
        boundary = calendar.normalize(boundary)
        if self.milestone:
            point = calendar.shift(boundary, -1) if self.anchor == "finish" else boundary
            return replace(self, point_date=point, start=None, finish=None, duration=0)
        resolved = duration if duration is not None else self.resolved_duration(calendar)
        if resolved is None or resolved < 1:
            raise ScheduleError("UNSCHEDULED_TASK", f"Task {self.id} needs a positive duration before it can be scheduled.")
        return replace(self, start=boundary, finish=calendar.shift(boundary, resolved - 1), duration=resolved)

    def schedule_dict(self) -> dict[str, Any]:
        return {
            "start_date": self.start.isoformat() if self.start else None,
            "end_date": self.finish.isoformat() if self.finish else None,
            "point_date": self.point_date.isoformat() if self.point_date else None,
            "anchor": self.anchor,
            "duration_workdays": self.duration,
        }


@dataclass(frozen=True)
class ScheduleEdge:
    id: str
    predecessor_id: str
    successor_id: str
    dependency_type: str = "FS"
    lag_days: int = 0
    active: bool = True
    external: bool = False
    confirmed: bool = True

    def __post_init__(self) -> None:
        if self.dependency_type not in DEPENDENCY_TYPES:
            raise ScheduleError("INVALID_DEPENDENCY", f"Unsupported dependency type {self.dependency_type}.")
        if not isinstance(self.lag_days, int) or isinstance(self.lag_days, bool) or self.lag_days < -365 or self.lag_days > 365:
            raise ScheduleError("INVALID_DEPENDENCY", "Dependency lag must be between -365 and 365 working days.")
        if self.predecessor_id == self.successor_id:
            raise ScheduleError("INVALID_DEPENDENCY", "A task cannot depend on itself.")


def parse_date(value: Any) -> date | None:
    if value in {None, ""}:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError as exc:
        raise ScheduleError("INVALID_DATE", f"Invalid date-only value: {value}.") from exc


def calendar_from_dict(raw: dict[str, Any] | None, *, legacy: bool = False) -> ProjectCalendar:
    raw = raw or {}
    weekdays = raw.get("working_weekdays")
    if weekdays is None:
        weekdays = tuple(range(7)) if legacy else (0, 1, 2, 3, 4)
    exceptions: list[tuple[date, bool]] = []
    for item in raw.get("exceptions") or []:
        if not isinstance(item, dict) or parse_date(item.get("date")) is None or not isinstance(item.get("working"), bool):
            raise ScheduleError("INVALID_CALENDAR", "Each calendar exception needs a date and boolean working value.")
        exceptions.append((parse_date(item["date"]), item["working"]))  # type: ignore[arg-type]
    return ProjectCalendar(
        timezone=str(raw.get("timezone") or "UTC"),
        working_weekdays=tuple(int(day) for day in weekdays),
        exceptions=tuple(exceptions),
        revision=int(raw.get("revision") or 1),
    )


def _active_edges(edges: Iterable[ScheduleEdge]) -> list[ScheduleEdge]:
    return sorted(
        [edge for edge in edges if edge.active and (not edge.external or edge.confirmed)],
        key=lambda edge: (edge.predecessor_id, edge.successor_id, edge.dependency_type, edge.id),
    )


def cycle_path(task_ids: Iterable[str], edges: Iterable[ScheduleEdge]) -> list[str] | None:
    adjacency = {task_id: [] for task_id in task_ids}
    for edge in _active_edges(edges):
        if edge.predecessor_id in adjacency and edge.successor_id in adjacency:
            adjacency[edge.predecessor_id].append(edge.successor_id)
    for values in adjacency.values():
        values.sort()
    state: dict[str, int] = {}
    for root in sorted(adjacency):
        if state.get(root, 0) != 0:
            continue
        path: list[str] = [root]
        positions = {root: 0}
        state[root] = 1
        stack: list[tuple[str, int]] = [(root, 0)]
        while stack:
            node, edge_index = stack[-1]
            targets = adjacency.get(node, [])
            if edge_index >= len(targets):
                stack.pop()
                state[node] = 2
                positions.pop(node, None)
                path.pop()
                continue
            target = targets[edge_index]
            stack[-1] = (node, edge_index + 1)
            if state.get(target, 0) == 0:
                state[target] = 1
                positions[target] = len(path)
                path.append(target)
                stack.append((target, 0))
            elif state.get(target) == 1:
                return [*path[positions[target]:], target]
    return None


def topological_order(tasks: Iterable[ScheduleTask], edges: Iterable[ScheduleEdge]) -> list[str]:
    task_ids = {task.id for task in tasks}
    incoming = {task_id: 0 for task_id in task_ids}
    outgoing = {task_id: [] for task_id in task_ids}
    for edge in _active_edges(edges):
        if edge.predecessor_id not in task_ids or edge.successor_id not in task_ids:
            continue
        incoming[edge.successor_id] += 1
        outgoing[edge.predecessor_id].append(edge.successor_id)
    ready = [task_id for task_id, count in incoming.items() if count == 0]
    ready.sort()
    ordered: list[str] = []
    while ready:
        node = heappop(ready)
        ordered.append(node)
        for target in sorted(outgoing[node]):
            incoming[target] -= 1
            if incoming[target] == 0:
                heappush(ready, target)
    if len(ordered) != len(task_ids):
        path = cycle_path(task_ids, edges) or []
        raise ScheduleError("DEPENDENCY_CYCLE", "Dependency graph contains a cycle.", details={"cycle_path": path})
    return ordered


def _constraint_start(
    predecessor_start: date,
    predecessor_duration: int,
    successor_duration: int,
    edge: ScheduleEdge,
    calendar: ProjectCalendar,
) -> date:
    predecessor_finish_boundary = calendar.shift(predecessor_start, predecessor_duration)
    if edge.dependency_type == "FS":
        return calendar.shift(predecessor_finish_boundary, edge.lag_days)
    if edge.dependency_type == "SS":
        return calendar.shift(predecessor_start, edge.lag_days)
    if edge.dependency_type == "FF":
        return calendar.shift(predecessor_finish_boundary, edge.lag_days - successor_duration)
    return calendar.shift(predecessor_start, edge.lag_days - successor_duration)


def _max_date(*values: date | None) -> date | None:
    present = [value for value in values if value is not None]
    return max(present) if present else None


def schedule_earliest(
    tasks: Iterable[ScheduleTask],
    edges: Iterable[ScheduleEdge],
    calendar: ProjectCalendar,
    *,
    anchors: dict[str, date] | None = None,
    preserve_existing: bool = True,
) -> tuple[dict[str, ScheduleTask], dict[str, list[dict[str, Any]]]]:
    task_map = {task.id: task for task in tasks}
    order = topological_order(task_map.values(), edges)
    incoming: dict[str, list[ScheduleEdge]] = {task_id: [] for task_id in task_map}
    for edge in _active_edges(edges):
        if edge.predecessor_id in task_map and edge.successor_id in task_map:
            incoming[edge.successor_id].append(edge)
    anchors = anchors or {}
    scheduled: dict[str, ScheduleTask] = {}
    explanations: dict[str, list[dict[str, Any]]] = {task_id: [] for task_id in task_map}
    known_starts = [task.start_boundary_date(calendar) for task in task_map.values()]
    project_anchor = min(value for value in known_starts if value is not None) if any(value is not None for value in known_starts) else None

    for task_id in order:
        task = task_map[task_id]
        duration = task.resolved_duration(calendar)
        existing = task.start_boundary_date(calendar)
        lower = task.not_before
        if lower is not None:
            lower = calendar.normalize(lower)
            explanations[task_id].append({"kind": "not_before", "date": lower.isoformat()})
        if preserve_existing and existing is not None and task_id not in anchors:
            lower = _max_date(lower, existing)
        for edge in sorted(incoming[task_id], key=lambda item: (item.predecessor_id, item.dependency_type, item.id)):
            predecessor = scheduled.get(edge.predecessor_id)
            if predecessor is None:
                continue
            predecessor_start = predecessor.start_boundary_date(calendar)
            predecessor_duration = predecessor.resolved_duration(calendar)
            if predecessor_start is None or predecessor_duration is None or duration is None:
                continue
            required = _constraint_start(predecessor_start, predecessor_duration, duration, edge, calendar)
            if lower is None or required > lower:
                lower = required
            explanations[task_id].append({
                "kind": "dependency",
                "edge_id": edge.id,
                "predecessor_id": edge.predecessor_id,
                "type": edge.dependency_type,
                "lag_days": edge.lag_days,
                "required_start": required.isoformat(),
            })
        if task_id in anchors:
            requested = calendar.normalize(anchors[task_id])
            if lower is not None and requested < lower:
                raise ScheduleError(
                    "SCHEDULE_CONFLICT",
                    f"Task {task_id} cannot be placed at the requested date.",
                    details={"task_id": task_id, "requested": requested.isoformat(), "required": lower.isoformat(), "chain": explanations[task_id]},
                )
            lower = requested
            explanations[task_id].append({"kind": "user_anchor", "date": requested.isoformat()})
        if lower is None:
            lower = project_anchor
        if lower is None or duration is None:
            scheduled[task_id] = task
            continue
        candidate = task.with_start_boundary(lower, calendar, duration)
        if task.completed or task.pinned or task.external:
            if existing is not None and candidate.start_boundary_date(calendar) != existing:
                raise ScheduleError(
                    "SCHEDULE_CONFLICT",
                    f"Task {task_id} is fixed and cannot be propagated.",
                    details={"task_id": task_id, "reason": "completed" if task.completed else "pinned" if task.pinned else "external", "chain": explanations[task_id]},
                )
            candidate = task
        scheduled[task_id] = candidate
    return scheduled, explanations


def _task_boundary(task: ScheduleTask, calendar: ProjectCalendar) -> tuple[date | None, date | None, int | None]:
    start = task.start_boundary_date(calendar)
    duration = task.resolved_duration(calendar)
    finish_boundary = calendar.shift(start, duration) if start is not None and duration is not None else None
    return start, finish_boundary, duration


def critical_path(
    tasks: Iterable[ScheduleTask],
    edges: Iterable[ScheduleEdge],
    calendar: ProjectCalendar,
    *,
    completion_anchor: date | None = None,
) -> dict[str, Any]:
    task_list = list(tasks)
    task_map = {task.id: task for task in task_list}
    order = topological_order(task_list, edges)
    earliest, explanations = schedule_earliest(task_list, edges, calendar, preserve_existing=True)
    bounds = {task_id: _task_boundary(task, calendar) for task_id, task in earliest.items()}
    finishes = [finish for _, finish, _ in bounds.values() if finish is not None]
    # Project target dates are inclusive display dates; schedule constraints use
    # exclusive finish boundaries, so the completion boundary is the next
    # working boundary after the target date.
    completion = calendar.shift(calendar.normalize(completion_anchor), 1) if completion_anchor else (max(finishes) if finishes else None)
    latest: dict[str, date | None] = {task_id: completion for task_id in task_map}
    outgoing: dict[str, list[ScheduleEdge]] = {task_id: [] for task_id in task_map}
    for edge in _active_edges(edges):
        if edge.predecessor_id in task_map and edge.successor_id in task_map:
            outgoing[edge.predecessor_id].append(edge)

    for task_id in reversed(order):
        _, _, predecessor_duration = bounds[task_id]
        if predecessor_duration is None:
            latest[task_id] = None
            continue
        candidates: list[date] = []
        for edge in outgoing[task_id]:
            successor_latest = latest.get(edge.successor_id)
            _, _, successor_duration = bounds[edge.successor_id]
            if successor_latest is None or successor_duration is None:
                continue
            if edge.dependency_type == "FS":
                candidates.append(calendar.shift(successor_latest, -edge.lag_days - predecessor_duration))
            elif edge.dependency_type == "SS":
                candidates.append(calendar.shift(successor_latest, -edge.lag_days))
            elif edge.dependency_type == "FF":
                candidates.append(calendar.shift(successor_latest, successor_duration - edge.lag_days - predecessor_duration))
            else:
                candidates.append(calendar.shift(successor_latest, successor_duration - edge.lag_days))
        if candidates:
            latest[task_id] = min(candidates)
        elif completion is not None:
            latest[task_id] = calendar.shift(completion, -predecessor_duration)

    rows: list[dict[str, Any]] = []
    incomplete = False
    for task_id in sorted(task_map):
        start, finish_boundary, duration = bounds[task_id]
        latest_start = latest[task_id]
        if start is None or finish_boundary is None or duration is None or latest_start is None:
            incomplete = True
            slack = None
        else:
            slack = calendar.boundary_delta(start, latest_start)
        rows.append({
            "task_id": task_id,
            "earliest_start": start.isoformat() if start else None,
            "earliest_finish_boundary": finish_boundary.isoformat() if finish_boundary else None,
            "latest_start": latest_start.isoformat() if latest_start else None,
            "slack_workdays": slack,
            "critical": slack == 0,
            "negative_slack": slack is not None and slack < 0,
            "explanation_chain": explanations[task_id],
        })
    rows_by_id = {row["task_id"]: row for row in rows}
    return {
        "calculation_version": CALCULATION_VERSION,
        "completion_anchor": completion.isoformat() if completion else None,
        "status": "Critical path incomplete" if incomplete else "Calculated",
        "rows": rows,
        "critical_task_ids": [task_id for task_id in order if rows_by_id[task_id]["critical"]],
        "infeasible": any(row["negative_slack"] for row in rows),
    }


def _descendants(tasks: dict[str, ScheduleTask], selected: set[str]) -> set[str]:
    children: dict[str, list[str]] = {}
    for task in tasks.values():
        if task.parent_id is not None:
            children.setdefault(task.parent_id, []).append(task.id)
    for values in children.values():
        values.sort(reverse=True)
    result = set(selected)
    pending = sorted(selected, reverse=True)
    while pending:
        parent = pending.pop()
        for child in children.get(parent, []):
            if child not in result:
                result.add(child)
                pending.append(child)
    return result


def _change_record(before: ScheduleTask, after: ScheduleTask, explanation: list[dict[str, Any]]) -> dict[str, Any] | None:
    before_values = before.schedule_dict()
    after_values = after.schedule_dict()
    if before_values == after_values:
        return None
    return {"task_id": before.id, "before": before_values, "after": after_values, "explanation_chain": explanation}


def preview_schedule(
    tasks: Iterable[ScheduleTask],
    edges: Iterable[ScheduleEdge],
    calendar: ProjectCalendar,
    *,
    operation: str,
    selection_ids: Iterable[str],
    parameters: dict[str, Any],
    graph_revision: int,
) -> dict[str, Any]:
    if operation not in PREVIEW_OPERATIONS:
        raise ScheduleError("INVALID_OPERATION", f"Unsupported schedule operation {operation}.")
    original = {task.id: task for task in tasks}
    selected = {str(task_id) for task_id in selection_ids}
    missing = sorted(selected - original.keys())
    if missing:
        raise ScheduleError("MISSING_ENDPOINT", "Schedule selection contains unknown tasks.", details={"task_ids": missing})
    working = dict(original)
    anchors: dict[str, date] = {}
    warnings: list[dict[str, Any]] = []
    target_calendar = calendar

    if operation in {"move", "group_move"}:
        delta = parameters.get("delta_workdays")
        if not isinstance(delta, int) or isinstance(delta, bool) or delta < -3650 or delta > 3650:
            raise ScheduleError("INVALID_MOVE", "delta_workdays must be an integer between -3650 and 3650.")
        moving = _descendants(original, selected) if operation == "group_move" else selected
        for task_id in sorted(moving):
            task = working[task_id]
            start = task.start_boundary_date(calendar)
            if task.completed:
                warnings.append({"task_id": task_id, "code": "COMPLETED_FIXED"})
                continue
            if start is None:
                warnings.append({"task_id": task_id, "code": "UNSCHEDULED_UNCHANGED"})
                continue
            anchors[task_id] = calendar.shift(start, delta)
    elif operation == "resize":
        if len(selected) != 1:
            raise ScheduleError("INVALID_RESIZE", "Resize requires exactly one selected task.")
        task_id = next(iter(selected))
        task = working[task_id]
        if task.milestone:
            raise ScheduleError("INVALID_RESIZE", "Milestones cannot be resized.")
        edge = parameters.get("edge")
        delta = parameters.get("delta_workdays")
        if edge not in {"start", "finish"} or not isinstance(delta, int) or isinstance(delta, bool):
            raise ScheduleError("INVALID_RESIZE", "Resize requires edge start|finish and integer delta_workdays.")
        start, _, duration = _task_boundary(task, calendar)
        if start is None or duration is None:
            raise ScheduleError("UNSCHEDULED_TASK", f"Task {task_id} is not scheduled.")
        if edge == "start":
            next_duration = duration - delta
            next_start = calendar.shift(start, delta)
        else:
            next_duration = duration + delta
            next_start = start
        if next_duration < 1:
            raise ScheduleError("INVALID_DURATION", "Resize would make task duration less than one working day.")
        working[task_id] = task.with_start_boundary(next_start, calendar, next_duration)
        anchors[task_id] = next_start
    elif operation == "set_dates":
        if len(selected) != 1:
            raise ScheduleError("INVALID_DATES", "set_dates requires exactly one selected task.")
        task_id = next(iter(selected))
        task = working[task_id]
        normalizations = parameters.get("normalization") or {}
        if task.milestone:
            anchor = parameters.get("anchor") or task.anchor
            if anchor not in {"start", "finish"}:
                raise ScheduleError("INVALID_DATES", "Milestone anchor must be start or finish.")
            point = parse_date(parameters.get("point_date"))
            if point is None:
                raise ScheduleError("INVALID_DATES", "Milestone point_date is required.")
            point = calendar.normalize(point, normalizations.get("point_date"))
            task = replace(task, anchor=anchor, point_date=point)
            working[task_id] = task
            boundary = task.start_boundary_date(calendar)
            if boundary:
                anchors[task_id] = boundary
        else:
            start = parse_date(parameters.get("start_date"))
            finish = parse_date(parameters.get("end_date"))
            if start is None or finish is None:
                raise ScheduleError("INVALID_DATES", "start_date and end_date are required.")
            start = calendar.normalize(start, normalizations.get("start_date"))
            finish = calendar.normalize(finish, normalizations.get("end_date"))
            duration = calendar.duration(start, finish)
            working[task_id] = task.with_start_boundary(start, calendar, duration)
            anchors[task_id] = start
    elif operation == "change_calendar":
        target_calendar = calendar_from_dict({**parameters, "revision": calendar.revision + 1})
        normalizations = parameters.get("normalization") or {}
        for task_id, task in sorted(working.items()):
            if task.milestone and task.point_date:
                direction = normalizations.get(task_id, {}).get("point_date")
                point = target_calendar.normalize(task.point_date, direction)
                working[task_id] = replace(task, point_date=point)
            elif task.start and task.finish:
                task_norm = normalizations.get(task_id, {})
                start = target_calendar.normalize(task.start, task_norm.get("start_date"))
                finish = target_calendar.normalize(task.finish, task_norm.get("end_date"))
                working[task_id] = task.with_start_boundary(start, target_calendar, target_calendar.duration(start, finish))
    preserve = operation != "recalculate_earliest"
    scheduled, explanations = schedule_earliest(working.values(), edges, target_calendar, anchors=anchors, preserve_existing=preserve)
    changes = [record for task_id in sorted(original) if (record := _change_record(original[task_id], scheduled[task_id], explanations[task_id]))]
    result = {
        "base_graph_revision": graph_revision,
        "calculation_version": CALCULATION_VERSION,
        "calendar_revision": calendar.revision,
        "target_calendar_revision": target_calendar.revision,
        "operation": operation,
        "selection_ids": sorted(selected),
        "parameters": parameters,
        "changes": changes,
        "warnings": warnings,
        "failures": [],
    }
    result["content_hash"] = sha256(json.dumps(result, sort_keys=True, separators=(",", ":"), default=str).encode()).hexdigest()
    return result


def forecast_schedule(
    tasks: Iterable[ScheduleTask],
    edges: Iterable[ScheduleEdge],
    calendar: ProjectCalendar,
    *,
    as_of: date,
    unresolved_blocker_ids: set[str] | None = None,
) -> dict[str, Any]:
    unresolved_blocker_ids = unresolved_blocker_ids or set()
    task_list = list(tasks)
    forecast_tasks: list[ScheduleTask] = []
    planned_finish_boundaries = [_task_boundary(task, calendar)[1] for task in task_list]
    planned_finish_boundary = max((value for value in planned_finish_boundaries if value is not None), default=None)
    missing: list[str] = []
    reasons: list[dict[str, Any]] = []
    start_floor = calendar.normalize(as_of, "next")
    for task in task_list:
        if task.completed:
            if task.actual_finish:
                point = calendar.normalize(task.actual_finish, "previous")
                forecast_tasks.append(replace(task, start=point, finish=point, duration=1))
            elif task.finish:
                forecast_tasks.append(task)
                reasons.append({"task_id": task.id, "code": "PLANNED_HISTORY_UNVERIFIED"})
            else:
                missing.append(task.id)
            continue
        duration = task.remaining_workdays
        if duration is None:
            planned = task.resolved_duration(calendar)
            duration = max(1, ceil(planned * (1 - max(0, min(100, task.progress)) / 100))) if planned else None
        if duration is None:
            missing.append(task.id)
            continue
        planned_start = task.start_boundary_date(calendar)
        next_start = _max_date(start_floor, planned_start)
        if next_start is None:
            missing.append(task.id)
            continue
        forecast_tasks.append(task.with_start_boundary(next_start, calendar, duration))
        if task.id in unresolved_blocker_ids:
            reasons.append({"task_id": task.id, "code": "UNRESOLVED_BLOCKER", "uncertain": True})
    coverage = {
        "total_tasks": len(task_list),
        "forecastable_tasks": len(forecast_tasks),
        "missing_task_ids": sorted(missing),
        "complete": not missing,
    }
    try:
        scheduled, explanations = schedule_earliest(forecast_tasks, edges, calendar, preserve_existing=True)
        finish_boundaries = [_task_boundary(task, calendar)[1] for task in scheduled.values()]
        finish_boundary = max(value for value in finish_boundaries if value is not None) if any(value is not None for value in finish_boundaries) else None
        finish = calendar.shift(finish_boundary, -1) if finish_boundary else None
    except ScheduleError as error:
        return {"algorithm": CALCULATION_VERSION, "as_of": as_of.isoformat(), "coverage": coverage, "finish": None, "uncertain": True, "reasons": [*reasons, {"code": error.code, **error.details}], "explanation_chains": {}}
    return {
        "algorithm": CALCULATION_VERSION,
        "as_of": as_of.isoformat(),
        "provenance": "canonical task graph and project calendar",
        "coverage": coverage,
        "finish": finish.isoformat() if finish else None,
        "delta_workdays": calendar.boundary_delta(planned_finish_boundary, finish_boundary) if planned_finish_boundary and finish_boundary else None,
        "uncertain": bool(missing or unresolved_blocker_ids),
        "reasons": reasons,
        "explanation_chains": explanations,
        "tasks": [{"task_id": task_id, **task.schedule_dict()} for task_id, task in sorted(scheduled.items())],
    }
