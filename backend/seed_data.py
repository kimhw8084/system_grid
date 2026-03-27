import asyncio
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import AsyncSessionLocal, engine
from backend.app.models import models

async def seed():
    async with AsyncSessionLocal() as db:
        print("Cleaning up old data...")

        # 1. Sites & Rooms
        print("Seeding Sites & Rooms...")
        site1 = models.Site(name="North America HQ", address="123 Tech Way, Palo Alto, CA")
        site2 = models.Site(name="EMEA Data Center", address="456 Fiber Lane, Frankfurt, DE")
        site3 = models.Site(name="APAC Edge", address="789 Cloud St, Singapore")
        db.add_all([site1, site2, site3])
        await db.flush()

        room1 = models.Room(site_id=site1.id, name="DC-01", floor_level="Level 2")
        room2 = models.Room(site_id=site1.id, name="Lab-Alpha", floor_level="Level 1")
        room3 = models.Room(site_id=site2.id, name="Hall-A", floor_level="Ground")
        db.add_all([room1, room2, room3])
        await db.flush()

        # 2. Racks
        print("Seeding Racks...")
        # Normal Racks
        r1 = models.Rack(room_id=room1.id, name="R-01", total_u_height=42, max_power_kw=12.0)
        r2 = models.Rack(room_id=room1.id, name="R-02", total_u_height=42, max_power_kw=12.0)
        # Small Rack
        r3 = models.Rack(room_id=room2.id, name="LAB-RACK", total_u_height=24, max_power_kw=5.0)
        # Purged Rack
        r4 = models.Rack(room_id=room3.id, name="OLD-RACK", total_u_height=42, is_deleted=True)
        racks = [r1, r2, r3, r4]
        db.add_all(racks)
        await db.flush()

        # 3. Devices (Assets)
        print("Seeding Devices...")
        # Physical Servers
        d1 = models.Device(name="PROD-WEB-01", system="E-Commerce", type="Physical", manufacturer="Dell", model="R740", serial_number="ABC12345", os_name="Ubuntu", os_version="22.04 LTS", environment="Production", status="Active", size_u=2)
        d2 = models.Device(name="PROD-DB-01", system="E-Commerce", type="Physical", manufacturer="HP", model="DL380 Gen10", serial_number="XYZ789", os_name="RedHat", os_version="9.2", environment="Production", status="Active", size_u=2)
        d3 = models.Device(name="DEV-APP-01", system="Internal", type="Physical", manufacturer="Supermicro", model="AS-1114S", os_name="Debian", os_version="12", environment="Dev", status="Active", size_u=1)
        
        # Network Switch
        d4 = models.Device(name="CORE-SW-01", system="Infrastructure", type="Switch", manufacturer="Cisco", model="Nexus 9k", environment="Production", status="Active", size_u=1)
        
        # Unplaced Device
        d5 = models.Device(name="SPARE-SRV-01", system="Stock", type="Physical", manufacturer="Dell", model="R640", environment="Production", status="In Stock", size_u=1)
        
        # Decommissioned (Purged) Device
        d6 = models.Device(name="LEGACY-SRV-99", system="Legacy", type="Physical", is_deleted=True, status="Decommissioned", size_u=2)

        devices = [d1, d2, d3, d4, d5, d6]
        db.add_all(devices)
        await db.flush()

        # 4. Device Locations (Mounting)
        print("Mounting Devices in Racks...")
        locs = [
            models.DeviceLocation(device_id=d1.id, rack_id=r1.id, start_unit=1, size_u=2),
            models.DeviceLocation(device_id=d2.id, rack_id=r1.id, start_unit=3, size_u=2),
            models.DeviceLocation(device_id=d3.id, rack_id=r3.id, start_unit=10, size_u=1),
            models.DeviceLocation(device_id=d4.id, rack_id=r1.id, start_unit=42, size_u=1),
        ]
        db.add_all(locs)
        await db.flush()

        # 5. Hardware Components
        print("Adding Hardware Components...")
        db.add_all([
            models.HardwareComponent(device_id=d1.id, category="CPU", name="Intel Xeon Gold 6230", count=2),
            models.HardwareComponent(device_id=d1.id, category="Memory", name="DDR4 3200MHz", specs="256GB (16x16GB)", count=16),
            models.HardwareComponent(device_id=d2.id, category="Disk", name="NVMe SSD", specs="3.84TB Enterprise", count=4),
        ])

        # 6. Secrets
        print("Adding Secrets...")
        db.add_all([
            models.SecretVault(device_id=d1.id, secret_type="Root Password", username="root", encrypted_payload="ENC:P@ssword123"),
            models.SecretVault(device_id=d4.id, secret_type="ILO/IDRAC", username="admin", encrypted_payload="ENC:Admin9900"),
        ])

        # 7. Logical Services
        print("Seeding Logical Services...")
        s1 = models.LogicalService(device_id=d1.id, name="Ubuntu 22.04 LTS", service_type="OS", status="Active", environment="Production", config_json={})
        s2 = models.LogicalService(device_id=d2.id, name="RedHat 9.2", service_type="OS", status="Active", environment="Production", config_json={})
        s3 = models.LogicalService(device_id=d1.id, name="Nginx Frontend", service_type="Web Server", status="Active", environment="Production", config_json={"ports": [80, 443]})
        s4 = models.LogicalService(device_id=d2.id, name="PostgreSQL Cluster", service_type="Database", status="Active", environment="Production", config_json={"port": 5432, "version": "15.4"})
        s5 = models.LogicalService(name="Old API v1", service_type="Software", status="Stopped", is_deleted=True)
        db.add_all([s1, s2, s3, s4, s5])
        await db.flush()

        # 8. Network Connections
        print("Establishing Network Fabric...")
        db.add_all([
            models.PortConnection(source_device_id=d1.id, source_port="eno1", target_device_id=d4.id, target_port="Eth1/1", purpose="Data", speed_gbps=10, unit="Gbps"),
            models.PortConnection(source_device_id=d2.id, source_port="eno1", target_device_id=d4.id, target_port="Eth1/2", purpose="Data", speed_gbps=10, unit="Gbps"),
            models.PortConnection(source_device_id=d3.id, source_port="eth0", target_device_id=d1.id, target_port="eno2", purpose="Management", speed_gbps=1, unit="Gbps"),
        ])

        # 9. Monitoring Matrix
        print("Configuring Monitoring...")
        db.add_all([
            models.MonitoringItem(device_id=d1.id, category="Hardware", status="Existing", title="CPU Thermal Monitoring", platform="Zabbix", notification_method="Email"),
            models.MonitoringItem(device_id=d2.id, category="Log", status="Existing", title="DB Slow Query Analysis", platform="ELK Stack", logic="SELECT * FROM pg_stat_activity WHERE duration > 5s"),
            models.MonitoringItem(device_id=d4.id, category="Network", status="Planned", title="Port Utilization Thresholds", platform="Prometheus", notification_method="Slack"),
        ])

        # 10. Audit Logs
        print("Adding representative Audit Logs...")
        db.add_all([
            models.AuditLog(user_id="admin", action="CREATE", target_table="sites", target_id=str(site1.id), description="Initialized main HQ site"),
            models.AuditLog(user_id="admin", action="MOUNT", target_table="devices", target_id=str(d1.id), description=f"Deployed PROD-WEB-01 to rack R-01"),
            models.AuditLog(user_id="admin", action="UPDATE", target_table="logical_services", target_id=str(s4.id), description="Adjusted PostgreSQL memory limits"),
        ])

        await db.commit()
        print("Seed complete! System Grid is now populated with diverse test scenarios.")

if __name__ == "__main__":
    asyncio.run(seed())
