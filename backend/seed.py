"""
Canonical seed script for sysgrid development database.

Usage:
    cd backend
    python seed.py

Guards:
    - Exits early if system_grid.db already exists.
    - Delete the DB file first to re-seed from scratch.
"""

import os
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), "system_grid.db")

if os.path.exists(DB_PATH):
    print(f"DB already exists at {DB_PATH}. Delete it first to re-seed.")
    sys.exit(0)

# ── Step 1: Run Alembic migrations to provision schema ────────────────────────
print("Running Alembic migrations...")
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command

alembic_cfg = AlembicConfig(os.path.join(os.path.dirname(__file__), "alembic.ini"))
alembic_command.upgrade(alembic_cfg, "head")
print("Schema provisioned.")

# ── Step 2: Bootstrap sync session ───────────────────────────────────────────
import sys
sys.path.insert(0, os.path.dirname(__file__))

from datetime import date, datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.models.models import (
    Site, Room, Rack, Device, DeviceLocation, HardwareComponent,
    DeviceSoftware, NetworkInterface, Subnet, PortConnection,
    DeviceRelationship, LogicalService, ServiceSecret, SecretVault,
    MaintenanceWindow, MonitoringItem, IncidentLog, DataFlow,
    AuditLog, SettingOption, FirewallRule, ExternalEntity, ExternalLink,
    Vendor, VendorContract, ContractCoverage, KnowledgeEntry,
    Investigation, InvestigationProgress
)

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

