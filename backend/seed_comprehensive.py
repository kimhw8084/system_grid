import asyncio
import random
from httpx import AsyncClient, ASGITransport
import sys
import os
from datetime import datetime, timedelta

# Add parent dir to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import engine, Base

async def clear_db():
    print("Wiping database...")
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "system_grid.db")
    if os.path.exists(db_path):
        os.remove(db_path)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database wiped and tables recreated.")

def random_date(start_days_ago, end_days_ahead=0):
    start = datetime.now() - timedelta(days=start_days_ago)
    if end_days_ahead > 0:
        end = datetime.now() + timedelta(days=end_days_ahead)
    else:
        end = datetime.now()
    delta = end - start
    int_delta = (delta.days * 24 * 60 * 60) + delta.seconds
    random_second = random.randrange(int_delta)
    return (start + timedelta(seconds=random_second)).isoformat()

async def seed():
    print("Starting comprehensive data seeding...")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", timeout=60.0) as ac:
        # 1. Initialize Settings
        print("Initializing settings...")
        await ac.get("/api/v1/settings/initialize")
        
        # 2. Create Sites
        print("Creating sites...")
        site_ids = []
        site_names = ["Austin DataCenter", "Singapore Edge", "Frankfurt HUB", "Tokyo DR", "London R&D"]
        for name in site_names:
            res = await ac.post("/api/v1/sites/", json={
                "name": name, 
                "address": f"{random.randint(100, 999)} Tech Way, {name} Sector",
                "facility_manager": f"Manager {random.randint(1, 10)}",
                "contact_phone": f"+1-{random.randint(100, 999)}-555-{random.randint(1000, 9999)}",
                "cooling_capacity_kw": float(random.randint(500, 2000)),
                "power_capacity_kw": float(random.randint(1000, 5000))
            })
            if res.status_code != 200:
                print(f"BUG in POST /sites/: {res.text}")
                continue
            site_ids.append(res.json()["id"])
            
        # 3. Create Racks for each site
        print("Creating racks...")
        rack_ids = []
        for site_id in site_ids:
            for i in range(1, 4):
                res = await ac.post("/api/v1/racks/", json={
                    "name": f"RACK-{site_id}-{i:02d}",
                    "site_id": site_id,
                    "total_u_height": 42,
                    "max_power_kw": 12.5,
                    "typical_power_kw": 6.0,
                    "max_weight_kg": 1200.0,
                    "cooling_type": "Hot Aisle Containment",
                    "pdu_a_id": f"PDU-A-{site_id}-{i:02d}",
                    "pdu_b_id": f"PDU-B-{site_id}-{i:02d}"
                })
                if res.status_code != 200:
                    print(f"BUG in POST /racks/: {res.text}")
                    continue
                rack_ids.append(res.json()["id"])
        
        # 4. Create Devices and mount them
        print("Creating devices and mounting them...")
        device_ids = []
        systems = ["SAP-ERP", "HR-CORE", "SALES-B2B", "IT-INFRA", "DEVOPS-CI", "GRID-PLATFORM"]
        device_types = ["Physical", "Virtual", "Storage", "Switch", "Firewall", "Load Balancer"]
        
        for rack_id in rack_ids:
            u_pointer = 1
            while u_pointer < 38:
                size_u = random.randint(1, 2)
                d_type = random.choice(device_types)
                d_name = f"SRV-{rack_id}-{u_pointer:02d}-{random.randint(100, 999)}"
                
                install_date = random_date(365*3)
                purchase_date = (datetime.fromisoformat(install_date) - timedelta(days=random.randint(14, 60))).isoformat()
                
                # Create device
                dev_payload = {
                    "name": d_name,
                    "system": random.choice(systems),
                    "type": d_type,
                    "status": "Active",
                    "environment": random.choice(["Production", "Staging", "QA", "Dev"]),
                    "owner": "Infrastructure Team",
                    "business_unit": random.choice(["Engineering", "Operations", "Finance", "HR", "Sales"]),
                    "manufacturer": random.choice(["Dell", "HP", "Supermicro", "Cisco"]),
                    "model": "PowerEdge R740" if d_type == "Physical" else "ProLiant DL380",
                    "serial_number": f"SN-{random.randint(100000, 999999)}",
                    "asset_tag": f"AT-{random.randint(100000, 999999)}",
                    "part_number": f"PN-{random.randint(1000, 9999)}",
                    "power_typical_w": float(random.randint(200, 600)),
                    "power_max_w": 850.0,
                    "os_name": "Ubuntu" if d_type in ["Physical", "Virtual"] else "Custom Firmware",
                    "os_version": "24.04 LTS" if d_type in ["Physical", "Virtual"] else "v1.2.3",
                    "primary_ip": f"10.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
                    "management_ip": f"192.168.{random.randint(0, 255)}.{random.randint(1, 254)}",
                    "management_url": f"https://ilo-{d_name}.internal.grid",
                    "vendor": "Strategic Hardware Corp",
                    "purchase_order": f"PO-{random.randint(10000, 99999)}",
                    "cost_center": f"CC-{random.randint(100, 999)}",
                    "purchase_date": purchase_date,
                    "install_date": install_date,
                    "warranty_end": random_date(-365, 365*2),
                    "eol_date": random_date(-365, 365*5),
                    "metadata_json": {
                        "project_code": "PROJ-ALPHA",
                        "maintenance_priority": "High",
                        "backup_enabled": True,
                        "monitoring_tier": "Gold"
                    }
                }
                dev_res = await ac.post("/api/v1/devices/", json=dev_payload)
                
                if dev_res.status_code == 200:
                    dev_data = dev_res.json()
                    dev_id = dev_data["id"]
                    device_ids.append(dev_id)
                    
                    # Mount device
                    await ac.post(f"/api/v1/racks/{rack_id}/mount", json={
                        "device_id": dev_id,
                        "start_u": u_pointer,
                        "size_u": size_u
                    })

                    # Add hardware components
                    await ac.post(f"/api/v1/devices/{dev_id}/hardware", json={
                        "category": "CPU", "name": "Intel Xeon Gold 6248R", "count": 2, "manufacturer": "Intel", "specs": "24C/48T 3.0GHz", "serial_number": f"CPU-{random.randint(1000, 9999)}"
                    })
                    await ac.post(f"/api/v1/devices/{dev_id}/hardware", json={
                        "category": "Memory", "name": "64GB DDR4 ECC RDIMM", "count": 16, "manufacturer": "Samsung", "specs": "2933MT/s", "serial_number": f"MEM-{random.randint(1000, 9999)}"
                    })
                    await ac.post(f"/api/v1/devices/{dev_id}/hardware", json={
                        "category": "Disk", "name": "3.84TB NVMe SSD", "count": 4, "manufacturer": "Micron", "specs": "Gen4 x4", "serial_number": f"DSK-{random.randint(1000, 9999)}"
                    })
                    
                    # Add Secrets
                    await ac.post(f"/api/v1/devices/{dev_id}/secrets", json={
                        "secret_type": "Root Password",
                        "username": "root",
                        "encrypted_payload": "Encrypted_Hash_XYZ",
                        "notes": "Emergency access only"
                    })
                    await ac.post(f"/api/v1/devices/{dev_id}/secrets", json={
                        "secret_type": "ILO/IDRAC",
                        "username": "admin",
                        "encrypted_payload": "Management_Pass_123",
                        "notes": "OOB access"
                    })
                    
                    # Add services
                    if d_type in ["Physical", "Virtual"]:
                        # Database service
                        await ac.post("/api/v1/logical-services/", json={
                            "name": f"DB-{d_name}",
                            "service_type": "Database",
                            "status": "Running",
                            "device_id": dev_id,
                            "environment": dev_payload["environment"],
                            "version": "PostgreSQL 16.2",
                            "config_json": {"engine": "PostgreSQL", "port": 5432, "instance_name": "GRID_MASTER", "dbname": "core_db"},
                            "license_type": "Open Source",
                            "purchase_type": "Free",
                            "vendor": "Community",
                            "cost": 0.0
                        })
                        # Web service
                        await ac.post("/api/v1/logical-services/", json={
                            "name": f"WEB-{d_name}",
                            "service_type": "Web Server",
                            "status": "Running",
                            "device_id": dev_id,
                            "environment": dev_payload["environment"],
                            "version": "Nginx 1.25",
                            "config_json": {"server_type": "Nginx", "port": 443, "ssl": "True", "app_pool": "Frontend"},
                            "license_type": "Proprietary",
                            "license_key": f"KEY-{random.randint(1000, 9999)}-XXXX",
                            "purchase_type": "Subscription",
                            "purchase_date": purchase_date,
                            "expiry_date": random_date(-30, 365),
                            "vendor": "WebTech Solutions",
                            "cost": 1200.0
                        })
                        # Internal App
                        await ac.post("/api/v1/logical-services/", json={
                            "name": f"APP-INT-{d_name}",
                            "service_type": "Internal App",
                            "status": "Running",
                            "device_id": dev_id,
                            "environment": dev_payload["environment"],
                            "version": "v1.4.2",
                            "config_json": {"Repository": "github.com/org/repo", "Framework": "React/Node", "Primary Dev": "Team Alpha", "CI/CD Pipeline": "GitHub Actions"},
                            "purchase_type": "Free",
                            "cost": 0.0
                        })
                        # External App
                        await ac.post("/api/v1/logical-services/", json={
                            "name": f"APP-EXT-{d_name}",
                            "service_type": "External App",
                            "status": "Running",
                            "device_id": dev_id,
                            "environment": dev_payload["environment"],
                            "version": "2024.1",
                            "config_json": {"Vendor Support URL": "support.vendor.com", "Account Manager": "John Doe", "Support Tier": "Gold 24/7"},
                            "purchase_type": "Subscription",
                            "vendor": "Enterprise SaaS Corp",
                            "cost": 5000.0,
                            "currency": "USD"
                        })
                    
                    u_pointer += size_u + random.randint(1, 2)
                else:
                    print(f"BUG in POST /devices/: {dev_res.text}")
        
        # 5. Create Relationships
        print("Creating dependency vectors...")
        for _ in range(40):
            source_id = random.choice(device_ids)
            target_id = random.choice(device_ids)
            if source_id == target_id: continue
            
            await ac.post(f"/api/v1/devices/{source_id}/relationships", json={
                "target_device_id": target_id,
                "relationship_type": "Depends On",
                "source_role": "Consumer",
                "target_role": "Provider",
                "notes": "Core infrastructure dependency"
            })

        # 6. Create Incidents
        print("Creating incidents...")
        for _ in range(15):
            dev_id = random.choice(device_ids)
            # Find the system for this device to keep data consistent
            dev_sys_res = await ac.get(f"/api/v1/devices/")
            all_devs = dev_sys_res.json()
            target_dev = next((d for d in all_devs if d["id"] == dev_id), None)
            dev_system = target_dev["system"] if target_dev else "IT-INFRA"

            status = random.choice(["Investigating", "Identified", "Monitoring", "Resolved"])
            severity = random.choice(["Critical", "Major", "Minor"])
            
            await ac.post("/api/v1/incidents/", json={
                "systems": [dev_system],
                "impacted_device_ids": [dev_id],
                "title": f"Intermittent {random.choice(['Latency', 'Packet Loss', 'Disk Pressure', 'CPU Spike'])} on {dev_system}",
                "severity": severity,
                "status": status,
                "start_time": random_date(7),
                "initial_symptoms": "Automated telemetry detected performance degradation.",
                "impacts": [random.choice(["Throughput Slow-down", "Data Integrity Risk", "Yield Degradation"])],
                "impact_analysis": "Impacted specific microservices hosted on this node.",
                "root_cause": "Under investigation by infrastructure team.",
                "timeline": [
                    {"time": random_date(1), "event": "Alert triggered by monitoring system", "type": "Error"}
                ],
                "todos": [
                    {"task": "Run diagnostic scripts", "status": "Pending", "owner": "On-Call"}
                ]
            })

    print("Seeding complete. Matrix synchronized.")

if __name__ == "__main__":
    asyncio.run(clear_db())
    asyncio.run(seed())
