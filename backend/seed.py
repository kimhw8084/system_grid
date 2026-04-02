"""
ULTIMATE HIGH-FIDELITY SEED SCRIPT - v3 (The Chaos & Order Edition)
- Diverse Racks (Standard, Storage-Heavy, High-Compute, Network-Core).
- Complex Devices (Multi-OS, diverse manufacturers, deep metadata).
- Rich Services (Clustered DBs, Microservices with deep config).
- Realistic Networking (VLANs, varied link speeds, complex cabling).
- Varied Operations (FAR modes, detailed Incidents, complex Investigations).
- Comprehensive Vendor Data (Personnel, Accounts, detailed Contracts).
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

from app.models.models import (
    Site, Room, Rack, Device, DeviceLocation, HardwareComponent,
    DeviceSoftware, NetworkInterface, Subnet, PortConnection,
    DeviceRelationship, LogicalService, ServiceSecret, SecretVault,
    MaintenanceWindow, MonitoringItem, IncidentLog, DataFlow,
    AuditLog, SettingOption, FirewallRule, ExternalEntity, ExternalLink,
    Vendor, VendorPersonnel, VendorContract, KnowledgeEntry,
    Investigation, InvestigationProgress,
    FarFailureMode, FarFailureCause, FarResolution, FarMitigation, FarPrevention
)

DB_PATH = os.path.join(os.path.dirname(__file__), "system_grid.db")
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
fake = Faker()

def seed():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    from alembic.config import Config as AlembicConfig
    from alembic import command as alembic_command
    alembic_cfg = AlembicConfig(os.path.join(os.path.dirname(__file__), "alembic.ini"))
    alembic_command.upgrade(alembic_cfg, "head")
    print("Schema provisioned.")

    with Session(engine) as db:
        # 1. SettingOptions (Enhanced Metadata)
        print("Seeding SettingOptions & Global Metadata...")
        cats = {
            "LogicalSystem": ["SAP-PROD", "K8S-CLUSTER-01", "LEGACY-ERP", "FIN-CORE", "HR-PEOPLE", "GLOBAL-DNS", "AI-TRAINING-01", "BI-ANALYTICS"],
            "DeviceType": ["Physical", "Virtual", "Switch", "Firewall", "Load Balancer", "Storage", "PDU", "UPS", "Console-Server"],
            "Status": ["Active", "Maintenance", "Standby", "Decommissioned", "Provisioning", "Failed", "Reserved"],
            "Environment": ["Production", "Staging", "QA", "DR", "Sandbox", "Legacy"],
            "BusinessUnit": ["Operations", "Finance", "Security", "Engineering", "R&D", "Marketing"],
            "LinkPurpose": ["Data", "Management", "Storage/iSCSI", "Backup", "vMotion", "Replication", "Heartbeat", "Stacking"]
        }
        for cat, vals in cats.items():
            for v in vals:
                db.add(SettingOption(category=cat, label=v, value=v, description=f"Standard {cat} entry: {v}"))
        
        service_types = [
            ("Database", ["engine", "instance_name", "port", "sid", "collation", "always_on", "data_path", "backup_policy"]),
            ("Web API", ["server_type", "url", "bindings", "app_pool", "ssl_expiry", "root_path"]),
            ("Auth Service", ["protocol", "domain", "key_rotation", "mfa_enabled"]),
            ("Middleware", ["platform", "queue_names", "max_consumers", "heartbeat_interval"]),
            ("Storage Hub", ["volume_id", "protocol", "iops", "encryption_status", "tier"])
        ]
        for val, keys in service_types:
            db.add(SettingOption(category="ServiceType", label=val, value=val, metadata_keys=keys))
        db.flush()

        # 2. Infrastructure (Strictly 10 Racks with varying types)
        print("Building Infrastructure (10 Racks with types)...")
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
        print("Seeding Network Foundations (VLANs & Subnets)...")
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

        # 4. Vendors & Master Contracts (Revamped)
        print("Seeding Strategic Vendors ( personnel & contracts )...")
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
                primary_email=f"global-support@{name.lower().replace(' ', '')}.com",
                primary_phone=fake.phone_number(),
                country=country,
                metadata_json={"tier": random.choice(["Platinum", "Gold", "Strategic"])}
            )
            vendors.append(v)
            db.add(v)
            db.flush()
            
            # Personnel for each vendor
            for _ in range(random.randint(2, 4)):
                vp = VendorPersonnel(
                    vendor_id=v.id,
                    name=fake.name(),
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

            # Contract for each vendor
            contract = VendorContract(
                vendor_id=v.id, 
                title=f"{name} Master Service Agreement {datetime.now().year}", 
                contract_id=f"MSA-{code}-{random.randint(10000, 99999)}",
                effective_date=datetime.now() - timedelta(days=random.randint(100, 500)),
                expiry_date=datetime.now() + timedelta(days=random.randint(200, 800)),
                document_link=f"https://sharepoint.corp/legal/contracts/{v.id}",
                scope_of_work=[
                    {"deliverable": "Hardware Maintenance", "when": "NBD", "response_time": "4h", "objective": "Restoration"},
                    {"deliverable": "Software Updates", "when": "Quarterly", "response_time": "72h", "objective": "Compliance"}
                ],
                schedule={"work_schedule": "Mon-Fri 08:00-18:00", "holiday_policy": "Standard Corporate Holidays"}
            )
            db.add(contract)
            db.flush()

        # 5. Core Network Infrastructure
        print("Seeding Network Core (Racks 1-2)...")
        core_net_devices = []
        for i in range(12):
            rk = racks[0] if i < 6 else racks[4] # Spread core across Rack 1 and 5
            mfr, model, d_type = random.choice([
                ("Cisco", "Nexus 9508", "Switch"),
                ("Cisco", "Firepower 4110", "Firewall"),
                ("F5", "Big-IP i7800", "Load Balancer")
            ])
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
                power_max_w=1200.0,
                depth="Full"
            )
            core_net_devices.append(d)
            db.add(d)
            db.flush()
            db.add(DeviceLocation(device_id=d.id, rack_id=rk.id, start_unit=42 - (i*2), size_u=d.size_u))
            
            # Coverage Link
            try:
                v_ref = next(v for v in vendors if mfr in v.name or v.name in mfr)
                current_assets = list(v_ref.contracts[0].covered_assets or [])
                current_assets.append({"device_id": d.id, "support_type": "Both"})
                v_ref.contracts[0].covered_assets = current_assets
            except StopIteration:
                print(f"Warning: No vendor found for {mfr}")
            
        db.flush()

        # 6. Worker Assets (150+ devices)
        print("Seeding 160+ Diversified Worker Assets...")
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
            
            status = random.choices(cats["Status"], weights=[70, 10, 5, 5, 5, 2, 3])[0]
            
            d = Device(
                name=f"{sys.lower()}-{code.lower()}-{i:03d}",
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
                power_max_w=random.uniform(400, 2000) if size > 0 else 0,
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
                # Place in rack
                db.add(DeviceLocation(device_id=d.id, rack_id=rk.id, start_unit=random.randint(1, 38), size_u=size))
            
            # Components
            if d_type == "Physical":
                db.add(HardwareComponent(device_id=d.id, category="CPU", name="Intel Xeon Platinum", count=2, specs="32C/64T", manufacturer="Intel"))
                db.add(HardwareComponent(device_id=d.id, category="Memory", name="ECC RDIMM", count=16, specs="64GB DDR5", manufacturer="Micron"))
                db.add(HardwareComponent(device_id=d.id, category="SSD", name="NVMe Cache", count=4, specs="3.2TB Enterprise", manufacturer="Samsung"))
            
            # Secrets
            db.add(SecretVault(device_id=d.id, secret_type="Root PW", username="root", encrypted_payload="ENC_BLOB_PW"))
            if os_name.startswith("Windows"):
                db.add(SecretVault(device_id=d.id, secret_type="Domain Admin", username="CORP\\admin_svc", encrypted_payload="ENC_BLOB_DOMAIN"))

        db.flush()

        # 7. Logical Services (Rich Config & Multi-tier)
        print("Seeding 220+ Diversified Logical Services...")
        for i in range(220):
            parent = random.choice(all_workers)
            s_type_info = random.choice(service_types)
            s_type, meta_keys = s_type_info
            
            config = {}
            if s_type == "Database":
                config = {"engine": "PostgreSQL", "instance_name": f"DB_{i}", "port": 5432, "backup_policy": "Daily-S3"}
            elif s_type == "Web API":
                config = {"server_type": "Node.js/Express", "url": f"https://api-{i}.corp.net", "ssl_expiry": "2026-12-31"}
            elif s_type == "Storage Hub":
                config = {"volume_id": f"LUN-{i}", "protocol": "iSCSI", "tier": "All-Flash"}
                
            svc = LogicalService(
                device_id=parent.id,
                name=f"SVC-{s_type.split()[0]}-{i:03d}",
                service_type=s_type,
                status=parent.status,
                version=f"{random.randint(1,5)}.{random.randint(0,20)}",
                environment=parent.environment,
                purpose=f"Core {s_type} for {parent.system} logic",
                config_json=config,
                custom_attributes={"business_criticality": random.choice(["L1", "L2", "L3"]), "sla_target": "99.9%"}
            )
            db.add(svc)
            db.flush()
            db.add(ServiceSecret(service_id=svc.id, username="app_user", password=fake.password(), note="Dynamic rotate enabled"))

        # 8. Networking & Connectivity (Cabling)
        print("Wiring Infrastructure (400+ Port Connections)...")
        for w in all_workers:
            if w.type == "Virtual": continue
            # Management Link
            target_sw = random.choice(core_net_devices)
            db.add(PortConnection(
                source_device_id=w.id, source_port="mgmt0", source_ip=w.primary_ip.replace("20.", "10."),
                target_device_id=target_sw.id, target_port=f"Gi1/0/{random.randint(1,48)}",
                link_type="Management", purpose="OOB Management Access", speed_gbps=1.0, unit="Gbps", direction="bidirectional", cable_type="Cat6"
            ))
            # Data Link
            db.add(PortConnection(
                source_device_id=w.id, source_port="eth0", source_ip=w.primary_ip,
                target_device_id=target_sw.id, target_port=f"Te1/1/{random.randint(1,24)}",
                link_type="Data", purpose="Production Traffic", speed_gbps=10.0 if "DGX" not in w.model else 100.0, unit="Gbps", direction="bidirectional", cable_type="SFP-DAC"
            ))

        # 9. Complex Relationships (Clustering, HA, Dependencies)
        print("Defining Complex System Relationships...")
        for _ in range(80):
            pair = random.sample(all_workers, 2)
            rel_type = random.choice(["HA-Pair", "Cluster-Member", "Dependency", "Replica", "Management-Link"])
            db.add(DeviceRelationship(
                source_device_id=pair[0].id, target_device_id=pair[1].id,
                relationship_type=rel_type,
                source_role="Primary" if rel_type=="HA-Pair" else "Consumer",
                target_role="Secondary" if rel_type=="HA-Pair" else "Provider",
                notes=f"Automated relationship mapping for {rel_type}"
            ))

        # 10. Security (Firewall Rules with Source/Dest Variety)
        print("Generating 150+ Dynamic Security Policies...")
        for i in range(150):
            s_type = random.choice(["Device", "Subnet", "Custom", "Any"])
            d_type = random.choice(["Device", "Subnet", "Custom", "Any"])
            rule = FirewallRule(
                name=f"RULE-SEC-{i:04d}",
                risk="High" if i % 10 == 0 else "Medium",
                protocol=random.choice(["TCP", "UDP", "ICMP", "ANY"]),
                port_range=random.choice(["443", "80,8080", "1024-65535", "22", "3389"]),
                direction=random.choice(["Inbound", "Outbound"]),
                action=random.choice(["Allow", "Deny"]),
                status="Active",
                source_type=s_type,
                dest_type=d_type
            )
            if s_type == "Device": rule.source_device_id = random.choice(all_workers).id
            elif s_type == "Subnet": rule.source_subnet_id = random.choice(subnets).id
            elif s_type == "Custom": rule.source_custom_ip = fake.ipv4()
            
            if d_type == "Device": rule.dest_device_id = random.choice(all_workers).id
            elif d_type == "Subnet": rule.dest_subnet_id = random.choice(subnets).id
            elif d_type == "Custom": rule.dest_custom_ip = fake.ipv4()
            
            db.add(rule)

        # 11. Operations: Incident Logs & Audits
        print("Simulating Operational History (Incidents & Audits)...")
        for i in range(15):
            start = datetime.now() - timedelta(days=random.randint(1, 60))
            db.add(IncidentLog(
                title=f"OUTAGE: {random.choice(cats['LogicalSystem'])} {fake.word().upper()}",
                systems=[random.choice(cats["LogicalSystem"])],
                impacted_device_ids=[random.choice(all_workers).id for _ in range(3)],
                severity=random.choice(["Critical", "Major"]),
                status="Resolved",
                start_time=start,
                end_time=start + timedelta(hours=random.randint(2, 48)),
                initial_symptoms="Network timeout and high latency reports",
                impacts_json=["Revenue Loss", "Wafer Scrap", "Line Stoppage"],
                root_cause="Firmware mismatch on core interconnects",
                resolution_steps="Rollback to v4.2.1 and verified stability",
                timeline_json=[{"time": start.isoformat(), "event": "Trigger detected", "type": "Alert"}]
            ))

        for i in range(100):
            db.add(AuditLog(
                user_id="admin@sysgrid.net",
                action=random.choice(["CREATE", "UPDATE", "DELETE", "LOGIN"]),
                target_table=random.choice(["devices", "logical_services", "vendors"]),
                target_id=str(random.randint(1, 200)),
                description=f"Automated audit entry for action {i}"
            ))

        # 12. FAR (Failure Analysis & Resolution) - Scenarios
        print("Seeding FAR Failure Analysis Modes...")
        far_scenarios = [
            ("Thermal Throttle Spike", "AI-TRAINING-01"),
            ("Silent Data Corruption", "BI-ANALYTICS"),
            ("Split-Brain Sync Failure", "SAP-PROD"),
            ("Kernel Panic Loop", "K8S-CLUSTER-01")
        ]
        for title, sys_name in far_scenarios:
            mode = FarFailureMode(
                system_name=sys_name,
                title=title,
                effect="Complete system lockdown requiring manual hardware reset",
                severity=random.randint(8, 10),
                occurrence=random.randint(2, 4),
                detection=random.randint(1, 3),
                status="Resolution Identified"
            )
            mode.rpn = mode.severity * mode.occurrence * mode.detection
            mode.affected_assets = random.sample(all_workers, 5)
            db.add(mode)
            db.flush()
            
            cause = FarFailureCause(cause_text=f"Race condition in {title} module", occurrence_level=mode.occurrence, responsible_team="Reliability Eng")
            db.add(cause)
            db.flush()
            mode.causes.append(cause)
            
            db.add(FarMitigation(mitigation_type="Workaround", mitigation_steps="Periodic service restart every 12h", responsible_team="SRE"))

        db.commit()
        print("--- ULTIMATE SEED COMPLETE ---")
        print(f"Racks: 10 | Devices: {len(all_workers) + len(core_net_devices)} | Services: 220")
        print(f"Audit Logs: 100 | Incident Logs: 15 | FAR Modes: 4")

if __name__ == "__main__":
    seed()
