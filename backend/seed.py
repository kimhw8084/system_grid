"""
Exhaustive high-density seed script for SysGrid.
Populates all tables with hundreds of records for stress-testing and UI validation.
Maintains limit of 20 Racks while maximizing internal dependencies.
"""

import os
import sys
import random
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
        # 1. SettingOptions
        print("Seeding SettingOptions...")
        cats = {
            "LogicalSystem": ["SAP ERP", "HR-Core", "Sales-B2B", "IT-Infra", "DevOps", "Financials", "Manufacturing"],
            "DeviceType": ["Physical", "Virtual", "Switch", "Firewall", "Storage", "Load Balancer", "PDU"],
            "Status": ["Active", "Planned", "Maintenance", "Standby", "Offline", "Decommissioned"],
            "Environment": ["Production", "Staging", "QA", "Dev", "DR", "Lab"],
            "BusinessUnit": ["Engineering", "Operations", "Finance", "HR", "Sales", "Security", "Legal"]
        }
        for cat, vals in cats.items():
            for v in vals:
                db.add(SettingOption(category=cat, label=v, value=v, description=f"Standard {v}"))
        
        service_types = [
            ("Database", ["Engine", "Port", "DBName", "StorageType"]),
            ("Web Server", ["ServerType", "Port", "SSLExpiry", "AppPool"]),
            ("Container", ["Runtime", "Image", "Namespace", "CPURequest"]),
            ("Middleware", ["Vendor", "Instance", "QueueDepth", "JVMHeap"])
        ]
        for val, keys in service_types:
            db.add(SettingOption(category="ServiceType", label=val, value=val, metadata_keys=keys))
        db.flush()

        # 2. Infrastructure
        print("Seeding Infrastructure...")
        sites = [Site(name=f"DC-{fake.city().upper()}", address=fake.address(), order_index=i) for i in range(3)]
        db.add_all(sites)
        db.flush()

        rooms = []
        for s in sites:
            for i in range(2):
                r = Room(site_id=s.id, name=f"Room {chr(65+i)}", floor_level=f"{i+1}F", hvac_zone=f"ZONE-{s.id}-{i}")
                rooms.append(r)
                db.add(r)
        db.flush()

        racks = []
        for i in range(20):
            rk = Rack(room_id=random.choice(rooms).id, name=f"RACK-{i+1:02d}", total_u_height=42, order_index=i)
            racks.append(rk)
            db.add(rk)
        db.flush()

        # 3. Subnets
        print("Seeding Subnets...")
        subnets = []
        for i in range(10):
            sn = Subnet(
                network_cidr=f"10.{i}.0.0/24", name=f"SUBNET-{i}", vlan_id=100+i, 
                gateway=f"10.{i}.0.254", dns_servers="1.1.1.1, 8.8.8.8"
            )
            subnets.append(sn)
            db.add(sn)
        db.flush()

        # 4. Vendors & Contracts
        print("Seeding Vendors & Contracts...")
        vendors = []
        vendor_list = ["Cisco", "Dell", "HPE", "Palo Alto", "VMware", "NetApp", "Oracle", "Microsoft", "Arista", "F5"]
        for name in vendor_list:
            v = Vendor(name=name, organization=f"{name} Global", contact_email=f"support@{name.lower()}.com")
            vendors.append(v)
            db.add(v)
            db.flush()
            # Add a contract for each vendor
            db.add(VendorContract(
                vendor_id=v.id, title=f"Enterprise {name} Support", contract_number=f"CN-{random.randint(100,999)}",
                start_date=datetime.now()-timedelta(days=365), end_date=datetime.now()+timedelta(days=365)
            ))
        db.flush()

        # 5. Devices (150)
        print("Seeding 150 Devices...")
        devices = []
        for i in range(150):
            mfr = random.choice(vendor_list)
            sys_name = random.choice(cats["LogicalSystem"])
            d = Device(
                name=f"{sys_name[:3].lower()}-{fake.word()}-{i:03d}",
                system=sys_name, type=random.choice(cats["DeviceType"]),
                status=random.choice(cats["Status"]), environment=random.choice(cats["Environment"]),
                size_u=random.choice([1, 2, 4]), manufacturer=mfr, model=f"PRO-{random.randint(100,999)}",
                primary_ip=f"10.{random.randint(0,9)}.{random.randint(0,254)}.{random.randint(1,254)}",
                owner=random.choice(["ops-team", "dba-team", "netops"]), business_unit=random.choice(cats["BusinessUnit"]),
                vendor=f"{mfr} Technologies", purchase_date=datetime.now()-timedelta(days=random.randint(100,1000))
            )
            devices.append(d)
            db.add(d)
        db.flush()

        # 6. Device Locations & Components
        print("Packing Racks & Seeding Components...")
        for i, d in enumerate(devices):
            rk = racks[i % 20]
            db.add(DeviceLocation(device_id=d.id, rack_id=rk.id, start_unit=(i//20)*4 + 1, size_u=d.size_u))
            
            # Hardware
            db.add(HardwareComponent(device_id=d.id, category="CPU", name="Intel/AMD Processor", count=2))
            db.add(HardwareComponent(device_id=d.id, category="Memory", name="ECC RAM", count=16, specs="32GB Sticks"))
            
            # Software
            db.add(DeviceSoftware(device_id=d.id, category="OS", name=random.choice(["Linux", "Windows", "NX-OS"]), version="Latest"))
            
            # Interfaces
            db.add(NetworkInterface(device_id=d.id, name="eth0", ip_address=d.primary_ip, mac_address=fake.mac_address()))
            
            # Vault
            db.add(SecretVault(device_id=d.id, secret_type="SSH Key", username="admin", encrypted_payload="ENC_DATA"))
        db.flush()

        # 7. Logical Services (150)
        print("Seeding 150 Services...")
        services = []
        for i in range(150):
            d = random.choice(devices)
            s = LogicalService(
                device_id=d.id, name=f"SVC-{fake.word().upper()}-{i}",
                service_type=random.choice(["Database", "Web Server", "Container", "Middleware"]),
                status="Active", environment=d.environment, version="2.1.0",
                config_json={"port": random.randint(80, 9000), "ha": True}
            )
            services.append(s)
            db.add(s)
            db.flush()
            # Secret for each service
            db.add(ServiceSecret(service_id=s.id, username="svc_user", password="secret_password"))
        db.flush()

        # 8. Relationships & Connectivity
        print("Seeding 150 Relationships & 300 Connections...")
        for _ in range(150):
            s1, s2 = random.sample(devices, 2)
            db.add(DeviceRelationship(
                source_device_id=s1.id, target_device_id=s2.id, 
                relationship_type=random.choice(["Dependency", "Cluster", "HA Pair", "Replication"]),
                source_role="Primary", target_role="Consumer"
            ))
        
        switches = [d for d in devices if d.type in ["Switch", "Firewall"]] or devices[:5]
        for _ in range(300):
            src = random.choice(devices)
            tgt = random.choice(switches)
            if src.id == tgt.id: continue
            db.add(PortConnection(
                source_device_id=src.id, source_port=f"p{random.randint(1,4)}", source_ip=src.primary_ip,
                target_device_id=tgt.id, target_port=f"g{random.randint(1,48)}",
                purpose="Backplane", speed_gbps=random.choice([1, 10, 40, 100]), direction="bidirectional"
            ))
        db.flush()

        # 9. Firewall Rules (150)
        print("Seeding 150 Firewall Rules...")
        for i in range(150):
            db.add(FirewallRule(
                name=f"RULE-{i:03d}", risk="Security Policy Violation",
                source_type=random.choice(["Any", "Subnet", "Device"]),
                dest_type=random.choice(["Any", "Subnet", "Device"]),
                protocol=random.choice(["TCP", "UDP", "ICMP"]),
                port_range=str(random.randint(1, 65535)),
                direction=random.choice(["Inbound", "Outbound"]),
                action=random.choice(["Allow", "Deny"]), status="Active"
            ))
        db.flush()

        # 10. Monitoring & Maintenance
        print("Seeding Monitoring & Maintenance...")
        for d in devices:
            if random.random() > 0.5:
                db.add(MonitoringItem(
                    device_id=d.id, category="Availability", status="OK",
                    title=f"Health Check: {d.name}", platform="Prometheus", logic="up == 1"
                ))
            if random.random() > 0.8:
                db.add(MaintenanceWindow(
                    device_id=d.id, title="Quarterly Patching", 
                    start_time=datetime.now()+timedelta(days=random.randint(1,30)),
                    end_time=datetime.now()+timedelta(days=31), status="Scheduled"
                ))
        db.flush()

        # 11. Knowledge, Investigations & Incidents
        print("Seeding Knowledge Hub & Forensics...")
        for i in range(100):
            db.add(KnowledgeEntry(
                category=random.choice(["Manual", "FAQ", "Instruction", "Best Practice"]),
                title=fake.sentence(), content=fake.paragraph(), is_answered=True
            ))
        
        for i in range(30):
            inv = Investigation(
                title=f"Incident Forensics {i}", problem_statement=fake.paragraph(),
                status=random.choice(["Analyzing", "Escalated", "Resolved"]), priority="High"
            )
            db.add(inv)
            db.flush()
            for _ in range(5):
                db.add(InvestigationProgress(investigation_id=inv.id, entry_text=fake.sentence(), entry_type="Update"))
        
        for _ in range(20):
            db.add(IncidentLog(
                title=f"Major Outage: {fake.word().upper()}", severity="Critical", status="Resolved",
                systems=[random.choice(cats["LogicalSystem"])],
                start_time=datetime.now()-timedelta(days=random.randint(1,10)),
                reporter="monitor-bot", initial_symptoms="High Latency", root_cause="Memory Leak"
            ))

        # 12. Partner IQ (External Entities)
        print("Seeding Partner IQ...")
        for i in range(10):
            ext = ExternalEntity(name=f"Partner-{i}", type="Service Provider", owner_organization=fake.company())
            db.add(ext)
            db.flush()
            db.add(ExternalLink(external_entity_id=ext.id, device_id=random.choice(devices).id, purpose="API Sync"))

        # 13. Data Flows
        print("Seeding Data Flows...")
        for i in range(5):
            db.add(DataFlow(name=f"Flow Template {i}", category="Template", is_template=True, nodes_json=[], edges_json=[]))

        db.commit()
        print("--- EXHAUSTIVE SEED COMPLETE ---")
        print(f"Racks: 20 | Devices: 150 | Services: 150 | Relationships: 150")
        print(f"Connections: 300 | Firewall Rules: 150 | KB Entries: 100")

if __name__ == "__main__":
    seed()
