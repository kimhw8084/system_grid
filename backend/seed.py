"""
ULTIMATE HIGH-FIDELITY SEED SCRIPT
- Exactly 10 Racks, packed with 150+ devices.
- Comprehensive Secrets (SSH, API, Root, SNMP).
- Complex Relationships (HA-Pairs, Multi-tier Dependencies, DB Replication).
- Granular Network/Service Mapping for EVERY asset.
- Diverse Security & Metadata Scenarios.
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
    Vendor, VendorContract, ContractCoverage, KnowledgeEntry,
    Investigation, InvestigationProgress
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
        print("Seeding SettingOptions & Metadata Definitions...")
        cats = {
            "LogicalSystem": ["SAP-PROD", "K8S-CLUSTER-01", "LEGACY-ERP", "FIN-CORE", "HR-PEOPLE", "GLOBAL-DNS"],
            "DeviceType": ["Physical", "Virtual", "Switch", "Firewall", "Load Balancer", "Storage", "PDU"],
            "Status": ["Active", "Maintenance", "Standby", "Decommissioned", "Provisioning"],
            "Environment": ["Production", "Staging", "QA", "DR"],
            "BusinessUnit": ["Operations", "Finance", "Security", "Engineering"],
            "LinkPurpose": ["Data", "Management", "Storage/iSCSI", "Backup", "vMotion", "Replication", "Heartbeat"]
        }
        for cat, vals in cats.items():
            for v in vals:
                db.add(SettingOption(category=cat, label=v, value=v, description=f"Critical {v} component"))
        
        service_types = [
            ("Database", ["Engine", "Port", "ClusterID", "BackupSchedule", "StorageTier"]),
            ("Web API", ["Endpoint", "AuthMethod", "RateLimit", "SSLExpiry", "Backend"]),
            ("Auth Service", ["Protocol", "Domain", "KeyRotation", "MFAEnabled"]),
            ("Storage Node", ["VolumeID", "Protocol", "IOPS", "EncryptionStatus"])
        ]
        for val, keys in service_types:
            db.add(SettingOption(category="ServiceType", label=val, value=val, metadata_keys=keys))
        db.flush()

        # 2. Infrastructure (Strictly 10 Racks)
        print("Building Infrastructure (10 Racks)...")
        site = Site(name="CORE-DATACENTER", address="100 Silicon Way, TX", order_index=0)
        db.add(site)
        db.flush()
        room = Room(site_id=site.id, name="Hall-Alpha", floor_level="B2", hvac_zone="ZONE-A")
        db.add(room)
        db.flush()

        racks = []
        for i in range(10): # STRICT LIMIT: 10 RACKS
            rk = Rack(room_id=room.id, name=f"R-ALPHA-{i+1:02d}", total_u_height=42, order_index=i)
            racks.append(rk)
            db.add(rk)
        db.flush()

        # 3. Network Foundations
        print("Seeding Network Foundations...")
        subnets = []
        for i in range(5):
            sn = Subnet(network_cidr=f"10.50.{i}.0/24", name=f"VLAN-{100+i}", vlan_id=100+i, gateway=f"10.50.{i}.254")
            subnets.append(sn)
            db.add(sn)
        db.flush()

        # 4. Vendors & Master Contracts
        print("Seeding Strategic Vendors...")
        vendors = []
        v_data = [("Cisco", "NW"), ("Palo Alto", "SEC"), ("Dell", "HW"), ("PureStorage", "ST"), ("F5", "LB")]
        for name, cat in v_data:
            v = Vendor(name=name, organization=f"{name} Enterprise", contact_email=f"global-support@{name.lower()}.com")
            vendors.append(v)
            db.add(v)
            db.flush()
            db.add(VendorContract(
                vendor_id=v.id, title=f"Global {cat} Agreement", contract_number=f"MTRX-{random.randint(1000,9999)}",
                start_date=datetime.now()-timedelta(days=730), end_date=datetime.now()+timedelta(days=365)
            ))
        db.flush()

        # 5. Core Infrastructure Devices (Switches/Firewalls)
        print("Seeding Core Infrastructure...")
        core_devices = []
        for i in range(10):
            d_type = "Switch" if i < 8 else "Firewall"
            mfr = "Cisco" if d_type == "Switch" else "Palo Alto"
            d = Device(
                name=f"core-{d_type.lower()}-{i:02d}", system="GLOBAL-INFRA", type=d_type,
                status="Active", environment="Production", size_u=1, manufacturer=mfr, model="NEXUS-9K" if d_type == "Switch" else "PA-5250",
                primary_ip=f"10.50.0.{10+i}", owner="netops", business_unit="Security"
            )
            core_devices.append(d)
            db.add(d)
            db.flush()
            # Physical Location: Top of each rack
            db.add(DeviceLocation(device_id=d.id, rack_id=racks[i].id, start_unit=42, size_u=1))
        db.flush()

        # 6. Worker Devices (150 Servers/Storage)
        print("Seeding 150 Worker Assets...")
        workers = []
        for i in range(150):
            rk = racks[i % 10]
            sys_name = random.choice(cats["LogicalSystem"])
            d = Device(
                name=f"{sys_name.lower()}-srv-{i:03d}", system=sys_name, type=random.choice(["Physical", "Virtual", "Storage", "Load Balancer"]),
                status=random.choice(cats["Status"]), environment=random.choice(cats["Environment"]),
                size_u=random.choice([1, 2]), manufacturer="Dell", model="R740xd",
                primary_ip=f"10.50.{1+(i%4)}.{10+(i//4)}", owner="ops-team", business_unit="Engineering"
            )
            workers.append(d)
            db.add(d)
            db.flush()
            # Dense packing: 15 devices per rack approx
            db.add(DeviceLocation(device_id=d.id, rack_id=rk.id, start_unit=((i//10)*2)+1, size_u=d.size_u))
            
            # --- SECRETS SCENARIOS ---
            db.add(SecretVault(device_id=d.id, secret_type="Root Password", username="root", encrypted_payload="RSA_ENCRYPTED_PW"))
            db.add(SecretVault(device_id=d.id, secret_type="SSH Key", username="ansible", encrypted_payload="PRIVATE_KEY_BLOB"))
            db.add(SecretVault(device_id=d.id, secret_type="SNMP Community", username="snmp-v3", encrypted_payload="AUTH_PRIV_KEYS"))
            
            # --- METADATA & COMPONENTS ---
            db.add(HardwareComponent(device_id=d.id, category="CPU", name="Xeon Gold", count=2, specs="24-Core 2.9GHz"))
            db.add(DeviceSoftware(device_id=d.id, category="Kernel", name="Ubuntu/RHEL", version="5.15.x" if i%2==0 else "4.18.x"))
            db.add(NetworkInterface(device_id=d.id, name="mgmt0", ip_address=d.primary_ip, mac_address=fake.mac_address()))
        db.flush()

        # 7. Logical Services & Network Cabling (Dense Mapping)
        print("Mapping 200+ Services & 400+ Connections...")
        for i in range(200):
            parent = random.choice(workers)
            s_type = random.choice(["Database", "Web API", "Auth Service", "Storage Node"])
            meta = {
                "Database": {"Engine": "PostgreSQL", "Port": 5432, "ClusterID": "DB-01", "StorageTier": "SSD"},
                "Web API": {"Endpoint": "/v1/api", "AuthMethod": "OAuth2", "RateLimit": "1000/m"},
                "Auth Service": {"Protocol": "OIDC", "Domain": "auth.internal", "MFAEnabled": True},
                "Storage Node": {"VolumeID": f"VOL-{i}", "Protocol": "iSCSI", "IOPS": 5000}
            }[s_type]
            
            svc = LogicalService(
                device_id=parent.id, name=f"{s_type.upper()}-{i}", service_type=s_type,
                status="Active", environment=parent.environment, version="1.4.2",
                config_json=meta
            )
            db.add(svc)
            db.flush()
            db.add(ServiceSecret(service_id=svc.id, username="api_admin", password=fake.password()))

        # --- CABLING (Every worker to a switch) ---
        for w in workers:
            target_sw = core_devices[workers.index(w) % 8] # Map to one of the 8 switches
            db.add(PortConnection(
                source_device_id=w.id, source_port="eth0", source_ip=w.primary_ip,
                target_device_id=target_sw.id, target_port=f"Gig1/0/{workers.index(w)//8 + 1}",
                link_type="Data", purpose="Primary Link", speed_gbps=10, unit="Gbps", direction="bidirectional"
            ))

        # --- SERVER-TO-SERVER CONNECTIONS ---
        print("Seeding 30+ Server-to-Server Direct Links...")
        for i in range(35):
            s1, s2 = random.sample(workers, 2)
            # Ensure they are not the same
            db.add(PortConnection(
                source_device_id=s1.id, source_port="eth1", source_ip=s1.primary_ip.replace(".50.", ".60."),
                target_device_id=s2.id, target_port="eth1", target_ip=s2.primary_ip.replace(".50.", ".60."),
                link_type="Data", purpose="Backend Replication / Heartbeat Flow",
                speed_gbps=40, unit="Gbps", direction="bidirectional"
            ))

        # 8. Relationship Scenarios (HA, Clusters, Deps)
        print("Seeding 100+ Relationship Scenarios...")
        for i in range(50):
            # HA Pairs
            d1, d2 = random.sample(workers, 2)
            db.add(DeviceRelationship(source_device_id=d1.id, target_device_id=d2.id, relationship_type="HA Pair", source_role="Primary", target_role="Standby"))
            # Dependencies
            d3, d4 = random.sample(workers, 2)
            db.add(DeviceRelationship(source_device_id=d3.id, target_device_id=d4.id, relationship_type="Dependency", source_role="App", target_role="DB"))
        db.flush()

        # 9. Security Scenarios (Firewall Rules)
        print("Seeding 100+ Diverse Security Rules...")
        sec_scenarios = [
            ("Permit Web", "Allow", "Low", "TCP", "443"),
            ("Block Legacy", "Deny", "High", "ANY", "ANY"),
            ("SSH Mgmt", "Allow", "Medium", "TCP", "22"),
            ("Shadow IT Risk", "Allow", "Critical", "UDP", "1900")
        ]
        for i in range(120):
            name, action, risk, proto, port = random.choice(sec_scenarios)
            db.add(FirewallRule(
                name=f"FW-{name}-{i:03d}", risk=f"{risk}: {fake.word().upper()}", 
                source_type="Subnet", dest_type="Device", protocol=proto, port_range=port,
                direction=random.choice(["Inbound", "Outbound"]), action=action, status="Active"
            ))
        db.flush()

        # 10. Operations (Monitoring/Investigations/Knowledge)
        print("Finalizing Operations Layer...")
        for d in workers[:50]:
            db.add(MonitoringItem(device_id=d.id, category="Performance", status="OK", title=f"CPU Load: {d.name}", platform="Zabbix"))
        
        for i in range(20):
            inv = Investigation(title=f"Root Cause: {fake.word().upper()}", problem_statement="Intermittent latency detected in VLAN-101", status="Analyzing", priority="High")
            db.add(inv)
            db.flush()
            db.add(InvestigationProgress(investigation_id=inv.id, entry_text="Correlating switch logs with server metrics...", entry_type="Journal"))
            
        for i in range(50):
            db.add(KnowledgeEntry(category="Runbook", title=f"Standard Operating Procedure {i}", content=fake.text(), is_answered=True))

        db.commit()
        print("--- ULTIMATE SEED COMPLETE ---")
        print(f"Racks: 10 | Devices: 160 | Services: 200 | Connections: 160")
        print(f"Relationships: 100 | Firewall Rules: 120 | Secrets: 600+")

if __name__ == "__main__":
    seed()
