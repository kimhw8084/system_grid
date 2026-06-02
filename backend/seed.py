"""
ULTIMATE HIGH-FIDELITY SEED SCRIPT - v3 (The Chaos & Order Edition)
"""

import os
import sys
import random
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from faker import Faker

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.models.models import (
    Site, Room, Rack, Device, DeviceLocation, HardwareComponent,
    DeviceSoftware, NetworkInterface, Subnet, PortConnection,
    DeviceRelationship, LogicalService, ServiceSecret, SecretVault,
    MaintenanceWindow, MonitoringItem, MonitoringOwner, IncidentLog, DataFlow,
    AuditLog, SettingOption, GlobalSetting, FirewallRule, ExternalEntity, ExternalLink,
    Vendor, VendorPersonnel, VendorContract, KnowledgeEntry,
    Investigation, InvestigationProgress,
    FarFailureMode, FarFailureCause, FarResolution, FarMitigation, FarPrevention,
    RcaRecord, RcaTimelineEvent, RcaMitigation,
    Project, ProjectTask, ProjectComment, ProjectQA,
    Role, Operator, UserPreference, ExternalEntitySecret, MonitoringHistory,
    EnvHistory, UserPoolVersion
)

DATABASE_URL = settings.DATABASE_URL
# Strip the driver prefix and leading slashes for os.path operations if it's sqlite
if DATABASE_URL.startswith("sqlite+aiosqlite:///"):
    DB_PATH = DATABASE_URL.replace("sqlite+aiosqlite:///", "")
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "system_grid.db")

engine = create_engine(DATABASE_URL.replace("sqlite+aiosqlite", "sqlite"), echo=False)
fake = Faker()

