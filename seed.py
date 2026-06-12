"""
Ultimate SysGrid Seeder (Refined & Perfected)

This script handles:
1. System Bootstrapping: config.db, tenant registration, and admin creation.
2. Domain Data Seeding: A high-fidelity production environment for UI testing.

Usage:
  ./backend/venv/bin/python seed.py --tenant-name "Local Demo" --seed-data
"""

from __future__ import annotations
import argparse
import os
import subprocess
import sys
import asyncio
from pathlib import Path
from datetime import datetime, timedelta

from sqlalchemy import create_engine, select, delete
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Setup paths
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.models.config import ConfigBase, MasterSystemSetting, Tenant, UserTenantAccess
from app.models import models
from app.models.models import Base, Operator, Role

# --- UTILITIES ---

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
    print(f"Running migrations for {db_url}...")
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
        print(f"Migration Error: {result.stderr.strip()}")

# --- BOOTSTRAP LOGIC ---

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
                value=str(BACKEND_DIR / "tenants"),
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
            # Deselect others for this user
            session.execute(
                UserTenantAccess.__table__.update()
                .where(UserTenantAccess.user_id == admin_user)
                .values(is_selected=False)
            )
            access.is_selected = True

        session.commit()

async def ensure_tenant_admin_async(*, tenant_db_url: str, admin_user: str, full_name: str | None, email: str | None, department: str | None) -> None:
    engine = create_async_engine(tenant_db_url)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        res_role = await session.execute(select(Role).where(Role.name == "Admin"))
        admin_role = res_role.scalar_one_or_none()
        if not admin_role:
            admin_role = Role(name="Admin", permissions={"all": 3})
            session.add(admin_role)
            await session.flush()

        res_op = await session.execute(select(Operator).where(Operator.username == admin_user))
        operator = res_op.scalar_one_or_none()
        
        derived_full_name = full_name or admin_user.replace(".", " ").replace("_", " ").title()
        derived_email = email or f"{admin_user}@{settings.DEFAULT_EMAIL_DOMAIN}"
        
        if operator:
            operator.full_name = derived_full_name
            operator.email = derived_email
            operator.department = department
            operator.role_id = admin_role.id
            operator.is_admin = True
        else:
            session.add(Operator(
                external_id=admin_user,
                username=admin_user,
                full_name=derived_full_name,
                email=derived_email,
                department=department,
                role_id=admin_role.id,
                is_admin=True,
                registration_status="Verified"
            ))
        await session.commit()
    await engine.dispose()

# --- DOMAIN DATA SEEDING (PERFECTED) ---

async def clear_domain_data(session: AsyncSession):
    print("Clearing domain data...")
    # Order matters for foreign keys
    tables = [
        models.ProjectTask, models.Project, models.RcaTimelineEvent, models.RcaMitigation, models.RcaRecord,
        models.FarPrevention, models.FarMitigation, models.FarResolution, models.FarFailureCause, models.FarFailureMode,
        models.MonitoringItem, models.KnowledgeEntry, models.LogicalService, models.PortConnection,
        models.DeviceLocation, models.Device, models.Rack, models.Room, models.Site,
        models.VendorContract, models.VendorPersonnel, models.Vendor, models.Team
    ]
    for table in tables:
        await session.execute(delete(table))
    await session.commit()

