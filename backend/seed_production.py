import asyncio
import random
from httpx import AsyncClient, ASGITransport
import sys
import os

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

async def seed():
    print("Starting production-level seeding...")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test", timeout=60.0) as ac:
        # 1. Initialize Settings
        print("Initializing settings...")
        await ac.get("/api/v1/settings/initialize")
        
        # 2. Create Sites
        print("Creating sites...")
        site_ids = []
        site_names = ["Austin DataCenter", "Singapore Edge", "Frankfurt HUB", "Tokyo DR", "London R&D"]
        for name in site_names:
            res = await ac.post("/api/v1/sites/", json={"name": name, "address": f"Strategic location for {name}"})
            if res.status_code != 200:
                print(f"BUG FOUND in POST /sites/: {res.text}")
                continue
            site_ids.append(res.json()["id"])
            
        # 3. Create Racks for each site
        print("Creating racks...")
        rack_ids = []
        for site_id in site_ids:
            for i in range(1, 6):
                res = await ac.post("/api/v1/racks/", json={
                    "name": f"RACK-{site_id}-{i:02d}",
                    "site_id": site_id,
                    "total_u": 42,
                    "max_power_kw": 12.5
                })
                if res.status_code != 200:
                    print(f"BUG FOUND in POST /racks/: {res.text}")
                    continue
                rack_ids.append(res.json()["id"])
        
        # 4. Create Devices and mount them
        print("Creating devices and mounting them...")
        device_ids = []
        systems = ["SAP-ERP", "HR-CORE", "SALES-B2B", "IT-INFRA", "DEVOPS-CI", "GRID-PLATFORM"]
        device_types = ["Physical", "Virtual", "Storage", "Switch", "Firewall", "Load Balancer"]
        
        for rack_id in rack_ids:
            u_pointer = 1
            while u_pointer < 35:
                size_u = random.randint(1, 4)
                d_type = random.choice(device_types)
                d_name = f"SRV-{rack_id}-{u_pointer:02d}-{random.randint(100, 999)}"
                
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
                    "power_typical_w": random.randint(200, 600),
                    "power_max_w": 800,
                    "os_name": "Ubuntu" if d_type in ["Physical", "Virtual"] else None,
                    "os_version": "22.04 LTS" if d_type in ["Physical", "Virtual"] else None,
                }
                dev_res = await ac.post("/api/v1/devices/", json=dev_payload)
                
                if dev_res.status_code == 200:
                    dev_data = dev_res.json()
                    dev_id = dev_data["id"]
                    device_ids.append(dev_id)
                    
                    # Mount device
                    mount_res = await ac.post(f"/api/v1/racks/{rack_id}/mount", json={
                        "device_id": dev_id,
                        "start_u": u_pointer,
                        "size_u": size_u
                    })
                    if mount_res.status_code != 200:
                        print(f"BUG FOUND in POST /racks/{rack_id}/mount: {mount_res.text}")

                    # Add hardware components
                    await ac.post(f"/api/v1/devices/{dev_id}/hardware", json={
                        "category": "CPU", "name": "Intel Xeon Gold 6248R", "count": 2, "manufacturer": "Intel", "specs": "24C/48T 3.0GHz"
                    })
                    await ac.post(f"/api/v1/devices/{dev_id}/hardware", json={
                        "category": "Memory", "name": "64GB DDR4 ECC RDIMM", "count": 8, "manufacturer": "Samsung", "specs": "2933MT/s"
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
                            "config_json": {"engine": "PostgreSQL", "port": 5432, "version": "15.4", "dbname": "inventory_prod"}
                        })
                        # Web service
                        await ac.post("/api/v1/logical-services/", json={
                            "name": f"WEB-{d_name}",
                            "service_type": "Web Server",
                            "status": "Running",
                            "device_id": dev_id,
                            "environment": dev_payload["environment"],
                            "config_json": {"server_type": "Nginx", "port": 443, "ssl": "True"}
                        })
                    
                    u_pointer += size_u + random.randint(1, 2)
                else:
                    print(f"BUG FOUND in POST /devices/: {dev_res.text}")
        
        # 5. Create Network Connections
        print("Creating network connections...")
        for _ in range(70):
            a_id = random.choice(device_ids)
            b_id = random.choice(device_ids)
            if a_id == b_id: continue
            
            conn_res = await ac.post("/api/v1/networks/connections", json={
                "device_a_id": a_id,
                "source_port": f"Gi0/{random.randint(1, 24)}",
                "device_b_id": b_id,
                "target_port": f"Gi0/{random.randint(1, 24)}",
                "speed_gbps": random.choice([1, 10, 40, 100]),
                "purpose": random.choice(["Data", "Management", "Storage", "Backup"]),
                "direction": "Bidirectional",
                "cable_type": "Fiber"
            })
            if conn_res.status_code != 200:
                print(f"BUG FOUND in POST /networks/connections: {conn_res.text}")
            
        # 6. Create Monitoring Items
        print("Creating monitoring items...")
        for dev_id in random.sample(device_ids, 50):
            mon_res = await ac.post("/api/v1/monitoring/", json={
                "device_id": dev_id,
                "category": random.choice(["Hardware", "App", "Network"]),
                "status": "Existing",
                "title": f"Health Check for Node {dev_id}",
                "platform": random.choice(["Prometheus", "Zabbix", "Datadog"]),
                "purpose": "Production Availability Monitoring",
                "notification_method": "Slack"
            })
            if mon_res.status_code != 200:
                print(f"BUG FOUND in POST /monitoring/: {mon_res.text}")

        # 7. Create Incidents
        print("Creating incidents...")
        incidents = [
            {
                "title": "Database Connection Pool Exhaustion",
                "severity": "Critical",
                "status": "Resolved",
                "impact_analysis": "Primary ERP system unavailable for 45 minutes. Affected 400+ concurrent users.",
                "root_cause": "Misconfigured max_connections in PostgreSQL coupled with a leaked connection in the reporting service.",
                "resolution_steps": "1. Identified leaked connection using pg_stat_activity.\n2. Restarted reporting service to clear pool.\n3. Increased max_connections to 500.",
                "lessons_learned": "Connection pool monitoring thresholds were too high to trigger early alerts.",
                "prevention_strategy": "Implement automated connection leak detection and reduce pool size timeout.",
                "timeline": [
                    {"time": "2026-03-27T10:00:00", "event": "Alert triggered: DB connection latency high", "type": "Error"},
                    {"time": "2026-03-27T10:15:00", "event": "War room established. Identified pool exhaustion.", "type": "Info"},
                    {"time": "2026-03-27T10:45:00", "event": "Services restored after configuration update.", "type": "Success"}
                ],
                "todos": [
                    {"task": "Update terraform configs for PG limits", "status": "Verified", "owner": "DBA"},
                    {"task": "Audit reporting service code for leaks", "status": "Progress", "owner": "DevOps"}
                ]
            },
            {
                "title": "Kernel Panic on Core Switch",
                "severity": "Critical",
                "status": "Monitoring",
                "impact_analysis": "Partial network isolation for Frankfurt HUB site. Intermittent packet loss for 2 hours.",
                "root_cause": "BGP convergence bug in firmware version 15.2(4)M6.",
                "resolution_steps": "1. Failed over to secondary switch.\n2. Rebooted primary switch with restricted routing tables.",
                "lessons_learned": "Firmware consistency across redundant pairs is mandatory.",
                "prevention_strategy": "Upgrade all core switches to stable release 15.5(3)S during next maintenance window.",
                "timeline": [
                    {"time": "2026-03-27T14:00:00", "event": "Frankfurt HUB site reported unreachable.", "type": "Error"},
                    {"time": "2026-03-27T14:30:00", "event": "Engineers on site. Switch rebooted.", "type": "Warning"}
                ],
                "todos": [
                    {"task": "Schedule global firmware audit", "status": "Pending", "owner": "NetEng"}
                ]
            },
            {
                "title": "API Rate Limit Breach - External Provider",
                "severity": "Major",
                "status": "Investigating",
                "impact_analysis": "Third-party integration for payment processing failing for 15% of transactions.",
                "root_cause": "Unexpected traffic spike from new marketing campaign.",
                "resolution_steps": "In progress - Coordinating with provider to increase tier.",
                "lessons_learned": "Need better synchronization between marketing and engineering on campaign schedules.",
                "prevention_strategy": "Implement local caching for non-critical provider lookups.",
                "timeline": [
                    {"time": "2026-03-27T22:00:00", "event": "Payment gateway status: 429 Too Many Requests", "type": "Error"}
                ],
                "todos": []
            }
        ]
        
        for inc_payload in incidents:
            target_dev = random.choice(device_ids)
            inc_payload["device_id"] = target_dev
            inc_res = await ac.post("/api/v1/incidents/", json=inc_payload)
            if inc_res.status_code != 200:
                print(f"BUG FOUND in POST /incidents/: {inc_res.text}")

        # 8. Create Data Flows
        print("Creating data flows...")
        flows = [
            {
                "name": "Global SAP ERP Transaction Matrix",
                "description": "Primary data vector for core financial and logistics transactions.",
                "category": "System",
                "nodes": [
                    {"id": "node-1", "type": "assetNode", "position": {"x": 100, "y": 100}, "data": {"label": "SAP-PROD-APP-01", "type": "Physical", "system": "SAP-ERP"}},
                    {"id": "node-2", "type": "serviceNode", "position": {"x": 400, "y": 150}, "data": {"label": "SAP-PRIMARY-DB", "service_type": "Database", "status": "Active"}},
                    {"id": "node-3", "type": "processNode", "position": {"x": 250, "y": 250}, "data": {"label": "AUTH_VALIDATION"}}
                ],
                "edges": [
                    {"id": "edge-1", "source": "node-1", "target": "node-3", "animated": True},
                    {"id": "edge-2", "source": "node-3", "target": "node-2", "animated": True}
                ]
            }
        ]
        for flow in flows:
            await ac.post("/api/v1/data-flows/", json=flow)

    print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(clear_db())
    asyncio.run(seed())
