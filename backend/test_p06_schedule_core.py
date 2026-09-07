import json
from pathlib import Path

import pytest

from app.pv1.schedule import (
    ProjectCalendar,
    ScheduleEdge,
    ScheduleError,
    ScheduleTask,
    calendar_from_dict,
    critical_path,
    cycle_path,
    parse_date,
    preview_schedule,
    schedule_earliest,
)


GOLDEN_PATH = Path(__file__).resolve().parents[1] / "shared" / "pv1_schedule_goldens.json"


def _fixture():
    raw = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    journey = raw["journey_3"]
    calendar = calendar_from_dict(raw["calendar"])
    tasks = [
        ScheduleTask(
            id=item["id"],
            title=item["title"],
            kind=item["kind"],
            start=parse_date(item.get("start_date")),
            finish=parse_date(item.get("end_date")),
            point_date=parse_date(item.get("point_date")),
            anchor=item.get("anchor", "start"),
            duration=item["duration_workdays"],
        )
        for item in journey["tasks"]
    ]
    edges = [ScheduleEdge(**item) for item in journey["dependencies"]]
    return journey, calendar, tasks, edges


def test_journey_3_exact_dates_slack_and_least_forward_preview():
    journey, calendar, tasks, edges = _fixture()
    analysis = critical_path(tasks, edges, calendar)
    rows = {row["task_id"]: row for row in analysis["rows"]}
    assert analysis["critical_task_ids"] == journey["expected"]["critical_task_ids"]
    assert {task_id: row["slack_workdays"] for task_id, row in rows.items()} == journey["expected"]["slack_workdays"]

    preview = preview_schedule(
        tasks,
        edges,
        calendar,
        operation="move",
        selection_ids=["B"],
        parameters={"delta_workdays": 2},
        graph_revision=7,
    )
    changes = {item["task_id"]: item["after"] for item in preview["changes"]}
    expected = journey["expected"]["move_b_two_workdays"]
    for task_id in ("B", "D", "delivery"):
        assert changes[task_id] | {key: value for key, value in expected[task_id].items() if key not in changes[task_id]} == changes[task_id]
        for key, value in expected[task_id].items():
            assert changes[task_id][key] == value
    assert "C" not in changes
    assert preview["base_graph_revision"] == 7
    assert len(preview["content_hash"]) == 64


@pytest.mark.parametrize(
    ("dependency_type", "expected_start"),
    [("FS", "2026-10-08"), ("SS", "2026-10-05"), ("FF", "2026-10-06"), ("SF", "2026-10-01")],
)
def test_all_dependency_boundaries_and_negative_lag(dependency_type, expected_start):
    calendar = ProjectCalendar()
    tasks = [
        ScheduleTask(id="A", title="A", start=parse_date("2026-10-05"), finish=parse_date("2026-10-07"), duration=3),
        ScheduleTask(id="B", title="B", start=parse_date("2026-09-28"), finish=parse_date("2026-09-29"), duration=2),
    ]
    edges = [ScheduleEdge(id="edge", predecessor_id="A", successor_id="B", dependency_type=dependency_type, lag_days=0)]
    scheduled, _ = schedule_earliest(
        tasks,
        edges,
        calendar,
        anchors={"A": parse_date("2026-10-05")},
        preserve_existing=False,
    )
    assert scheduled["B"].start.isoformat() == expected_start

    lead = [ScheduleEdge(id="lead", predecessor_id="A", successor_id="B", dependency_type="FS", lag_days=-1)]
    lead_scheduled, _ = schedule_earliest(
        tasks,
        lead,
        calendar,
        anchors={"A": parse_date("2026-10-05")},
        preserve_existing=False,
    )
    assert lead_scheduled["B"].start.isoformat() == "2026-10-07"