def seed():
    with Session(engine) as db:
        import random
        from faker import Faker
        fake = Faker()

        # ── SettingOptions ───────────────────────────────────────────────────
        print("Seeding SettingOptions...")
        # ... (keep existing setting_defaults and service_types)
        # Add some extra random ones for density
        for _ in range(20):
             db.add(SettingOption(category="CustomTag", label=fake.word().capitalize(), value=fake.word(), description=fake.sentence()))

        db.flush()

        # ── Sites ─────────────────────────────────────────────────────────────
        print("Seeding Sites...")
        sites = []
        for i in range(10): # Increased from 3 to 10
            s = Site(
                name=f"{fake.city()} Data Center",
                address=fake.address(),
                facility_manager=fake.name(),
                contact_phone=fake.phone_number(),
                cooling_capacity_kw=random.uniform(50.0, 1000.0),
                power_capacity_kw=random.uniform(100.0, 2500.0),
                order_index=i,
            )
            sites.append(s)
            db.add(s)
        db.flush()

        # ── Rooms ─────────────────────────────────────────────────────────────
        print("Seeding Rooms...")
        rooms = []
        for s in sites:
            for i in range(random.randint(2, 5)):
                r = Room(site_id=s.id, name=f"Room {chr(65+i)} - {fake.word().capitalize()}", 
                         floor_level=f"{random.randint(1, 5)}F",
                         hvac_zone=f"HVAC-{s.id}-{i}", fire_suppression_type=random.choice(["FM-200", "Inert Gas", "Sprinkler", "Clean Agent"]))
                rooms.append(r)
                db.add(r)
        db.flush()

        # ── Racks ─────────────────────────────────────────────────────────────
        print("Seeding Racks...")
        racks = []
        for r in rooms:
            for i in range(random.randint(3, 8)):
                rk = Rack(room_id=r.id, name=f"{r.name[:3].upper()}-R{i:02d}", total_u_height=random.choice([24, 42, 48]),
                          max_power_kw=random.uniform(5.0, 20.0), typical_power_kw=random.uniform(2.0, 12.0), 
                          max_weight_kg=random.uniform(500.0, 1500.0),
                          cooling_type=random.choice(["Air", "Liquid", "Rear Door"]), 
                          pdu_a_id=f"PDU-A{random.randint(100, 999)}", pdu_b_id=f"PDU-B{random.randint(100, 999)}", 
                          order_index=i)
                racks.append(rk)
                db.add(rk)
        db.flush()

        # ── Vendors ───────────────────────────────────────────────────────────
        print("Seeding Vendors...")
        vendors = []
        vendor_names = ["Dell Technologies", "HPE", "Cisco", "Palo Alto Networks", "NetApp", "VMware", "F5 Networks", "Microsoft", "Oracle", "Pure Storage", "Arista", "Juniper"]
        for name in vendor_names:
            v = Vendor(
                name=name,
                organization=f"{name} Global Solutions Inc.",
                contact_email=f"support@{name.lower().replace(' ', '')}.com",
                contact_phone=fake.phone_number(),
                pc_info={
                    "hostname": f"VENDOR-{name[:3].upper()}-PC",
                    "ip": fake.ipv4(),
                    "serial": fake.uuid4()[:8].upper(),
                    "os": "Windows 11 Enterprise"
                },
                account_info={
                    "username": f"sysgrid_admin_{name[:3].lower()}",
                    "access_method": "CyberArk / JumpCloud",
                    "mfa": "Duo Security"
                },
                work_schedule="Mon-Fri 09:00-18:00 UTC",
                on_call_info={
                    "is_on_call": True,
                    "rotation_notes": "Quarterly Rotation"
                }
            )
            vendors.append(v)
            db.add(v)
        db.flush()

        # ── Devices ───────────────────────────────────────────────────────────
        print("Seeding Devices...")
        devices = []
        manufacturers = ["Dell", "HPE", "Cisco", "Palo Alto", "NetApp", "F5", "Supermicro", "Meinberg", "Arista"]
        systems = ["IT-Infra", "SAP ERP", "HR-Core", "Sales-B2B", "DevOps", "Financials"]
        
        for i in range(150): # Increased from 29 to 150 (~5x for high density)
            mfr = random.choice(manufacturers)
            sys_name = random.choice(systems)
            env = random.choice(["Production", "Staging", "QA", "Dev", "DR"])
            status = random.choice(["Active", "Planned", "Maintenance", "Standby"])
            
            d = Device(
                name=f"{sys_name.lower()}-{fake.word()}-{i:03d}",
                system=sys_name,
                type=random.choice(["Physical", "Virtual", "Switch", "Firewall", "Storage", "Load Balancer"]),
                status=status,
                environment=env,
                size_u=random.choice([1, 2, 4]),
                manufacturer=mfr,
                model=fake.word().upper() + "-" + str(random.randint(1000, 9999)),
                serial_number=fake.uuid4()[:12].upper(),
                asset_tag=f"AT-{random.randint(10000, 99999)}",
                primary_ip=fake.ipv4(),
                management_ip=fake.ipv4(),
                owner=random.choice(["ops-team", "dba-team", "netops", "security-team", "vmware-team"]),
                business_unit=random.choice(["Operations", "Engineering", "Finance", "HR", "Sales"]),
                vendor=mfr + " Technologies",
                purchase_date=datetime.now() - timedelta(days=random.randint(100, 1000)),
                warranty_end=datetime.now() + timedelta(days=random.randint(100, 1000)),
                power_max_w=random.uniform(100, 2000),
                power_typical_w=random.uniform(50, 1200),
                is_reservation=(random.random() < 0.1)
            )
            devices.append(d)
            db.add(d)
        db.flush()

        # ── Contracts ─────────────────────────────────────────────────────────
        print("Seeding Contracts...")
        contracts = []
        for v in vendors:
            for i in range(random.randint(1, 3)):
                c = VendorContract(
                    vendor_id=v.id,
                    contract_number=f"CON-{v.name[:3].upper()}-{random.randint(1000, 9999)}",
                    title=f"{v.name} {random.choice(['Enterprise Support', 'Managed Services', 'Hardware Maintenance'])}",
                    status=random.choice(["Active", "Draft", "Expired", "Negotiation"]),
                    start_date=datetime.now() - timedelta(days=random.randint(0, 500)),
                    end_date=datetime.now() + timedelta(days=random.randint(365, 1000)),
                    total_value=random.uniform(50000, 500000),
                    currency="USD",
                    sow_details_json=[
                        {"item": "24/7 Phone Support", "status": "Active"},
                        {"item": "NBD Hardware Replacement", "status": "Active"},
                        {"item": "Software Updates", "status": "Active"}
                    ]
                )
                contracts.append(c)
                db.add(c)
        db.flush()

        # ── Contract Coverage ─────────────────────────────────────────────────
        print("Seeding Contract Coverage Matrix...")
        for c in contracts:
            # Pick 10-20 random devices for each contract
            covered_devices = random.sample(devices, random.randint(10, 20))
            for d in covered_devices:
                cc = ContractCoverage(
                    contract_id=c.id,
                    device_id=d.id,
                    support_tier=random.choice(["NBD", "4-Hour", "Software-Only", "Mission Critical"]),
                    is_active=True
                )
                db.add(cc)
        db.flush()

        # ── Knowledge Base ────────────────────────────────────────────────────
        print("Seeding Knowledge Hub...")
        categories = ["Q&A", "Manual", "Instruction", "FAQ", "Best Practice"]
        for i in range(60): # High density KB
            k = KnowledgeEntry(
                category=random.choice(categories),
                title=fake.sentence(nb_words=6),
                content=fake.paragraph(nb_sentences=10),
                question_context=fake.paragraph(nb_sentences=3) if random.random() > 0.5 else None,
                is_answered=(random.random() > 0.3),
                verified_by=fake.name() if random.random() > 0.5 else None,
                tags=random.sample(["Network", "Database", "Security", "Storage", "Cloud", "Linux", "Windows"], random.randint(1, 3)),
                impacted_systems=random.sample(systems, random.randint(1, 2)),
                linked_device_ids=[d.id for d in random.sample(devices, random.randint(0, 3))]
            )
            db.add(k)
        db.flush()

        # ── Investigations ────────────────────────────────────────────────────
        print("Seeding Investigations...")
        for i in range(25):
            inv = Investigation(
                title=f"Incident Forensics: {fake.sentence(nb_words=4)}",
                problem_statement=fake.paragraph(nb_sentences=4),
                status=random.choice(["Analyzing", "Escalated", "Monitoring", "Resolved", "Closed"]),
                priority=random.choice(["Urgent", "High", "Medium", "Low"]),
                systems=random.sample(systems, random.randint(1, 2)),
                impacted_device_ids=[d.id for d in random.sample(devices, random.randint(1, 4))],
                assigned_team=random.choice(["ops-team", "dba-team", "netops", "security-team"]),
                trigger_event=fake.sentence(),
                root_cause=fake.paragraph() if random.random() > 0.5 else None,
                resolution_steps=fake.paragraph() if random.random() > 0.7 else None
            )
            db.add(inv)
            db.flush()
            
            # Add 3-7 progress pulses for each investigation
            for j in range(random.randint(3, 7)):
                prog = InvestigationProgress(
                    investigation_id=inv.id,
                    entry_text=fake.paragraph(nb_sentences=2),
                    entry_type=random.choice(["Update", "Evidence", "Milestone", "Escalation"]),
                    added_by=fake.name(),
                    timestamp=datetime.now() - timedelta(hours=random.randint(1, 100))
                )
                db.add(prog)
        db.flush()

        # ── DeviceLocations ───────────────────────────────────────────────────
        print("Seeding DeviceLocations...")
        # Fill racks with devices
        used_racks = random.sample(racks, min(len(racks), 100))
        for rk in used_racks:
            current_u = 1
            while current_u < rk.total_u_height - 4:
                d = random.choice(devices)
                # Check if device already placed
                existing = db.query(DeviceLocation).filter_by(device_id=d.id).first()
                if not existing:
                    loc = DeviceLocation(
                        device_id=d.id, rack_id=rk.id, 
                        start_unit=current_u, size_u=d.size_u, 
                        orientation="Front", depth="Full"
                    )
                    db.add(loc)
                    current_u += d.size_u + random.randint(0, 1)
                else:
                    current_u += 2
                if current_u > rk.total_u_height: break
        db.flush()

        # ── Hardware & Software ───────────────────────────────────────────────
        print("Seeding Hardware & Software Components...")
        for d in devices:
            # Components
            for _ in range(random.randint(2, 5)):
                db.add(HardwareComponent(
                    device_id=d.id, category=random.choice(["CPU", "Memory", "SSD", "NIC", "GPU"]),
                    name=fake.word().upper() + " Component", manufacturer=d.manufacturer,
                    specs=f"{random.randint(16, 128)}GB / {random.randint(2, 32)} Cores",
                    count=random.randint(1, 16)
                ))
            # Software
            for _ in range(random.randint(1, 3)):
                db.add(DeviceSoftware(
                    device_id=d.id, category=random.choice(["OS", "DB", "Agent", "App"]),
                    name=fake.word().capitalize(), version=f"{random.randint(1, 20)}.{random.randint(0, 9)}",
                    purpose=fake.catch_phrase()
                ))
        db.flush()

        # ── Network & Security ────────────────────────────────────────────────
        print("Seeding Network & Security...")
        for d in devices:
            if d.primary_ip:
                db.add(NetworkInterface(
                    device_id=d.id, name="eth0", mac_address=fake.mac_address(),
                    ip_address=d.primary_ip, vlan_id=random.randint(10, 200), link_speed_gbps=random.choice([1, 10, 25, 100])
                ))
        
        # Add random Firewall Rules
        for i in range(50):
            db.add(FirewallRule(
                name=f"Rule {fake.word().capitalize()} {i}",
                risk=fake.sentence(),
                source_type=random.choice(["Any", "Subnet", "Device", "Custom IP"]),
                dest_type=random.choice(["Any", "Subnet", "Device", "Custom IP"]),
                protocol=random.choice(["TCP", "UDP", "ICMP", "Any"]),
                port_range=str(random.randint(20, 65535)),
                direction=random.choice(["Inbound", "Outbound"]),
                action=random.choice(["Allow", "Deny"]),
                status="Active"
            ))
        db.flush()

        # ── Monitoring & Incidents ────────────────────────────────────────────
        print("Seeding Monitoring & Incidents...")
        for _ in range(40):
            d = random.choice(devices)
            db.add(MonitoringItem(
                device_id=d.id, category=random.choice(["Availability", "Performance", "Capacity", "Security"]),
                status=random.choice(["OK", "Warning", "Critical"]),
                title=fake.sentence(nb_words=4), platform="Prometheus",
                logic=fake.sentence(), owner=d.owner
            ))

        for _ in range(15):
            d_impacted = random.sample(devices, random.randint(1, 5))
            db.add(IncidentLog(
                title=f"Incident: {fake.sentence(nb_words=5)}",
                severity=random.choice(["Critical", "Major", "Minor"]),
                status="Resolved", systems=random.sample(systems, 1),
                impacted_device_ids=[d.id for d in d_impacted],
                reporter=fake.name(), start_time=datetime.now() - timedelta(days=random.randint(1, 30)),
                end_time=datetime.now() - timedelta(days=random.randint(0, 1)),
                initial_symptoms=fake.paragraph(), root_cause=fake.paragraph(),
                resolution_steps=fake.paragraph()
            ))
        db.flush()

        # ── Audit Logs ────────────────────────────────────────────────────────
        print("Seeding Audit Logs...")
        for _ in range(100):
            db.add(AuditLog(
                user_id=fake.user_name(), action=random.choice(["CREATE", "UPDATE", "DELETE"]),
                target_table=random.choice(["devices", "racks", "logical_services", "vendors"]),
                target_id=str(random.randint(1, 200)), description=fake.sentence()
            ))

        db.commit()
        print("Seed complete.")
        print(f"  Sites: {len(sites)} | Racks: {len(racks)} | Devices: {len(devices)}")
        print(f"  Vendors: {len(vendors)} | Contracts: {len(contracts)} | KB: 60 | Investigations: 25")


if __name__ == "__main__":
    seed()
