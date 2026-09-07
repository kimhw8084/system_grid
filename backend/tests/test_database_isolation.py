from pathlib import Path

from app.core.config import settings


def _sqlite_path(url: str) -> Path:
    prefix = "sqlite+aiosqlite:///"
    raw = url.removeprefix(prefix)
    return Path(raw).expanduser().resolve()


def test_backend_tests_bind_settings_before_application_import_to_disposable_namespace():
    config_path = _sqlite_path(settings.CONFIG_DATABASE_URL)
    database_path = _sqlite_path(settings.DATABASE_URL)
    tenant_root = Path(settings.TENANT_STORAGE_ROOT).resolve()

    assert config_path.parent == database_path.parent == tenant_root.parent
    assert config_path.parent.name.startswith("sysgrid-pytest-")
    assert config_path.name == "config.db"
    assert database_path.name == "tenant.db"
    assert not config_path.is_relative_to(Path(__file__).resolve().parents[1])
