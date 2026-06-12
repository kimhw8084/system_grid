"""
Explicit bootstrap script for SysGrid.

This script provisions:
- config.db schema
- one tenant database file and its Alembic migrations
- one tenant registry row in config.db
- one user_tenant_access grant in config.db
- one admin role and one admin operator in the tenant DB

It intentionally does not seed fake business/domain data.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.models.config import ConfigBase, MasterSystemSetting, Tenant, UserTenantAccess
from app.models.models import Base, Operator, Role


BACKEND_DIR = Path(__file__).resolve().parent


def to_sync_sqlite_url(db_url: str) -> str:
    return db_url.replace("sqlite+aiosqlite", "sqlite")


def normalize_db_path(db_path: str) -> Path:
    path = Path(db_path).expanduser()
    if not path.is_absolute():
        path = (BACKEND_DIR / path).resolve()
    return path


def sqlite_async_url_from_path(db_path: Path) -> str:
    return f"sqlite+aiosqlite:///{db_path}"


def run_tenant_migrations(db_url: str) -> None:
    env = os.environ.copy()
    env["SQLALCHEMY_DATABASE_URL"] = db_url
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(BACKEND_DIR),
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "Alembic migration failed")


def ensure_config_schema() -> None:
    engine = create_engine(to_sync_sqlite_url(settings.CONFIG_DATABASE_URL), future=True)
    ConfigBase.metadata.create_all(engine)
    with Session(engine) as session:
        storage_root = session.execute(
            select(MasterSystemSetting).where(MasterSystemSetting.key == "tenant_storage_root")
        ).scalar_one_or_none()
        if not storage_root:
            session.add(MasterSystemSetting(
                key="tenant_storage_root",
                value=settings.TENANT_STORAGE_ROOT,
                description="Parent folder where tenant DBs are created",
            ))
            session.commit()


def register_tenant_and_access(*, tenant_name: str, tenant_db_url: str, admin_user: str, select_for_user: bool) -> None:
    engine = create_engine(to_sync_sqlite_url(settings.CONFIG_DATABASE_URL), future=True)
    with Session(engine) as session:
        tenant = session.execute(select(Tenant).where(Tenant.name == tenant_name)).scalar_one_or_none()
        if tenant:
            tenant.db_url = tenant_db_url
            tenant.is_active = True
        else:
            tenant = Tenant(name=tenant_name, db_url=tenant_db_url, is_active=True)
            session.add(tenant)
            session.flush()

        access = session.execute(
            select(UserTenantAccess).where(
                UserTenantAccess.user_id == admin_user,
                UserTenantAccess.tenant_id == tenant.id,
            )
        ).scalar_one_or_none()
        if not access:
            access = UserTenantAccess(user_id=admin_user, tenant_id=tenant.id, role="ADMIN", is_selected=False)
            session.add(access)

        if select_for_user:
            for row in session.execute(
                select(UserTenantAccess).where(UserTenantAccess.user_id == admin_user)
            ).scalars():
                row.is_selected = row.tenant_id == tenant.id

        session.commit()


def ensure_tenant_admin(*, tenant_db_url: str, admin_user: str, full_name: str | None, email: str | None, department: str | None) -> None:
    engine = create_engine(to_sync_sqlite_url(tenant_db_url), future=True)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        admin_role = session.execute(select(Role).where(Role.name == "Admin")).scalar_one_or_none()
        if not admin_role:
            admin_role = Role(name="Admin", permissions={"all": 3})
            session.add(admin_role)
            session.flush()

        operator = session.execute(select(Operator).where(Operator.username == admin_user)).scalar_one_or_none()
        derived_full_name = full_name or admin_user.replace(".", " ").replace("_", " ").title()
        derived_email = email or f"{admin_user}@{settings.DEFAULT_EMAIL_DOMAIN}"
        if operator:
            operator.external_id = admin_user
            operator.full_name = derived_full_name
            operator.email = derived_email
            operator.department = department
            operator.role_id = admin_role.id
            operator.registration_status = "Verified"
            operator.is_admin = True
            operator.custom_permissions = {"all": 3}
            if operator.teams is None:
                operator.teams = []
        else:
            session.add(Operator(
                external_id=admin_user,
                username=admin_user,
                full_name=derived_full_name,
                email=derived_email,
                department=department,
                role_id=admin_role.id,
                registration_status="Verified",
                is_admin=True,
                custom_permissions={"all": 3},
                teams=[],
            ))
        session.commit()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bootstrap one SysGrid tenant explicitly.")
    parser.add_argument("--interactive", action="store_true", help="Prompt for bootstrap values interactively")
    parser.add_argument("--tenant-name", default="Primary Tenant", help="Tenant display name to register in config.db")
    parser.add_argument(
        "--tenant-db",
        default="tenants/primary_tenant.db",
        help="SQLite file path for the tenant DB",
    )
    parser.add_argument("--admin-user", default="haewon.kim", help="Bootstrap admin username/external_id")
    parser.add_argument("--admin-full-name", default="Haewon Kim", help="Bootstrap admin full name")
    parser.add_argument("--admin-email", default="haewon.kim@sysgrid.local", help="Bootstrap admin email")
    parser.add_argument("--admin-department", default="Infrastructure", help="Bootstrap admin department")
    parser.add_argument("--no-select", action="store_true", help="Do not mark the tenant selected for the admin user")
    return parser.parse_args()


def prompt_with_default(label: str, default: str) -> str:
    entered = input(f"{label} [{default}]: ").strip()
    return entered or default


def apply_interactive_defaults(args: argparse.Namespace) -> argparse.Namespace:
    if not args.interactive:
        return args
    args.tenant_name = prompt_with_default("Tenant name", args.tenant_name)
    args.tenant_db = prompt_with_default("Tenant DB path", args.tenant_db)
    args.admin_user = prompt_with_default("Admin username", args.admin_user)
    args.admin_full_name = prompt_with_default("Admin full name", args.admin_full_name)
    args.admin_email = prompt_with_default("Admin email", args.admin_email)
    args.admin_department = prompt_with_default("Admin department", args.admin_department)
    return args


def main() -> int:
    args = apply_interactive_defaults(parse_args())
    tenant_db_path = normalize_db_path(args.tenant_db)
    tenant_db_path.parent.mkdir(parents=True, exist_ok=True)
    tenant_db_url = sqlite_async_url_from_path(tenant_db_path)

    ensure_config_schema()
    run_tenant_migrations(tenant_db_url)
    ensure_tenant_admin(
        tenant_db_url=tenant_db_url,
        admin_user=args.admin_user,
        full_name=args.admin_full_name,
        email=args.admin_email,
        department=args.admin_department,
    )
    register_tenant_and_access(
        tenant_name=args.tenant_name,
        tenant_db_url=tenant_db_url,
        admin_user=args.admin_user,
        select_for_user=not args.no_select,
    )

    print("BOOTSTRAP COMPLETE")
    print(f"tenant_name={args.tenant_name}")
    print(f"tenant_db={tenant_db_path}")
    print(f"admin_user={args.admin_user}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