def test_nonworking_dates_require_explicit_normalization_and_calendar_exceptions_win():
    calendar = ProjectCalendar(exceptions=((parse_date("2026-10-12"), False), (parse_date("2026-10-10"), True)))
    assert calendar.is_working(parse_date("2026-10-10"))
    assert not calendar.is_working(parse_date("2026-10-12"))
    with pytest.raises(ScheduleError) as failure:
        calendar.normalize(parse_date("2026-10-11"))
    assert failure.value.code == "NON_WORKING_DATE"
    assert calendar.normalize(parse_date("2026-10-11"), "previous") == parse_date("2026-10-10")
    assert calendar.normalize(parse_date("2026-10-11"), "next") == parse_date("2026-10-13")


def test_cycle_path_is_complete_and_same_pair_distinct_types_are_valid():
    task_ids = ["A", "B", "C", "D"]
    edges = [
        ScheduleEdge(id="ab-fs", predecessor_id="A", successor_id="B", dependency_type="FS"),
        ScheduleEdge(id="ab-ss", predecessor_id="A", successor_id="B", dependency_type="SS"),
        ScheduleEdge(id="bc", predecessor_id="B", successor_id="C"),
        ScheduleEdge(id="cd", predecessor_id="C", successor_id="D"),
        ScheduleEdge(id="da", predecessor_id="D", successor_id="A"),
    ]
    assert cycle_path(task_ids, edges) == ["A", "B", "C", "D", "A"]


def test_completed_and_pinned_tasks_report_conflict_without_partial_result():
    calendar = ProjectCalendar()
    tasks = [
        ScheduleTask(id="A", title="A", start=parse_date("2026-10-05"), finish=parse_date("2026-10-07"), duration=3),
        ScheduleTask(id="B", title="B", start=parse_date("2026-10-08"), finish=parse_date("2026-10-09"), duration=2, pinned=True),
    ]
    edges = [ScheduleEdge(id="ab", predecessor_id="A", successor_id="B")]
    with pytest.raises(ScheduleError) as failure:
        preview_schedule(tasks, edges, calendar, operation="move", selection_ids=["A"], parameters={"delta_workdays": 2}, graph_revision=1)
    assert failure.value.code == "SCHEDULE_CONFLICT"
    assert failure.value.details["task_id"] == "B"


def test_group_move_keeps_completed_and_unscheduled_descendants_fixed_with_warnings():
    calendar = ProjectCalendar()
    tasks = [
        ScheduleTask(id="G", title="Group", kind="Summary", start=parse_date("2026-10-05"), finish=parse_date("2026-10-05"), duration=1),
        ScheduleTask(id="A", title="A", parent_id="G", start=parse_date("2026-10-05"), finish=parse_date("2026-10-05"), duration=1),
        ScheduleTask(id="B", title="B", parent_id="G", start=parse_date("2026-10-05"), finish=parse_date("2026-10-05"), duration=1, status="Done"),
        ScheduleTask(id="C", title="C", parent_id="G"),
    ]
    preview = preview_schedule(tasks, [], calendar, operation="group_move", selection_ids=["G"], parameters={"delta_workdays": 1}, graph_revision=1)
    assert [item["task_id"] for item in preview["changes"]] == ["A", "G"]
    assert preview["warnings"] == [{"task_id": "B", "code": "COMPLETED_FIXED"}, {"task_id": "C", "code": "UNSCHEDULED_UNCHANGED"}]


def test_inclusive_completion_date_yields_zero_slack_and_negative_slack_is_not_critical():
    calendar = ProjectCalendar()
    task = ScheduleTask(id="A", title="A", start=parse_date("2026-10-05"), finish=parse_date("2026-10-07"), duration=3)
    on_target = critical_path([task], [], calendar, completion_anchor=parse_date("2026-10-07"))
    assert on_target["rows"][0]["slack_workdays"] == 0
    assert on_target["rows"][0]["critical"] is True

    infeasible = critical_path([task], [], calendar, completion_anchor=parse_date("2026-10-06"))
    assert infeasible["rows"][0]["slack_workdays"] == -1
    assert infeasible["rows"][0]["negative_slack"] is True
    assert infeasible["rows"][0]["critical"] is False
    assert infeasible["critical_task_ids"] == []