async def seed_domain_data(tenant_db_url: str):
    print(f"Seeding Domain Data into {tenant_db_url}...")
    engine = create_async_engine(tenant_db_url)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        await clear_domain_data(session)

        # 1. Teams & Org Structure
        print(" -> Teams & Sites")
        teams = [
            models.Team(name="Infrastructure", description="Core Platform Engineering"),
            models.Team(name="Network Operations", description="Global Connectivity & Security"),
            models.Team(name="Database Admin", description="Persistence & Performance"),
            models.Team(name="Manufacturing IT", description="Cleanroom & Automation Support"),
        ]
        session.add_all(teams)
        
        site_hq = models.Site(name="HQ-01", address="123 Tech Way, Silicon Valley", color="#3b82f6")
        site_fab = models.Site(name="FAB-08", address="456 Industry Blvd, Austin", color="#10b981")
        session.add_all([site_hq, site_fab])
        await session.commit()

        # 2. Racks & Rooms
        room_hq = models.Room(site_id=site_hq.id, name="Server Room A", floor_level="B1")
        room_fab = models.Room(site_id=site_fab.id, name="Data Hall 01", floor_level="1F")
        session.add_all([room_hq, room_fab])
        await session.commit()

        rack_hq = models.Rack(room_id=room_hq.id, name="HQ-RACK-01", aisle="A1", row="01")
        rack_fab = models.Rack(room_id=room_fab.id, name="FAB-RACK-42", aisle="F1", row="42")
        session.add_all([rack_hq, rack_fab])
        await session.commit()

        # 3. Assets (Golden Dossier)
        print(" -> Assets & Services")
        lb = models.Device(
            name="LB-EDGE-01", system="EDGE-NETWORK", type="Virtual", status="Active", environment="Production",
            primary_ip="10.0.1.5", serial_number="SN-LB-01", asset_tag="AT-LB-01",
            manufacturer="F5", model="BIG-IP VE", os_name="TMOS", os_version="17.1",
            logic_json=[{
                "id": "l1", "name": "INGRESS", "upstream_ids": [], "controller": "NGINX_LISTENER",
                "steps": ["SSL TERM", "WAF"], "downstream_ids": ["APP-SRV-01"]
            }]
        )
        app = models.Device(
            name="APP-SRV-01", system="ERP-CORE", type="Physical", status="Active", environment="Production",
            primary_ip="10.0.2.10", serial_number="SN-APP-01", asset_tag="AT-APP-01",
            manufacturer="Dell", model="R750", os_name="Ubuntu", os_version="22.04",
            logic_json=[{
                "id": "l2", "name": "API_V1", "upstream_ids": ["LB-EDGE-01"], "controller": "FASTAPI",
                "steps": ["AUTH", "BUSINESS_LOGIC"], "downstream_ids": ["DB-PROD-01"]
            }]
        )
        db = models.Device(
            name="DB-PROD-01", system="ERP-DATA", type="Physical", status="Active", environment="Production",
            primary_ip="10.0.10.100", serial_number="SN-DB-01", asset_tag="AT-DB-01",
            manufacturer="HPE", model="DL380", os_name="RHEL", os_version="9.2"
        )
        session.add_all([lb, app, db])
        await session.commit()
        
        # Placements
        session.add(models.DeviceLocation(device_id=app.id, rack_id=rack_hq.id, start_unit=10, size_u=2))
        session.add(models.DeviceLocation(device_id=db.id, rack_id=rack_fab.id, start_unit=5, size_u=2))
        await session.commit()

        # 4. Monitoring & BKMs
        print(" -> Monitoring & Knowledge")
        bkm = models.KnowledgeEntry(
            category="BKM", title="High CPU Triage - DB Node", 
            content="Standard procedure for handling database load spikes.",
            content_json={"steps": [{"title": "Check Locks", "description": "Run pg_stat_activity"}]},
            tags=["Emergency", "DB"]
        )
        session.add(bkm)
        await session.commit()

        mon = models.MonitoringItem(
            device_id=db.id, category="Hardware", status="Existing", title="DB-PROD-01: CPU > 90%",
            severity="Critical", platform="Zabbix", purpose="Resource stability",
            impact="Global ERP Hang", logic_json=[{"id": 1, "type": "Threshold", "description": "CPU", "logic_info": ">90%"}],
            recovery_docs=[{"id": bkm.id}]
        )
        session.add(mon)
        await session.commit()

        # 5. Reliability (FAR & RCA)
        print(" -> Reliability Matrix (FAR/RCA)")
        far = models.FarFailureMode(
            system_name="ERP-DATA", title="Connection Pool Exhaustion",
            failure_type="Operational", effect="504 Gateway Timeouts",
            severity=9, occurrence=3, detection=4, rpn=108, status="Mitigated"
        )
        session.add(far)
        await session.commit()

        rca = models.RcaRecord(
            title="ERP Outage - Connection Leak", problem_statement="System hang for 45m",
            severity="P1", status="Resolved", occurrence_at=datetime.now() - timedelta(days=2),
            owner="haewon.kim", target_systems=["ERP-CORE", "ERP-DATA"],
            cause_of_failure="Async loop failed to release sessions."
        )
        session.add(rca)
        await session.commit()

        # 6. Strategic Projects
        print(" -> Projects & Tasks")
        proj = models.Project(
            name="ERP Modernization 2026", type="Strategic", status="In Progress", priority="High",
            start_date=datetime.now() - timedelta(days=30), end_date=datetime.now() + timedelta(days=120),
            owner="haewon.kim", target_systems=["ERP-CORE"], objective="Migrate to Hybrid-Cloud architecture."
        )
        session.add(proj)
        await session.commit()
        
        session.add(models.ProjectTask(project_id=proj.id, name="Finalize Cloud Specs", status="Completed", progress=100))
        session.add(models.ProjectTask(project_id=proj.id, name="Provision Edge Gateway", status="In Progress", progress=40))
        await session.commit()

        # 7. Data Flows
        print(" -> Topology Maps")
        flow = models.DataFlow(
            name="ERP Core Topology", category="System", status="Up to date",
            nodes_json=[
                {"id": "n1", "type": "device", "position": {"x": 100, "y": 200}, "data": {"name": "LB-EDGE-01", "id": lb.id}},
                {"id": "n2", "type": "device", "position": {"x": 400, "y": 200}, "data": {"name": "APP-SRV-01", "id": app.id}},
                {"id": "n3", "type": "device", "position": {"x": 700, "y": 200}, "data": {"name": "DB-PROD-01", "id": db.id}},
            ],
            edges_json=[
                {"id": "e1", "source": "n1", "target": "n2", "type": "labeled", "data": {"label": "HTTPS"}},
                {"id": "e2", "source": "n2", "target": "n3", "type": "labeled", "data": {"label": "SQL"}}
            ]
        )
        session.add(flow)
        await session.commit()

    print("DOMAIN SEEDING COMPLETE.")
    await engine.dispose()

