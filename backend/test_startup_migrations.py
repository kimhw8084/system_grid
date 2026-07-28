import os

import pytest

from app import main


def test_upgrade_database_schema_uses_supported_alembic_api(monkeypatch, tmp_path):
    observed = {}

    class FakeConfig:
        def __init__(self, path):
            observed["config_path"] = path

    def fake_upgrade(config, target):
        observed["config"] = config
        observed["target"] = target

    monkeypatch.setattr(main, "Config", FakeConfig)
    monkeypatch.setattr(main.command, "upgrade", fake_upgrade)

    main._upgrade_database_schema(str(tmp_path))

    assert observed["config_path"] == os.path.join(str(tmp_path), "alembic.ini")
    assert isinstance(observed["config"], FakeConfig)
    assert observed["target"] == "head"


@pytest.mark.anyio
async def test_run_migrations_runs_blocking_upgrade_in_worker_thread(monkeypatch):
    observed = {}

    def fake_upgrade(backend_dir):
        observed["backend_dir"] = backend_dir

    async def fake_to_thread(function, *args):
        observed["thread_function"] = function
        observed["thread_args"] = args
        return function(*args)

    monkeypatch.setattr(main, "_upgrade_database_schema", fake_upgrade)
    monkeypatch.setattr(main.asyncio, "to_thread", fake_to_thread)

    await main.run_migrations()

    assert observed["thread_function"] is fake_upgrade
    assert observed["thread_args"] == (observed["backend_dir"],)
    assert observed["backend_dir"].endswith(os.path.join("backend"))


@pytest.mark.anyio
async def test_run_migrations_preserves_failure_as_runtime_error(monkeypatch):
    async def fail_to_thread(function, *args):
        raise ValueError("migration boom")

    monkeypatch.setattr(main.asyncio, "to_thread", fail_to_thread)

    with pytest.raises(RuntimeError, match="Database migration failed") as caught:
        await main.run_migrations()

    assert isinstance(caught.value.__cause__, ValueError)
