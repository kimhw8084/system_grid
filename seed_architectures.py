import asyncio
import json
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.app.database import AsyncSessionLocal, engine, Base
from backend.app.models import models

async def clear_existing_data(db: AsyncSession):
    print("Cleaning existing architecture and network data...")
    # Order matters due to foreign keys if enforced, though we use CASCADE often
    await db.execute(delete(models.DataFlow))
    await db.execute(delete(models.PortConnection))
    await db.execute(delete(models.LogicalService))
    await db.execute(delete(models.ExternalEntity))
    # We keep devices but might want to clear them for a fresh start if they match our seed names
    await db.commit()

async def seed_complex_architecture():
    async with AsyncSessionLocal() as db:
        await clear_existing_data(db)

        # 1. Create Core Infrastructure Devices
        print("Seeding cluster devices...")
        devices = [
            models.Device(name="LB-PROD-01", type="Virtual", system="EDGE-NETWORK", status="Active", environment="Production", primary_ip="10.0.1.5", serial_number="LB-SN-01", asset_tag="LB-AT-01"),
            models.Device(name="LB-PROD-02", type="Virtual", system="EDGE-NETWORK", status="Active", environment="Production", primary_ip="10.0.1.6", serial_number="LB-SN-02", asset_tag="LB-AT-02"),
            models.Device(name="WEB-PROD-CLUSTER-01", type="Physical", system="ERP-FRONTEND", status="Active", environment="Production", primary_ip="10.0.2.10", serial_number="WEB-SN-01", asset_tag="WEB-AT-01"),
            models.Device(name="WEB-PROD-CLUSTER-02", type="Physical", system="ERP-FRONTEND", status="Active", environment="Production", primary_ip="10.0.2.11", serial_number="WEB-SN-02", asset_tag="WEB-AT-02"),
            models.Device(name="APP-AUTH-SRV", type="Virtual", system="IDENTITY-CORE", status="Active", environment="Production", primary_ip="10.0.5.50", serial_number="AUTH-SN-01", asset_tag="AUTH-AT-01"),
            models.Device(name="DB-SQL-PRIMARY", type="Physical", system="ERP-DATA", status="Active", environment="Production", primary_ip="10.0.10.100", serial_number="DB-SN-01", asset_tag="DB-AT-01"),
            models.Device(name="DB-SQL-REPLICA", type="Physical", system="ERP-DATA", status="Active", environment="Production", primary_ip="10.0.10.101", serial_number="DB-SN-02", asset_tag="DB-AT-02"),
        ]
        db.add_all(devices)
        await db.commit()
        for d in devices: await db.refresh(d)
        
        dev_map = {d.name: d for d in devices}

        # 2. Create External Entities
        print("Seeding external IQ entities...")
        externals = [
            models.ExternalEntity(
                name="STRIPE-PAYMENT-API", 
                type="API", 
                owner_organization="Stripe Inc.", 
                environment="Production",
                status="Active",
                metadata_json={"hostname": "api.stripe.com", "ip_address": "3.18.12.50", "auth_type": "OAuth2", "version": "v3"},
                description="Global Payment Processor"
            ),
            models.ExternalEntity(
                name="AUTH0-IDP", 
                type="API", 
                owner_organization="Okta", 
                environment="Production",
                status="Active",
                metadata_json={"hostname": "auth.sysgrid.io", "ip_address": "35.12.5.1", "protocol": "OIDC"},
                description="External Identity Provider"
            ),
        ]
        db.add_all(externals)
        await db.commit()
        for e in externals: await db.refresh(e)
        ext_map = {e.name: e for e in externals}

        # 3. Create Logical Services
        print("Seeding logical services...")
        services = [
            models.LogicalService(name="NGINX-HA", service_type="Web", device_id=dev_map["LB-PROD-01"].id, status="Active", version="1.24.0"),
            models.LogicalService(name="ERP-CORE-API", service_type="Middleware", device_id=dev_map["WEB-PROD-CLUSTER-01"].id, status="Active", version="v4.2.1"),
            models.LogicalService(name="ERP-CORE-API", service_type="Middleware", device_id=dev_map["WEB-PROD-CLUSTER-02"].id, status="Active", version="v4.2.1"),
            models.LogicalService(name="KEYCLOAK-IAM", service_type="Security", device_id=dev_map["APP-AUTH-SRV"].id, status="Active", version="21.0"),
            models.LogicalService(name="POSTGRES-PRD", service_type="Database", device_id=dev_map["DB-SQL-PRIMARY"].id, status="Active", version="15.4"),
        ]
        db.add_all(services)
        await db.commit()

        # 4. Create Port Connections (The "Telemetry" that powers the drill-down)
        print("Seeding port telemetry...")
        conns = [
            # LB to Web
            models.PortConnection(source_device_id=dev_map["LB-PROD-01"].id, target_device_id=dev_map["WEB-PROD-CLUSTER-01"].id, source_port="TCP/443", target_port="TCP/8080", link_type="HTTP", purpose="Traffic Forwarding", speed_gbps=10.0, created_by_user_id="seed"),
            models.PortConnection(source_device_id=dev_map["LB-PROD-01"].id, target_device_id=dev_map["WEB-PROD-CLUSTER-02"].id, source_port="TCP/443", target_port="TCP/8080", link_type="HTTP", purpose="Traffic Forwarding", speed_gbps=10.0, created_by_user_id="seed"),
            # Web to DB
            models.PortConnection(source_device_id=dev_map["WEB-PROD-CLUSTER-01"].id, target_device_id=dev_map["DB-SQL-PRIMARY"].id, source_port="TCP/50212", target_port="TCP/5432", link_type="SQL", purpose="Primary DB Access", speed_gbps=40.0, created_by_user_id="seed"),
            models.PortConnection(source_device_id=dev_map["WEB-PROD-CLUSTER-02"].id, target_device_id=dev_map["DB-SQL-PRIMARY"].id, source_port="TCP/51233", target_port="TCP/5432", link_type="SQL", purpose="Primary DB Access", speed_gbps=40.0, created_by_user_id="seed"),
            # DB Sync
            models.PortConnection(source_device_id=dev_map["DB-SQL-PRIMARY"].id, target_device_id=dev_map["DB-SQL-REPLICA"].id, source_port="TCP/5432", target_port="TCP/5432", link_type="SYNC", purpose="Asynchronous Replication", speed_gbps=10.0, created_by_user_id="seed"),
            # Web to Auth0
            models.PortConnection(source_device_id=dev_map["APP-AUTH-SRV"].id, target_device_id=ext_map["AUTH0-IDP"].id, source_port="TCP/443", target_port="TCP/443", link_type="AUTH", purpose="OIDC Token Validation", speed_gbps=1.0, created_by_user_id="seed"),
            # Web to Stripe
            models.PortConnection(source_device_id=dev_map["WEB-PROD-CLUSTER-01"].id, target_device_id=ext_map["STRIPE-PAYMENT-API"].id, source_port="TCP/443", target_port="TCP/443", link_type="HTTPS", purpose="Payment Processing", speed_gbps=1.0, created_by_user_id="seed"),
        ]
        db.add_all(conns)
        await db.commit()

        # 5. Create a Master Architecture Flow
        print("Seeding Master Architecture Manifest...")
        master_arch = models.DataFlow(
            name="ERP GLOBAL PRODUCTION CLUSTER",
            category="System",
            status="Up to date",
            description="Full stack production visualization showing load balancing, database replication and external gateway dependencies.",
            nodes_json=[
                # Load Balancer
                { "id": "node-lb-1", "type": "device", "position": { "x": 100, "y": 250 }, "data": { "name": "LB-PROD-01", "id": dev_map["LB-PROD-01"].id, "type": "Virtual", "system": "EDGE-NETWORK", "ip_address": "10.0.1.5" } },
                # Web Tiers
                { "id": "node-web-1", "type": "device", "position": { "x": 450, "y": 100 }, "data": { "name": "WEB-PROD-CLUSTER-01", "id": dev_map["WEB-PROD-CLUSTER-01"].id, "type": "Physical", "system": "ERP-FRONTEND", "ip_address": "10.0.2.10" } },
                { "id": "node-web-2", "type": "device", "position": { "x": 450, "y": 400 }, "data": { "name": "WEB-PROD-CLUSTER-02", "id": dev_map["WEB-PROD-CLUSTER-02"].id, "type": "Physical", "system": "ERP-FRONTEND", "ip_address": "10.0.2.11" } },
                # Auth
                { "id": "node-auth", "type": "device", "position": { "x": 800, "y": 0 }, "data": { "name": "APP-AUTH-SRV", "id": dev_map["APP-AUTH-SRV"].id, "type": "Virtual", "system": "IDENTITY-CORE", "ip_address": "10.0.5.50" } },
                # Databases
                { "id": "node-db-p", "type": "device", "position": { "x": 800, "y": 250 }, "data": { "name": "DB-SQL-PRIMARY", "id": dev_map["DB-SQL-PRIMARY"].id, "type": "Physical", "system": "ERP-DATA", "ip_address": "10.0.10.100" } },
                { "id": "node-db-r", "type": "device", "position": { "x": 1100, "y": 250 }, "data": { "name": "DB-SQL-REPLICA", "id": dev_map["DB-SQL-REPLICA"].id, "type": "Physical", "system": "ERP-DATA", "ip_address": "10.0.10.101" } },
                # External
                { "id": "node-stripe", "type": "external", "position": { "x": 800, "y": 500 }, "data": { "name": "STRIPE-PAYMENT-API", "id": ext_map["STRIPE-PAYMENT-API"].id, "owner_organization": "Stripe Inc.", "type": "Cloud Service" } },
                { "id": "node-auth0", "type": "external", "position": { "x": 1100, "y": 0 }, "data": { "name": "AUTH0-IDP", "id": ext_map["AUTH0-IDP"].id, "owner_organization": "Okta", "type": "Cloud Service" } },
            ],
            edges_json=[
                { "id": "e-lb-web1", "source": "node-lb-1", "target": "node-web-1", "type": "labeled", "data": { "label": "LOAD BALANCING", "type": "DATA" }, "animated": True },
                { "id": "e-lb-web2", "source": "node-lb-1", "target": "node-web-2", "type": "labeled", "data": { "label": "LOAD BALANCING", "type": "DATA" }, "animated": True },
                { "id": "e-web1-db", "source": "node-web-1", "target": "node-db-p", "type": "labeled", "data": { "label": "SQL TRAFFIC", "type": "DATA" }, "animated": True },
                { "id": "e-web2-db", "source": "node-web-2", "target": "node-db-p", "type": "labeled", "data": { "label": "SQL TRAFFIC", "type": "DATA" }, "animated": True },
                { "id": "e-db-sync", "source": "node-db-p", "target": "node-db-r", "type": "labeled", "data": { "label": "DB MIRRORING", "type": "SYNC" }, "animated": True },
                { "id": "e-web1-stripe", "source": "node-web-1", "target": "node-stripe", "type": "labeled", "data": { "label": "PAYMENT API", "type": "DATA" }, "animated": True },
                { "id": "e-auth-auth0", "source": "node-auth", "target": "node-auth0", "type": "labeled", "data": { "label": "OIDC FLOW", "type": "AUTH" }, "animated": True },
                { "id": "e-web-auth", "source": "node-web-1", "target": "node-auth", "type": "labeled", "data": { "label": "AUTH VALIDATION", "type": "AUTH" }, "animated": True },
            ],
            viewport_json={}
        )
        db.add(master_arch)
        await db.commit()
        print("MASTER ARCHITECTURE SEEDED SUCCESSFULLY.")

if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.getcwd())
    asyncio.run(seed_complex_architecture())
