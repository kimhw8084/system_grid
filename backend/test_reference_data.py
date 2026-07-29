from types import SimpleNamespace

from app.reference_data import (
    CODE_MANAGED_REFERENCE_OPTIONS,
    build_reference_plan,
    required_reference_pairs,
)


def as_row(definition):
    return SimpleNamespace(**definition)


def test_code_managed_reference_plan_is_complete_and_idempotent():
    creates, updates = build_reference_plan([])
    assert len(creates) == len(CODE_MANAGED_REFERENCE_OPTIONS)
    assert updates == []

    exact_rows = [as_row(definition) for definition in CODE_MANAGED_REFERENCE_OPTIONS]
    creates, updates = build_reference_plan(exact_rows)
    assert creates == []
    assert updates == []

    stale_rows = [as_row(definition) for definition in CODE_MANAGED_REFERENCE_OPTIONS]
    stale_rows[0].description = "stale"
    creates, updates = build_reference_plan(stale_rows)
    assert creates == []
    assert len(updates) == 1
    assert updates[0][1] == {"description": CODE_MANAGED_REFERENCE_OPTIONS[0]["description"]}

    required = required_reference_pairs()
    assert len(required) == len(CODE_MANAGED_REFERENCE_OPTIONS)
    assert {
        ("MonitoringCategory", "Hardware"),
        ("MonitoringPlatform", "Zabbix"),
        ("NotificationMethod", "Slack"),
        ("MonitoringSeverity", "Critical"),
        ("MonitoringOwnerRole", "Primary Support"),
    }.issubset(required)


class _FakeScalarResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return list(self._rows)


class _FakeExecuteResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return _FakeScalarResult(self._rows)


class _FakeAsyncSession:
    def __init__(self):
        self.rows = []
        self.commit_count = 0

    async def execute(self, _statement):
        return _FakeExecuteResult(self.rows)

    def add(self, row):
        self.rows.append(row)

    async def commit(self):
        self.commit_count += 1


def test_async_provisioning_applies_the_plan_once():
    import asyncio
    from app.reference_data import ensure_code_managed_reference_data

    async def run():
        db = _FakeAsyncSession()
        first = await ensure_code_managed_reference_data(db)
        second = await ensure_code_managed_reference_data(db)
        return db, first, second

    db, first, second = asyncio.run(run())
    assert first == {"created": len(CODE_MANAGED_REFERENCE_OPTIONS), "updated": 0, "total": len(CODE_MANAGED_REFERENCE_OPTIONS)}
    assert second == {"created": 0, "updated": 0, "total": len(CODE_MANAGED_REFERENCE_OPTIONS)}
    assert {(row.category, row.value) for row in db.rows} == required_reference_pairs()
    assert db.commit_count == 2
