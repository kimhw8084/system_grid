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
import random
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
from app.models.config import ConfigBase, MasterSystemSetting, Tenant, UserTenantAccess, GlobalSetting
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
        # 1. Tenant Storage Root
        storage_root = session.execute(
            select(MasterSystemSetting).where(MasterSystemSetting.key == "tenant_storage_root")
        ).scalar_one_or_none()
        if not storage_root:
            session.add(MasterSystemSetting(
                key="tenant_storage_root",
                value=str(BACKEND_DIR / "tenants"),
                description="Parent folder where tenant DBs are created",
            ))
        
        # 2. Global UI Settings
        default_settings = [
            ("app_name", settings.DEFAULT_APP_NAME, "Infrastructure", "Main application title", True),
            ("org_name", settings.DEFAULT_ORG_NAME, "Infrastructure", "Organization name", True),
            ("ui_title", settings.DEFAULT_UI_TITLE, "UI", "Browser tab title", True),
            ("feature_guided_bkm", "true", "Experimental", "Enable Directive [06] logic", False),
        ]
        
        for key, val, cat, desc, public in default_settings:
            existing = session.execute(select(GlobalSetting).where(GlobalSetting.key == key)).scalar_one_or_none()
            if not existing:
                session.add(GlobalSetting(key=key, value=val, category=cat, description=desc, is_public=public))

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


def ensure_additional_admin_access(*, tenant_name: str, tenant_db_url: str, admin_users: list[str]) -> None:
    for user_id in admin_users:
        cleaned = (user_id or "").strip()
        if not cleaned:
            continue
        register_tenant_and_access(
            tenant_name=tenant_name,
            tenant_db_url=tenant_db_url,
            admin_user=cleaned,
            select_for_user=True,
        )

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


