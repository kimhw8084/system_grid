from app.core.config import Settings


def test_development_keeps_automatic_startup_schema_management():
    configured = Settings(ENVIRONMENT="development")
    assert configured.startup_schema_management_enabled is True
    assert configured.startup_schema_policy == "automatic"


def test_production_disables_startup_schema_mutation_by_default():
    configured = Settings(ENVIRONMENT="production")
    assert configured.startup_schema_management_enabled is False
    assert configured.startup_schema_policy == "operator_managed"


def test_production_requires_explicit_auto_migration_acknowledgement():
    configured = Settings(
        ENVIRONMENT="production",
        AUTO_MIGRATE_ON_STARTUP=True,
        ALLOW_AUTO_MIGRATE_IN_PRODUCTION=True,
    )
    assert configured.startup_schema_management_enabled is True
    assert configured.startup_schema_policy == "automatic"


def test_global_startup_migration_switch_preserves_operator_control():
    configured = Settings(
        ENVIRONMENT="development",
        AUTO_MIGRATE_ON_STARTUP=False,
        ALLOW_AUTO_MIGRATE_IN_PRODUCTION=True,
    )
    assert configured.startup_schema_management_enabled is False