def seed():
    try:
        # Ensure the directory exists
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

        # Robust cleanup of SQLite files
        for ext in ["", "-wal", "-shm"]:
            path = DB_PATH + ext
            if os.path.exists(path):
                os.remove(path)
                print(f"CLEANUP: Deleted {path}")

        from alembic.config import Config as AlembicConfig
        from alembic import command as alembic_command
        alembic_cfg = AlembicConfig(os.path.join(os.path.dirname(__file__), "alembic.ini"))
        alembic_command.upgrade(alembic_cfg, "head")

        with Session(engine) as db:
            # 1. SettingOptions
            cats = {
                "LogicalSystem": ["SAP-PROD", "K8S-CLUSTER-01", "LEGACY-ERP", "FIN-CORE", "HR-PEOPLE", "GLOBAL-DNS", "AI-TRAINING-01", "BI-ANALYTICS"],
                "DeviceType": ["Physical", "Virtual", "Switch", "Firewall", "Load Balancer", "Storage", "PDU", "UPS", "Console-Server", "Patch Panel"],
                "Status": ["Planned", "Active", "Maintenance", "Standby", "Failed", "Decommissioned", "Provisioning", "Reserved"],
                "Environment": ["Production", "Staging", "QA", "Dev", "DR", "Lab", "Sandbox", "Legacy"],
                "BusinessUnit": ["Operations", "Finance", "Security", "Engineering", "R&D", "Marketing"],
                "LinkPurpose": ["Data", "Management", "Storage/iSCSI", "Backup", "vMotion", "Replication", "Heartbeat", "Stacking"],
                "MonitoringCategory": ["Infrastructure", "Log", "Network", "Application", "Synthetic"],
                "MonitoringSeverity": ["Critical", "Warning", "Info"],
                "NotificationMethod": ["Email", "Slack", "Teams", "PagerDuty", "Webhook"],
                "MonitoringOwnerRole": ["Primary Support", "Secondary Support", "Business Owner", "Notification Subscriber"],
                "IncidentType": ["Network Outage", "Database Failure", "Application Crash", "Security Incident", "Hardware Fault", "Performance Degradation"],
                "DetectionType": ["Automated Alert", "Manual Observation", "Customer Report", "Log Analysis", "Security Scanner", "External Intelligence"],
                "ImpactType": ["Service Unavailable", "Data Loss", "Performance Degradation", "Internal Only", "Regulatory Non-compliance"],
                "EventType": ["Detection", "Investigation", "Mitigation", "Resolution", "Post-Mortem", "Communication"],
                "VendorCountry": ["South Korea", "USA", "Japan", "Germany", "Taiwan", "Netherlands"],
                "ProjectType": ["Strategic", "Tactical", "Operational", "Research"]
            }
            for cat, vals in cats.items():
                for v in vals:
                    db.add(SettingOption(category=cat, label=v, value=v, description=f"Standard {cat} entry: {v}"))
            
            external_types = [
                ("Equipment", ["manufacturer", "model", "os", "serial_number", "purpose"]),
                ("Physical Server", ["rack_id", "unit_position", "cpu", "ram", "os", "warranty_end"]),
                ("Virtual Server", ["hypervisor", "vcpu", "vram", "os", "storage_gb"]),
                ("Switch", ["management_url", "ports", "firmware", "vlans"]),
                ("Storage", ["capacity_tb", "raid_level", "controller", "volume_name"]),
                ("DB", ["engine", "port", "instance_name", "schema_count", "max_connections"]),
                ("API", ["base_url", "auth_type", "documentation_link", "version"]),
                ("Script", ["runtime", "path", "schedule", "owner"])
            ]
            for val, keys in external_types:
                db.add(SettingOption(category="ExternalType", label=val, value=val, metadata_keys=keys))

            service_types = [
                ("Database", ["engine", "instance_name", "port", "sid", "collation", "always_on", "data_path", "backup_policy"]),
                ("Web API", ["server_type", "url", "bindings", "app_pool", "ssl_expiry", "root_path"]),
                ("Auth Service", ["protocol", "domain", "key_rotation", "mfa_enabled"]),
                ("Middleware", ["platform", "queue_names", "max_consumers", "heartbeat_interval"]),
                ("Storage Hub", ["volume_id", "protocol", "iops", "encryption_status", "tier"])
            ]
            for val, keys in service_types:
                db.add(SettingOption(category="ServiceType", label=val, value=val, metadata_keys=keys))
            
            # 1b. Global Settings
            global_defaults = [
                ('VITE_APP_TITLE', 'SYSGRID Tactical', 'General', True),
                ('VITE_POLLING_INTERVAL', '5000', 'Infrastructure', True),
                ('VITE_ENABLE_WEBSOCKETS', 'true', 'Infrastructure', True),
                ('VITE_THEME_DEFAULT', 'nordic-frost-v1', 'UI', True),
                ('VITE_UI_TIMEOUT', '30000', 'Infrastructure', True),
                ('VITE_MAX_GRID_ROWS', '100', 'UI', True),
                ('PORT', '8000', 'Infrastructure', True),
                ('API_ENDPOINT', '/api/v1', 'Infrastructure', True),
                ('ENVIRONMENT', 'production', 'General', False)
            ]
            for key, val, cat, public in global_defaults:
                db.add(GlobalSetting(key=key, value=val, category=cat, is_public=public))
                
            db.flush()

            # 2. Infrastructure
            site = Site(
                name="TX-AUSTIN-01", 
                address="100 Silicon Way, Austin, TX", 
                facility_manager="Sarah Connor",
                contact_phone="512-555-0100",
                cooling_capacity_kw=1500.0,
                power_capacity_kw=2500.0,
                order_index=0
            )
            db.add(site)
            db.flush()
            
            room = Room(
                site_id=site.id, 
                name="Room-404", 
                floor_level="B2", 
                hvac_zone="North-Chill", 
                fire_suppression_type="FM-200"
            )
            db.add(room)
            db.flush()

            rack_types = [
                ("NET-CORE", 42, "Standard"),
                ("COMP-HIGH", 42, "Standard"),
                ("STOR-DENSE", 42, "Deep"),
                ("LEGACY-P", 42, "Standard"),
                ("SEC-ENCLAVE", 42, "Shielded"),
                ("AI-STACK", 48, "Deep"),
                ("EDGE-COMP", 24, "Compact"),
                ("BACKUP-T", 42, "Deep"),
                ("STAGING", 42, "Standard"),
                ("LAB-DR", 42, "Standard")
            ]
            
            racks = []
            for i, (r_type, height, r_depth) in enumerate(rack_types):
                rk = Rack(
                    room_id=room.id, 
                    name=f"RK-{r_type}-{i+1:02d}", 
                    total_u_height=height, 
                    order_index=i,
                    max_power_kw=12.0 if "AI" not in r_type else 30.0,
                    typical_power_kw=5.0 if "LAB" not in r_type else 2.0,
                    max_weight_kg=1000.0 if "STOR" not in r_type else 2500.0,
                    cooling_type="Cold Aisle Containment" if i % 2 == 0 else "In-Row Cooling",
                    pdu_a_id=f"PDU-{r_type}-A",
                    pdu_b_id=f"PDU-{r_type}-B"
                )
                racks.append(rk)
                db.add(rk)
            db.flush()

            # 3. Network Foundations
            subnet_configs = [
                ("Management", "10.10.0.0/24", 10),
                ("Production-A", "10.20.10.0/24", 20),
                ("Production-B", "10.20.20.0/24", 21),
                ("Database-Core", "10.30.0.0/23", 30),
                ("Storage-iSCSI", "10.40.0.0/24", 40),
                ("Backup-Net", "10.50.0.0/24", 50),
                ("Security-DMZ", "172.16.0.0/24", 90),
                ("Legacy-Main", "192.168.1.0/24", 100)
            ]
            subnets = []
            for name, cidr, vlan in subnet_configs:
                sn = Subnet(
                    network_cidr=cidr, 
                    name=name, 
                    vlan_id=vlan, 
                    gateway=cidr.replace("0/24", "1").replace("0/23", "1"),
                    dns_servers="10.10.0.53, 1.1.1.1",
                    description=f"Primary {name} subnet for the facility"
                )
                subnets.append(sn)
                db.add(sn)
            db.flush()

            # 4. Vendors
            vendors = []
            v_configs = [
                ("Cisco Systems", "NW", "USA"),
                ("Dell Technologies", "HW", "USA"),
                ("Palo Alto Networks", "SEC", "USA"),
                ("NetApp", "ST", "USA"),
                ("VMware", "SW", "USA"),
                ("Samsung Electronics", "DISP", "Korea"),
                ("TSMC", "FAB", "Taiwan"),
                ("NVIDIA", "GPU", "USA"),
                ("F5 Networks", "LB", "USA")
            ]
            for name, code, country in v_configs:
                v = Vendor(
                    name=name, 
                    country=country,
                    metadata_json={"tier": random.choice(["Platinum", "Gold", "Strategic"])}
                )
                vendors.append(v)
                db.add(v)
                db.flush()
                
                for _ in range(random.randint(2, 4)):
                    fname = fake.name()
                    vp = VendorPersonnel(
                        vendor_id=v.id,
                        name=fname,
                        name_original=fname.split()[0] + " " + fake.last_name() if random.random() > 0.7 else None,
                        position=random.choice(["TAM", "Support Lead", "Field Engineer", "Sales Exec"]),
                        team=random.choice(["Critical Infrastructure", "Enterprise Support", "Global Accounts"]),
                        company_email=fake.email(),
                        internal_email=fake.email() if random.random() > 0.5 else None,
                        phone=fake.phone_number(),
                        accounts=[
                            {"name": "Internal-LDAP", "type": "AD", "created_date": "2023-01-15", "status": "Active"},
                            {"name": "VPN-Global", "type": "Pulse", "created_date": "2023-01-20", "status": "Active"}
                        ] if random.random() > 0.3 else [],
                        pcs=[
                            {"name": f"WKS-{random.randint(1000, 9999)}", "type": "PC", "status": "Active"},
                            {"name": f"VDI-{random.randint(1000, 9999)}", "type": "VDI", "status": "Standby"}
                        ] if random.random() > 0.5 else []
                    )
                    db.add(vp)

                contract = VendorContract(
                    vendor_id=v.id, 
                    title=f"{name} Master Service Agreement {datetime.now().year}", 
                    contract_id=f"MSA-{code}-{random.randint(10000, 99999)}",
                    effective_date=datetime.now() - timedelta(days=random.randint(100, 500)),
                    expiry_date=datetime.now() + timedelta(days=random.randint(200, 800)),
                    covered_systems=random.sample(cats["LogicalSystem"], random.randint(1, 3)),
                    covered_assets=[],
                    document_link=f"https://sharepoint.corp/legal/contracts/{v.id}",
                    scope_of_work=[
                        {"deliverable": "Hardware Maintenance", "when": "NBD", "response_time": "4h", "objective": "Restoration"},
                        {"deliverable": "Software Updates", "when": "Quarterly", "response_time": "72h", "objective": "Compliance"}
                    ],
                    schedule={"work_schedule": "Mon-Fri 08:00-18:00", "holiday_policy": "Standard Corporate Holidays"},
                    previous_contract_changes="Consolidated legacy support tiers into unified Gold SLA." if random.random() > 0.5 else None
                )
                db.add(contract)
                db.flush()

            # 5. Core Network Infrastructure
            core_net_devices = []
            rack_occupancy = {rk.id: [False] * (rk.total_u_height + 1) for rk in racks}

            def find_free_u(rack_id, size_u):
                rk = next(r for r in racks if r.id == rack_id)
                total = rk.total_u_height
                for u in range(total, size_u - 1, -1):
                    if not any(rack_occupancy[rack_id][u-i] for i in range(size_u)):
                        for i in range(size_u): rack_occupancy[rack_id][u-i] = True
                        return u - size_u + 1
                return None

            for i in range(12):
                rk = racks[0] if i < 6 else racks[4]
                mfr, model, d_type = random.choice([
                    ("Cisco", "Nexus 9508", "Switch"),
                    ("Cisco", "Firepower 4110", "Firewall"),
                    ("F5", "Big-IP i7800", "Load Balancer")
                ])
                p_max = 1200.0
                d = Device(
                    name=f"CORE-{d_type.replace(' ', '').upper()}-{i:02d}",
                    system="GLOBAL-INFRA",
                    type=d_type,
                    status="Active",
                    environment="Production",
                    size_u=2 if "Big-IP" not in model else 1,
                    manufacturer=mfr,
                    model=model,
                    primary_ip=f"10.10.0.{10+i}",
                    owner="netops",
                    business_unit="Operations",
                    serial_number=fake.uuid4()[:12].upper(),
                    asset_tag=f"TAG-NET-{i:03d}",
                    role="Core Aggregation",
                    power_supply_count=2,
                    power_max_w=p_max,
                    power_typical_w=p_max * 0.6,
                    depth="Full"
                )
                core_net_devices.append(d)
                db.add(d)
                db.flush()
                
                u_start = find_free_u(rk.id, d.size_u)
                if u_start:
                    db.add(DeviceLocation(device_id=d.id, rack_id=rk.id, start_unit=u_start, size_u=d.size_u))
                
                try:
                    v_ref = next(v for v in vendors if mfr in v.name or v.name in mfr)
                    current_assets = list(v_ref.contracts[0].covered_assets or [])
                    current_assets.append(d.id)
                    v_ref.contracts[0].covered_assets = current_assets
                except StopIteration:
                    pass
                
            db.flush()

            # 6. Worker Assets
            all_workers = []
            for i in range(165):
                rk = racks[random.randint(1, 9)]
                sys = random.choice(cats["LogicalSystem"])
                mfr_data = random.choice([
                    ("Dell", "PowerEdge R750", "Physical", 2, "Ubuntu 22.04"),
                    ("HPE", "ProLiant DL380 Gen10", "Physical", 2, "RHEL 8.8"),
                    ("Supermicro", "AS-1114S-WN10RT", "Physical", 1, "Debian 12"),
                    ("PureStorage", "FlashArray //X50", "Storage", 3, "Purity OS"),
                    ("NVIDIA", "DGX H100", "Physical", 8, "DGX OS"),
                    ("Virtual", "vSphere Instance", "Virtual", 0, "Windows Server 2022")
                ])
                mfr, model, d_type, size, os_name = mfr_data
                status = random.choices(cats["Status"], weights=[5, 65, 10, 5, 5, 5, 2, 3])[0]
                p_max = random.uniform(400, 2000) if size > 0 else 0
                d = Device(
                    name=f"{sys.lower()}-node-{i:03d}",
                    system=sys,
                    type=d_type,
                    status=status,
                    environment=random.choice(cats["Environment"]),
                    size_u=size,
                    manufacturer=mfr,
                    model=model,
                    os_name=os_name,
                    primary_ip=f"10.20.{random.randint(10,21)}.{random.randint(10,250)}",
                    owner="platform-team",
                    business_unit=random.choice(cats["BusinessUnit"]),
                    serial_number=fake.uuid4()[:14].upper(),
                    asset_tag=f"ASSET-{10000+i}",
                    role="Application Server" if d_type == "Physical" else "Shared Storage",
                    power_max_w=p_max,
                    power_typical_w=p_max * 0.7 if p_max > 0 else 0,
                    purchase_date=datetime.now() - timedelta(days=random.randint(100, 1000)),
                    metadata_json={
                        "last_backup": (datetime.now() - timedelta(hours=random.randint(1, 24))).isoformat(),
                        "patch_level": f"v{random.randint(1,4)}.{random.randint(0,9)}",
                        "monitoring_agent": "Zabbix-6.4"
                    }
                )
                if status == "Reserved":
                    d.is_reservation = True
                    d.reservation_info = {"est_arrival": "2026-05", "requester": fake.name(), "project": "NextGen-AI"}
                all_workers.append(d)
                db.add(d)
                db.flush()
                if size > 0:
                    u_start = find_free_u(rk.id, size)
                    if u_start:
                        db.add(DeviceLocation(device_id=d.id, rack_id=rk.id, start_unit=u_start, size_u=size))
                    else:
                        for other_rk in random.sample(racks, len(racks)):
                            u_start = find_free_u(other_rk.id, size)
                            if u_start:
                                db.add(DeviceLocation(device_id=d.id, rack_id=other_rk.id, start_unit=u_start, size_u=size))
                                break
                if d_type == "Physical":
                    db.add(HardwareComponent(device_id=d.id, category="CPU", name="Intel Xeon Platinum", count=2, specs="32C/64T", manufacturer="Intel"))
                    db.add(HardwareComponent(device_id=d.id, category="Memory", name="ECC RDIMM", count=16, specs="64GB DDR5", manufacturer="Micron"))
                    db.add(HardwareComponent(device_id=d.id, category="SSD", name="NVMe Cache", count=4, specs="3.2TB Enterprise", manufacturer="Samsung"))
                db.add(SecretVault(device_id=d.id, secret_type="Root PW", username="root", encrypted_payload="ENC_BLOB_PW"))
            db.flush()

            # 7. Logical Services
            for i in range(220):
                parent = random.choice(all_workers)
                s_type_info = random.choice(service_types)
                s_type, _ = s_type_info
                svc = LogicalService(
                    device_id=parent.id,
                    name=f"SVC-{s_type.split()[0]}-{i:03d}",
                    service_type=s_type,
                    status=parent.status,
                    version=f"{random.randint(1,5)}.{random.randint(0,20)}",
                    environment=parent.environment,
                    purpose=f"Core {s_type} for {parent.system} logic"
                )
                db.add(svc)
            db.flush()

            # 8. Networking
            for w in all_workers:
                if w.type == "Virtual": continue
                target_sw = random.choice(core_net_devices)
                db.add(PortConnection(
                    source_device_id=w.id, source_port="mgmt0", source_ip=w.primary_ip.replace("20.", "10."),
                    target_device_id=target_sw.id, target_port=f"Gi1/0/{random.randint(1,48)}",
                    link_type="Management", status="Active", farm="MGMT-CORE"
                ))
                db.add(PortConnection(
                    source_device_id=w.id, source_port="eth0", source_ip=w.primary_ip,
                    target_device_id=target_sw.id, target_port=f"Te1/1/{random.randint(1,24)}",
                    link_type="Data", status="Active", farm=w.system
                ))

            # 9. Relationships
            for _ in range(80):
                pair = random.sample(all_workers, 2)
                db.add(DeviceRelationship(source_device_id=pair[0].id, target_device_id=pair[1].id, relationship_type=random.choice(["HA-Pair", "Cluster-Member", "Dependency"])))

            # 10. Security Policies
            for i in range(150):
                db.add(FirewallRule(name=f"RULE-{i:03d}", source_type="Any", dest_type="Any", protocol="TCP", action="Allow", status="Active"))

            # 11. Operations
            for i in range(15):
                start = datetime.now() - timedelta(days=random.randint(1, 60))
                db.add(IncidentLog(title=f"Incident {i}", status="Resolved", start_time=start, end_time=start + timedelta(hours=2)))
            for i in range(100):
                db.add(AuditLog(user_id="admin@sysgrid.net", action="UPDATE", target_table="devices", target_id=str(i)))

            # 12. FAR
            all_failure_modes = []
            for i in range(4):
                mode = FarFailureMode(system_name=random.choice(cats["LogicalSystem"]), title=f"Failure Mode {i}", severity=9, occurrence=3, detection=2, status="Resolved")
                mode.rpn = 54
                db.add(mode)
                db.flush()
                all_failure_modes.append(mode)

            # 13. RCA
            for i in range(3):
                rca = RcaRecord(title=f"RCA {i}", target_system=random.choice(cats["LogicalSystem"]), status="Resolved", occurrence_at=datetime.now())
                db.add(rca)

            # 14. Investigations
            for i in range(4):
                inv = Investigation(title=f"Investigation {i}", status="Analyzing", priority="MEDIUM", initiation_at=datetime.now())
                db.add(inv)

            # 15. External Entities
            for i in range(10):
                db.add(ExternalEntity(name=f"External {i}", type="API", status="Active", environment="Production"))

            # 16. Monitoring
            for i in range(20):
                app = random.choice(all_workers)
                mon = MonitoringItem(device_id=app.id, category="Infrastructure", title=f"Monitor {i}", status="Existing", is_active=True)
                db.add(mon)

            # 17. Projects
            for i in range(4):
                p = Project(name=f"Project {i}", type="Strategic", priority="High", status="In Progress")
                db.add(p)
                db.flush()
                for j in range(5):
                    db.add(ProjectTask(project_id=p.id, name=f"Task {j}", status="To Do"))

            # 18. RBAC
            admin_role = Role(name="Administrator", permissions={"all": "manage"})
            db.add(admin_role)
            db.flush()
            db.add(Operator(external_id="haewon.kim", username="haewon.kim", full_name="Haewon Kim", email="haewon.kim@sysgrid.net", role_id=admin_role.id, is_admin=True, registration_status="Active"))
            db.add(Operator(external_id="haewonkim", username="haewonkim", full_name="Haewon Kim", email="haewonkim@sysgrid.net", role_id=admin_role.id, is_admin=True, registration_status="Active"))

            # 19. Preferences & Versioning
            db.add(UserPreference(user_id="haewon.kim", key="dashboard_layout", value="compact"))
            db.add(EnvHistory(field="ENVIRONMENT", old_value="development", new_value="production", user="haewon.kim"))
            db.add(UserPoolVersion(version_label="v1", created_by="system", is_active=True))

            db.commit()
            print("SUCCESS: Database seeded.")
            print(f"SUMMARY: 10 Racks, {len(all_workers) + len(core_net_devices)} Devices, 220 Services, 150+ Policies, 15 Incidents, 3 RCAs.")
    except Exception as e:
        import traceback
        print(f"FAILURE: Seeding failed: {str(e)}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    seed()
