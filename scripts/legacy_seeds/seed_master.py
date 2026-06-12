import asyncio
import os
import sys
from datetime import datetime, timedelta

# Add backend to sys.path
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, delete
from app.models import models
from app.core.config import settings

# Use the correct database URL from your config, prioritizing env var
DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def clear_data(session: AsyncSession):
    print("Clearing existing domain data for fresh seed...")
    # Order matters for foreign keys
    await session.execute(delete(models.ProjectTask))
    await session.execute(delete(models.Project))
    await session.execute(delete(models.RcaTimelineEvent))
    await session.execute(delete(models.RcaMitigation))
    await session.execute(delete(models.RcaRecord))
    await session.execute(delete(models.FarPrevention))
    await session.execute(delete(models.FarMitigation))
    await session.execute(delete(models.FarResolution))
    await session.execute(delete(models.FarFailureCause))
    await session.execute(delete(models.FarFailureMode))
    await session.execute(delete(models.MonitoringItem))
    await session.execute(delete(models.KnowledgeEntry))
    await session.execute(delete(models.LogicalService))
    await session.execute(delete(models.PortConnection))
    await session.execute(delete(models.DeviceLocation))
    await session.execute(delete(models.Device))
    await session.execute(delete(models.Rack))
    await session.execute(delete(models.Room))
    await session.execute(delete(models.Site))
    await session.execute(delete(models.VendorContract))
    await session.execute(delete(models.VendorPersonnel))
    await session.execute(delete(models.Vendor))
    await session.execute(delete(models.Team))
    await session.commit()