# --- MAIN LOOP ---

async def main():
    parser = argparse.ArgumentParser(description="Ultimate SysGrid Seeder")
    parser.add_argument("--tenant-name", default="Local Demo")
    parser.add_argument("--tenant-db", default="tenants/local-demo/local_demo.db")
    parser.add_argument("--admin-user", default="haewon.kim")
    parser.add_argument("--seed-data", action="store_true", help="Seed full domain data")
    args = parser.parse_args()

    tenant_db_path = normalize_db_path(args.tenant_db)
    tenant_db_path.parent.mkdir(parents=True, exist_ok=True)
    tenant_db_url = sqlite_async_url_from_path(tenant_db_path)

    print(f"--- Bootstrapping {args.tenant_name} ---")
    ensure_config_schema()
    run_tenant_migrations(tenant_db_url)
    register_tenant_and_access(
        tenant_name=args.tenant_name,
        tenant_db_url=tenant_db_url,
        admin_user=args.admin_user,
        select_for_user=True
    )
    await ensure_tenant_admin_async(
        tenant_db_url=tenant_db_url,
        admin_user=args.admin_user,
        full_name=None, email=None, department="Infrastructure"
    )

    if args.seed_data:
        await seed_domain_data(tenant_db_url)

    print("\nSUCCESS: Environment Ready.")
    print(f"Tenant: {args.tenant_name}")
    print(f"DB Path: {tenant_db_path}")
    print(f"Admin: {args.admin_user}")

if __name__ == "__main__":
    asyncio.run(main())