async def ensure_additional_admins_async(*, tenant_db_url: str, admin_users: list[str], department: str | None) -> None:
    for user_id in admin_users:
        cleaned = (user_id or "").strip()
        if not cleaned:
            continue
        await ensure_tenant_admin_async(
            tenant_db_url=tenant_db_url,
            admin_user=cleaned,
            full_name=cleaned.replace(".", " ").replace("_", " ").title(),
            email=f"{cleaned}@{settings.DEFAULT_EMAIL_DOMAIN}",
            department=department,
        )

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
    print(f"Seeding Mass Domain Data into {tenant_db_url}...")
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
        
        sites = [
            models.Site(name="HQ-01", address="123 Tech Way, Silicon Valley", color="#3b82f6"),
            models.Site(name="FAB-08", address="456 Industry Blvd, Austin", color="#10b981"),
            models.Site(name="DR-EAST", address="789 Backup Ln, Virginia", color="#f59e0b"),
        ]
        session.add_all(sites)
        await session.commit()

        # 2. Racks & Rooms (MASS)
        print(" -> Racks & Rooms (Mass Populating)")
        all_racks = []
        for site in sites:
            for r_idx in range(2):
                room = models.Room(site_id=site.id, name=f"Hall-{site.name}-{r_idx+1}", floor_level=f"{r_idx+1}F")
                session.add(room)
                await session.flush()
                for rack_idx in range(10):
                    rack = models.Rack(
                        room_id=room.id, 
                        name=f"{site.name}-R{rack_idx:02}", 
                        aisle=chr(65 + r_idx), 
                        row=f"{rack_idx:02}",
                        total_u_height=42
                    )
                    session.add(rack)
                    all_racks.append(rack)
        await session.commit()

        # 3. Assets (Golden Dossier + MASS)
        print(" -> Assets (Mass Populating ~150 devices)")
        systems = ["ERP", "FINANCE", "K8S-CLUSTER", "MANUFACTURING", "SECURITY", "BI-ANALYTICS"]
        types = ["Physical", "Virtual", "Storage", "Switch"]
        manufacturers = {
            "Physical": ["Dell", "HPE", "Cisco"],
            "Virtual": ["VMware", "AWS", "Nutanix"],
            "Storage": ["NetApp", "PureStorage"],
            "Switch": ["Arista", "Juniper"]
        }
        
        all_devices = []
        for i in range(150):
            sys_name = random.choice(systems)
            dev_type = random.choice(types)
            mfr = random.choice(manufacturers[dev_type])
            
            dev = models.Device(
                name=f"{sys_name}-{dev_type[:1]}-{i:03}",
                system=sys_name,
                type=dev_type,
                status=random.choice(["Active", "Provisioning", "Maintenance"]),
                environment=random.choice(["Production", "Staging", "Development"]),
                primary_ip=f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
                serial_number=f"SN-{random.getrandbits(32)}",
                asset_tag=f"AT-{i:05}",
                manufacturer=mfr,
                model="Gen-X" if dev_type == "Physical" else "vNode-Pro",
                os_name="Linux" if i % 2 == 0 else "Windows",
                os_version="Standard"
            )
            session.add(dev)
            await session.flush()
            all_devices.append(dev)
            
            # Place ~50% of devices in racks
            if i % 2 == 0:
                rack = random.choice(all_racks)
                session.add(models.DeviceLocation(
                    device_id=dev.id, rack_id=rack.id, 
                    start_unit=random.randint(1, 35), size_u=random.randint(1, 4)
                ))
        
        await session.commit()
        
        # 4. Monitoring (MASS)
        print(" -> Monitoring (30 scenarios)")
        monitored_keys = set()
        for i in range(30):
            dev = random.choice(all_devices)
            title = random.choice(['CPU High', 'Latency Spike', 'Disk Full', 'Auth Error'])
            category = random.choice(["Hardware", "Application", "Network", "Synthetic"])
            platform = random.choice(["Zabbix", "Prometheus", "Datadog"])
            
            key = (dev.id, title, category, platform)
            if key in monitored_keys:
                continue
            monitored_keys.add(key)
            
            mon = models.MonitoringItem(
                device_id=dev.id,
                category=category,
                status=random.choice(["Existing", "Planned", "Active"]),
                title=f"{dev.name}: {title}",
                severity=random.choice(["Critical", "Warning", "Informational"]),
                platform=platform,
                is_active=True,
                impact="Potential service degradation",
                logic_json=[{"id": 1, "type": "Threshold", "description": "Auto-generated", "logic_info": "> 80%"}]
            )
            session.add(mon)
        await session.commit()

        # 5. Strategic Projects (MASS)
        print(" -> Projects (5 Projects, 200+ Tasks)")
        for p_idx in range(5):
            proj = models.Project(
                name=f"Mass Initiative {p_idx+1}: {random.choice(['Migration', 'Upgrade', 'Audit', 'Expansion'])}",
                type=random.choice(["Strategic", "Tactical", "Maintenance"]),
                status="In Progress",
                priority=random.choice(["High", "Medium", "Low"]),
                start_date=datetime.now() - timedelta(days=random.randint(1, 60)),
                end_date=datetime.now() + timedelta(days=random.randint(30, 180)),
                owner="haewon.kim",
                target_systems=[random.choice(systems)]
            )
            session.add(proj)
            await session.flush()
            
            for t_idx in range(40):
                task = models.ProjectTask(
                    project_id=proj.id,
                    name=f"Task {t_idx+1}: {random.choice(['Analyze', 'Implement', 'Verify', 'Document'])} Module {t_idx}",
                    status=random.choice(["To Do", "In Progress", "Completed"]),
                    progress=random.randint(0, 100),
                    owner=random.choice(["Infrastructure", "Network", "Database"])
                )
                session.add(task)
        await session.commit()

        # 6. Data Flows
        print(" -> Topology Maps")
        flow = models.DataFlow(
            name="Mass Fleet Overview", category="System", status="Up to date",
            nodes_json=[
                {"id": f"n{i}", "type": "device", "position": {"x": i*50, "y": 100}, "data": {"name": d.name, "id": d.id}}
                for i, d in enumerate(all_devices[:10])
            ],
            edges_json=[
                {"id": f"e{i}", "source": f"n{i}", "target": f"n{i+1}", "type": "labeled", "data": {"label": "Link"}}
                for i in range(9)
            ]
        )
        session.add(flow)
        await session.commit()

    print("MASS DOMAIN SEEDING COMPLETE.")
    await engine.dispose()

# --- MAIN LOOP ---

async def main():
    parser = argparse.ArgumentParser(description="Ultimate SysGrid Seeder")
    parser.add_argument("--tenant-name", default="Local Demo")
    parser.add_argument("--tenant-db", default="tenants/local-demo/local_demo.db")
    parser.add_argument("--admin-user", default="haewon.kim")
    parser.add_argument("--extra-admin-user", action="append", default=[], help="Additional user ids to grant admin access and select for this tenant")
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
    ensure_additional_admin_access(
        tenant_name=args.tenant_name,
        tenant_db_url=tenant_db_url,
        admin_users=args.extra_admin_user,
    )
    await ensure_additional_admins_async(
        tenant_db_url=tenant_db_url,
        admin_users=args.extra_admin_user,
        department="Infrastructure",
    )

    if args.seed_data:
        await seed_domain_data(tenant_db_url)

    print("\nSUCCESS: Environment Ready.")
    print(f"Tenant: {args.tenant_name}")
    print(f"DB Path: {tenant_db_path}")
    print(f"Admin: {args.admin_user}")
    if args.extra_admin_user:
        print(f"Extra Admins: {', '.join(args.extra_admin_user)}")

if __name__ == "__main__":
    asyncio.run(main())