async def seed_master_data():
    async with AsyncSessionLocal() as session:
        await clear_data(session)

        print("Seeding Teams...")
        teams = [
            models.Team(name="Infrastructure", description="Core infrastructure management"),
            models.Team(name="Network Operations", description="Network stability and security"),
            models.Team(name="Database Admin", description="Database performance and integrity"),
            models.Team(name="Manufacturing IT", description="Support for fab-area systems"),
        ]
        session.add_all(teams)
        await session.commit()

        print("Seeding Sites, Rooms, and Racks...")
        site_hq = models.Site(name="HQ-01", address="123 Tech Way, Silicon Valley", color="#3b82f6")
        site_fab = models.Site(name="FAB-08", address="456 Industry Blvd, Austin", color="#10b981")
        session.add_all([site_hq, site_fab])
        await session.commit()

        room_hq = models.Room(site_id=site_hq.id, name="Server Room A", floor_level="B1")
        room_fab = models.Room(site_id=site_fab.id, name="Cleanroom Data Hall", floor_level="1F")
        session.add_all([room_hq, room_fab])
        await session.commit()

        racks = [
            models.Rack(room_id=room_hq.id, name="HQ-RACK-01", aisle="A1", row="01"),
            models.Rack(room_id=room_hq.id, name="HQ-RACK-02", aisle="A1", row="02"),
            models.Rack(room_id=room_fab.id, name="FAB-RACK-01", aisle="F1", row="01"),
        ]
        session.add_all(racks)
        await session.commit()

        print("Seeding Devices (Golden Dossier Standard)...")
        # LB Edge Ingress
        lb_01 = models.Device(
            name="LB-EDGE-01", system="EDGE-NETWORK", type="Virtual", status="Active", environment="Production",
            primary_ip="10.0.1.5", serial_number="SN-LB-01", asset_tag="AT-LB-01",
            manufacturer="F5", model="BIG-IP VE", os_name="TMOS", os_version="17.1",
            business_unit="Core Infra", owner="Infrastructure Team",
            logic_json=[{
                "id": "logic-lb-1", "name": "EDGE_INGRESS", "upstream_ids": [], "controller": "NGINX_LISTENER_443",
                "steps": ["SSL Termination", "WAF Inspection", "L7 Routing"],
                "state": "Session Persistence", "downstream_ids": ["APP-SRV-01", "APP-SRV-02"]
            }]
        )
        # App Server 01
        app_01 = models.Device(
            name="APP-SRV-01", system="ERP-CORE", type="Physical", status="Active", environment="Production",
            primary_ip="10.0.2.10", serial_number="SN-APP-01", asset_tag="AT-APP-01",
            manufacturer="Dell", model="PowerEdge R750", os_name="Ubuntu", os_version="22.04 LTS",
            business_unit="ERP", owner="Manufacturing IT",
            logic_json=[{
                "id": "logic-web-1", "name": "API_HANDLER", "upstream_ids": ["LB-EDGE-01"], "controller": "FastAPI/Uvicorn",
                "steps": ["Auth Validation", "Business Logic", "DB Query"],
                "state": "Request Context", "downstream_ids": ["DB-PROD-01"]
            }]
        )
        # Database Primary
        db_01 = models.Device(
            name="DB-PROD-01", system="ERP-DATA", type="Physical", status="Active", environment="Production",
            primary_ip="10.0.10.100", serial_number="SN-DB-01", asset_tag="AT-DB-01",
            manufacturer="HPE", model="ProLiant DL380 Gen11", os_name="RHEL", os_version="9.2",
            business_unit="ERP", owner="Database Admin"
        )
        session.add_all([lb_01, app_01, db_01])
        await session.commit()

        # Place devices in racks
        session.add(models.DeviceLocation(device_id=app_01.id, rack_id=racks[0].id, start_unit=10, size_u=2))
        session.add(models.DeviceLocation(device_id=db_01.id, rack_id=racks[2].id, start_unit=5, size_u=2))
        await session.commit()

        print("Seeding Knowledge Base (BKMs)...")
        bkm_db_triage = models.KnowledgeEntry(
            category="BKM", title="ERP Database High Load Triage", 
            content="Standard procedure for diagnosing and mitigating high load on ERP production databases.",
            content_json={
                "purpose": "Restore DB stability during traffic spikes or locking issues.",
                "steps": [
                    {"title": "Check Active Sessions", "description": "Run pg_stat_activity to find long-running queries."},
                    {"title": "Identify Locks", "description": "Check for heavy RowExclusiveLocks that block reads."},
                    {"title": "Kill rogue PIDs", "description": "Terminate sessions that have been active for > 600s."}
                ]
            },
            tags=["Database", "ERP", "Emergency"],
            impacted_systems=["ERP-DATA"]
        )
        session.add(bkm_db_triage)
        await session.commit()

        print("Seeding Monitoring Items...")
        mon_db_cpu = models.MonitoringItem(
            device_id=db_01.id, category="Hardware", status="Existing", title="DB-PROD-01: CPU Critical",
            severity="Critical", platform="Zabbix", is_active=True,
            purpose="Monitor DB compute resources to prevent transaction timeouts.",
            impact="High CPU on DB leads to global ERP application hang.",
            logic_json=[{"id": 1, "type": "Threshold", "description": "CPU Usage", "logic_info": "avg(system.cpu.util) > 90 for 5m"}],
            recovery_docs=[{"id": bkm_db_triage.id, "note": "Follow standard DB triage BKM"}]
        )
        session.add(mon_db_cpu)
        await session.commit()

        print("Seeding FAR (Failure Analysis & Reliability)...")
        far_db_contention = models.FarFailureMode(
            system_name="ERP-DATA", title="Database Connection Pool Exhaustion",
            failure_type="Operational", effect="API servers cannot connect to DB, resulting in 504 Gateway Timeouts for users.",
            severity=9, occurrence=3, detection=4, rpn=108, status="Mitigated"
        )
        session.add(far_db_contention)
        await session.commit()
        
        cause_app_leak = models.FarFailureCause(
            cause_text="Application code failing to close DB connections in async loops.",
            occurrence_level=3, responsible_team="Manufacturing IT"
        )
        session.add(cause_app_leak)
        await session.commit()
        
        # Link Cause to Mode
        await session.execute(models.far_mode_causes.insert().values(mode_id=far_db_contention.id, cause_id=cause_app_leak.id))
        
        mit_auto_kill = models.FarMitigation(
            mitigation_type="Process Change", status="Completed", responsible_team="Database Admin",
            mitigation_steps="Implemented server-side idle_in_transaction_session_timeout = 5min.",
            cause_id=cause_app_leak.id
        )
        session.add(mit_auto_kill)
        await session.commit()

        print("Seeding RCA Records...")
        rca_june_outage = models.RcaRecord(
            title="ERP Global Outage - June 10", 
            problem_statement="Entire ERP system unresponsive for 45 minutes.",
            severity="P1", status="Resolved", occurrence_at=datetime.now() - timedelta(days=2),
            detection_at=datetime.now() - timedelta(days=2, minutes=40),
            owner="haewon.kim", target_systems=["ERP-CORE", "ERP-DATA"],
            cause_of_failure="Connection pool exhaustion triggered by unoptimized reporting query.",
            narrative_summary="At 14:00, LB errors spiked. Investigation showed DB-PROD-01 at max connections. Root cause identified as a new PowerBI report query lack of indexing."
        )
        session.add(rca_june_outage)
        await session.commit()

        print("Seeding Projects...")
        proj_migration = models.Project(
            name="ERP Cloud Migration Phase 1", 
            description="Migrating core ERP middleware to hybrid cloud for improved scalability.",
            type="Strategic", status="In Progress", priority="High",
            start_date=datetime.now() - timedelta(days=30),
            end_date=datetime.now() + timedelta(days=60),
            owner="haewon.kim", target_systems=["ERP-CORE"],
            objective="Reduce on-prem hardware footprint and enable auto-scaling for traffic spikes."
        )
        session.add(proj_migration)
        await session.commit()

        task_1 = models.ProjectTask(
            project_id=proj_migration.id, name="Audit existing LB configs",
            status="Completed", progress=100, owner="Network Operations",
            start_date=datetime.now() - timedelta(days=25),
            end_date=datetime.now() - timedelta(days=20)
        )
        task_2 = models.ProjectTask(
            project_id=proj_migration.id, name="Provision Cloud-Native LB",
            status="In Progress", progress=45, owner="Infrastructure",
            start_date=datetime.now() - timedelta(days=15),
            end_date=datetime.now() + timedelta(days=5)
        )
        session.add_all([task_1, task_2])
        await session.commit()

        print("Seeding Data Flows...")
        flow_erp = models.DataFlow(
            name="ERP Global Production Topology", category="System", status="Up to date",
            description="Primary data path for ERP transactions.",
            nodes_json=[
                {"id": "node-lb", "type": "device", "position": {"x": 100, "y": 200}, "data": {"name": "LB-EDGE-01", "id": lb_01.id}},
                {"id": "node-app", "type": "device", "position": {"x": 400, "y": 200}, "data": {"name": "APP-SRV-01", "id": app_01.id}},
                {"id": "node-db", "type": "device", "position": {"x": 700, "y": 200}, "data": {"name": "DB-PROD-01", "id": db_01.id}},
            ],
            edges_json=[
                {"id": "e1", "source": "node-lb", "target": "node-app", "type": "labeled", "data": {"label": "HTTPS/443"}},
                {"id": "e2", "source": "node-app", "target": "node-db", "type": "labeled", "data": {"label": "SQL/5432"}},
            ]
        )
        session.add(flow_erp)
        await session.commit()

        print("MASTER SEEDING COMPLETE.")

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.getcwd())
    asyncio.run(seed_master_data())
