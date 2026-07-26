from __future__ import annotations

import importlib.util
from contextlib import closing
import json
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import unittest


MODULE_PATH = Path(__file__).resolve().parents[1] / "production_data_guard.py"
SPEC = importlib.util.spec_from_file_location("production_data_guard", MODULE_PATH)
assert SPEC and SPEC.loader
production_data_guard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(production_data_guard)


class ProductionDataGuardTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.backend_root = self.root / "backend"
        self.backend_root.mkdir()
        (self.backend_root / "alembic.ini").write_text("[alembic]\n", encoding="utf-8")

        self.config_db = self.root / "config.db"
        self.default_db = self.root / "default.db"
        self.tenant_db = self.root / "tenant-two.db"
        self._create_data_db(self.default_db, "default-row")
        self._create_data_db(self.tenant_db, "tenant-row")
        self._create_config_db()

        self.config_url = production_data_guard.sqlite_url_for_path(self.config_db)
        self.default_url = production_data_guard.sqlite_url_for_path(self.default_db)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    @staticmethod
    def _create_data_db(path: Path, value: str) -> None:
        with closing(sqlite3.connect(path)) as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute("CREATE TABLE sample (value TEXT NOT NULL)")
            connection.execute("INSERT INTO sample(value) VALUES (?)", (value,))
            connection.commit()

    def _create_config_db(self) -> None:
        with closing(sqlite3.connect(self.config_db)) as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute(
                "CREATE TABLE tenants (id INTEGER PRIMARY KEY, name TEXT, db_url TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1)"
            )
            connection.execute(
                "INSERT INTO tenants(id, name, db_url, is_active) VALUES (?, ?, ?, ?)",
                (1, "Default Engine", production_data_guard.sqlite_url_for_path(self.default_db), 1),
            )
            connection.execute(
                "INSERT INTO tenants(id, name, db_url, is_active) VALUES (?, ?, ?, ?)",
                (2, "Tenant Two", production_data_guard.sqlite_url_for_path(self.tenant_db), 1),
            )
            connection.commit()

    def _snapshot(self) -> Path:
        return production_data_guard.create_snapshot(
            output_root=self.root / "backups",
            config_db_url=self.config_url,
            default_db_url=self.default_url,
            backend_root=self.backend_root,
            operation_id="op-test",
        )

    def test_discovery_deduplicates_default_and_registered_tenant(self) -> None:
        databases = production_data_guard.discover_databases(
            config_db_url=self.config_url,
            default_db_url=self.default_url,
            backend_root=self.backend_root,
        )
        self.assertEqual(len(databases), 3)
        default = next(item for item in databases if item["source_path"] == self.default_db.resolve())
        self.assertEqual(default["roles"], ["default", "tenant-1-Default-Engine"])

    def test_online_snapshot_restore_and_manifest_are_safe(self) -> None:
        writer = sqlite3.connect(self.tenant_db)
        try:
            writer.execute("INSERT INTO sample(value) VALUES ('writer-open')")
            writer.commit()
            snapshot = self._snapshot()
        finally:
            writer.close()

        manifest_text = (snapshot / "manifest.json").read_text(encoding="utf-8")
        manifest = json.loads(manifest_text)
        self.assertEqual(manifest["manifest_version"], 1)
        self.assertEqual(manifest["database_count"], 3)
        self.assertNotIn(str(self.root), manifest_text)
        self.assertNotIn("sqlite+aiosqlite", manifest_text)

        restored = production_data_guard.restore_snapshot(
            snapshot_dir=snapshot,
            target_root=self.root / "isolated-restore",
        )
        self.assertTrue((restored / "restore-record.json").is_file())
        tenant_entry = next(
            entry for entry in manifest["databases"]
            if any(role.startswith("tenant-2-") for role in entry["logical_roles"])
        )
        with closing(sqlite3.connect(restored / tenant_entry["relative_path"])) as connection:
            values = [row[0] for row in connection.execute("SELECT value FROM sample ORDER BY rowid")]
        self.assertIn("writer-open", values)
        production_data_guard.load_and_validate_manifest(snapshot)

    def test_checksum_tampering_is_rejected(self) -> None:
        snapshot = self._snapshot()
        manifest = json.loads((snapshot / "manifest.json").read_text(encoding="utf-8"))
        database_path = snapshot / manifest["databases"][0]["relative_path"]
        database_path.write_bytes(database_path.read_bytes() + b"tamper")
        with self.assertRaisesRegex(production_data_guard.DataGuardError, "size check failed|checksum check failed"):
            production_data_guard.load_and_validate_manifest(snapshot)

    def test_manifest_path_traversal_is_rejected(self) -> None:
        snapshot = self._snapshot()
        manifest_path = snapshot / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["databases"][0]["relative_path"] = "../escape.db"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaisesRegex(production_data_guard.DataGuardError, "Unsafe manifest path"):
            production_data_guard.load_and_validate_manifest(snapshot)

    def test_interrupted_snapshot_removes_partial_output(self) -> None:
        def fail_backup(*args, **kwargs):
            raise production_data_guard.DataGuardError("injected interruption")

        with self.assertRaisesRegex(production_data_guard.DataGuardError, "injected interruption"):
            production_data_guard.create_snapshot(
                output_root=self.root / "failed-backups",
                config_db_url=self.config_url,
                default_db_url=self.default_url,
                backend_root=self.backend_root,
                operation_id="op-interrupted",
                backup_one=fail_backup,
            )
        leftovers = list((self.root / "failed-backups").glob("*"))
        self.assertEqual(leftovers, [])

    def test_migration_rehearsal_only_mutates_restored_databases(self) -> None:
        snapshot = self._snapshot()

        def fake_runner(command, *, cwd, env, capture_output, text, check):
            restored_path = production_data_guard.sqlite_path_from_url(
                env["SQLALCHEMY_DATABASE_URL"], backend_root=self.backend_root
            )
            with closing(sqlite3.connect(restored_path)) as connection:
                connection.execute("CREATE TABLE rehearsal_marker (id INTEGER)")
                connection.commit()
            return subprocess.CompletedProcess(command, 0, stdout="ok", stderr="")

        work_root = self.root / "migration-drill"
        result = production_data_guard.rehearse_migrations(
            snapshot_dir=snapshot,
            backend_root=self.backend_root,
            work_root=work_root,
            runner=fake_runner,
        )
        self.assertTrue(any(item["status"] == "passed" for item in result["results"]))
        for live_path in (self.default_db, self.tenant_db):
            with closing(sqlite3.connect(live_path)) as connection:
                marker = connection.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='rehearsal_marker'"
                ).fetchone()
            self.assertIsNone(marker)


    def test_missing_inactive_tenant_is_omitted_and_recorded(self) -> None:
        missing = self.root / "retired-missing.db"
        with closing(sqlite3.connect(self.config_db)) as connection:
            connection.execute(
                "INSERT INTO tenants(id, name, db_url, is_active) VALUES (?, ?, ?, ?)",
                (3, "Retired Tenant", production_data_guard.sqlite_url_for_path(missing), 0),
            )
            connection.commit()

        audit = production_data_guard.audit_registry(
            config_db_url=self.config_url,
            default_db_url=self.default_url,
            backend_root=self.backend_root,
        )
        self.assertEqual(audit["blocker_count"], 0)
        self.assertEqual(audit["omittable_inactive_count"], 1)

        databases = production_data_guard.discover_databases(
            config_db_url=self.config_url,
            default_db_url=self.default_url,
            backend_root=self.backend_root,
        )
        self.assertEqual(len(databases), 3)

        snapshot = self._snapshot()
        manifest_text = (snapshot / "manifest.json").read_text(encoding="utf-8")
        manifest = json.loads(manifest_text)
        self.assertEqual(manifest["omitted_inactive_count"], 1)
        omitted = manifest["omitted_inactive_databases"][0]
        self.assertEqual(omitted["state"], "inactive")
        self.assertEqual(omitted["database_filename"], "retired-missing.db")
        self.assertNotIn(str(missing.parent), manifest_text)
        production_data_guard.load_and_validate_manifest(snapshot)

    def test_missing_active_tenant_remains_a_hard_blocker(self) -> None:
        missing = self.root / "active-missing.db"
        with closing(sqlite3.connect(self.config_db)) as connection:
            connection.execute(
                "INSERT INTO tenants(id, name, db_url, is_active) VALUES (?, ?, ?, ?)",
                (3, "Active Missing", production_data_guard.sqlite_url_for_path(missing), 1),
            )
            connection.commit()

        audit = production_data_guard.audit_registry(
            config_db_url=self.config_url,
            default_db_url=self.default_url,
            backend_root=self.backend_root,
        )
        self.assertEqual(audit["blocker_count"], 1)
        with self.assertRaisesRegex(production_data_guard.DataGuardError, "state=active"):
            production_data_guard.discover_databases(
                config_db_url=self.config_url,
                default_db_url=self.default_url,
                backend_root=self.backend_root,
            )

    def test_legacy_registry_without_is_active_defaults_to_active(self) -> None:
        legacy = self.root / "legacy-config.db"
        with closing(sqlite3.connect(legacy)) as connection:
            connection.execute("CREATE TABLE tenants (id INTEGER PRIMARY KEY, name TEXT, db_url TEXT NOT NULL)")
            connection.execute(
                "INSERT INTO tenants(id, name, db_url) VALUES (?, ?, ?)",
                (1, "Legacy Tenant", production_data_guard.sqlite_url_for_path(self.tenant_db)),
            )
            connection.commit()
        inventory = production_data_guard.discover_database_inventory(
            config_db_url=production_data_guard.sqlite_url_for_path(legacy),
            default_db_url=self.default_url,
            backend_root=self.backend_root,
        )
        self.assertEqual(inventory["omitted_inactive"], [])
        tenant = next(item for item in inventory["databases"] if self.tenant_db.resolve() == item["source_path"])
        self.assertTrue(any(role.startswith("tenant-1-") for role in tenant["roles"]))

    def test_verified_test_residue_preview_and_apply_are_reversible(self) -> None:
        missing = self.root / "blank_slate_1785030000000-abc123.db"
        with closing(sqlite3.connect(self.config_db)) as connection:
            connection.execute(
                "INSERT INTO tenants(id, name, db_url, is_active) VALUES (?, ?, ?, ?)",
                (3, "Blank-Slate-1785030000000-abc123", production_data_guard.sqlite_url_for_path(missing), 1),
            )
            connection.commit()

        preview = production_data_guard.reconcile_test_residue(
            config_db_url=self.config_url,
            default_db_url=self.default_url,
            backend_root=self.backend_root,
            expected_candidate_count=1,
        )
        self.assertFalse(preview["applied"])
        self.assertEqual(preview["candidate_count"], 1)
        with closing(sqlite3.connect(self.config_db)) as connection:
            self.assertEqual(connection.execute("SELECT is_active FROM tenants WHERE id = 3").fetchone()[0], 1)

        result = production_data_guard.reconcile_test_residue(
            config_db_url=self.config_url,
            default_db_url=self.default_url,
            backend_root=self.backend_root,
            expected_candidate_count=1,
            evidence_root=self.root / "reconciliation-evidence",
            apply_token=production_data_guard.TEST_RESIDUE_APPLY_TOKEN,
            maintenance_token=production_data_guard.TEST_RESIDUE_MAINTENANCE_TOKEN,
        )
        self.assertTrue(result["applied"])
        self.assertEqual(result["deactivated_tenant_count"], 1)
        evidence_dir = Path(result["evidence_directory"])
        self.assertTrue((evidence_dir / "config-before.db").is_file())
        self.assertTrue((evidence_dir / "plan.json").is_file())
        self.assertTrue((evidence_dir / "result.json").is_file())
        with closing(sqlite3.connect(self.config_db)) as connection:
            self.assertEqual(connection.execute("SELECT is_active FROM tenants WHERE id = 3").fetchone()[0], 0)
        audit = production_data_guard.audit_registry(
            config_db_url=self.config_url,
            default_db_url=self.default_url,
            backend_root=self.backend_root,
        )
        self.assertEqual(audit["blocker_count"], 0)
        self.assertEqual(audit["omittable_inactive_count"], 1)

    def test_ambiguous_active_missing_tenant_blocks_test_residue_reconciliation(self) -> None:
        missing = self.root / "customer-production.db"
        with closing(sqlite3.connect(self.config_db)) as connection:
            connection.execute(
                "INSERT INTO tenants(id, name, db_url, is_active) VALUES (?, ?, ?, ?)",
                (3, "Customer Production", production_data_guard.sqlite_url_for_path(missing), 1),
            )
            connection.commit()

        plan = production_data_guard.build_test_residue_reconciliation_plan(
            config_db_url=self.config_url,
            default_db_url=self.default_url,
            backend_root=self.backend_root,
        )
        self.assertEqual(plan["candidate_count"], 0)
        self.assertEqual(plan["ambiguous_blocker_count"], 1)
        with self.assertRaisesRegex(production_data_guard.DataGuardError, "not proven test residue"):
            production_data_guard.reconcile_test_residue(
                config_db_url=self.config_url,
                default_db_url=self.default_url,
                backend_root=self.backend_root,
                expected_candidate_count=0,
                evidence_root=self.root / "should-not-exist",
                apply_token=production_data_guard.TEST_RESIDUE_APPLY_TOKEN,
                maintenance_token=production_data_guard.TEST_RESIDUE_MAINTENANCE_TOKEN,
            )
        with closing(sqlite3.connect(self.config_db)) as connection:
            self.assertEqual(connection.execute("SELECT is_active FROM tenants WHERE id = 3").fetchone()[0], 1)

    def test_reconciliation_candidate_count_must_match_exactly(self) -> None:
        missing = self.root / "switch_a_1785030000000-abc123.db"
        with closing(sqlite3.connect(self.config_db)) as connection:
            connection.execute(
                "INSERT INTO tenants(id, name, db_url, is_active) VALUES (?, ?, ?, ?)",
                (3, "Switch-A-1785030000000-abc123", production_data_guard.sqlite_url_for_path(missing), 1),
            )
            connection.commit()
        with self.assertRaisesRegex(production_data_guard.DataGuardError, "candidate count changed"):
            production_data_guard.reconcile_test_residue(
                config_db_url=self.config_url,
                default_db_url=self.default_url,
                backend_root=self.backend_root,
                expected_candidate_count=2,
            )

    def test_registered_unsupported_tenant_url_is_rejected(self) -> None:
        with closing(sqlite3.connect(self.config_db)) as connection:
            connection.execute(
                "UPDATE tenants SET db_url = 'postgresql://database.example/sysgrid' WHERE id = 2"
            )
            connection.commit()
        with self.assertRaisesRegex(production_data_guard.DataGuardError, "Only file-backed"):
            production_data_guard.discover_databases(
                config_db_url=self.config_url,
                default_db_url=self.default_url,
                backend_root=self.backend_root,
            )

    def test_unsupported_and_malformed_database_urls_are_rejected(self) -> None:
        with self.assertRaisesRegex(production_data_guard.DataGuardError, "Only file-backed"):
            production_data_guard.sqlite_path_from_url(
                "postgresql://database.example/sysgrid", backend_root=self.backend_root
            )
        with self.assertRaisesRegex(production_data_guard.DataGuardError, "query strings"):
            production_data_guard.sqlite_path_from_url(
                "sqlite:///tenant.db?mode=ro", backend_root=self.backend_root
            )

    def test_restore_refuses_nonempty_target(self) -> None:
        snapshot = self._snapshot()
        target = self.root / "nonempty"
        target.mkdir()
        (target / "keep.txt").write_text("do not overwrite", encoding="utf-8")
        with self.assertRaisesRegex(production_data_guard.DataGuardError, "must not contain existing files"):
            production_data_guard.restore_snapshot(snapshot_dir=snapshot, target_root=target)


if __name__ == "__main__":
    unittest.main()
