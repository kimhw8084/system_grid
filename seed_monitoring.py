import asyncio
import os
import sys

# Add backend to sys.path at the top before other imports
backend_path = os.path.join(os.getcwd(), 'backend')
if backend_path not in sys.path:
    sys.path.append(backend_path)

import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.models import MonitoringItem, Device, KnowledgeEntry, LogicalService
from sqlalchemy import select, delete

# Use the correct database URL from your config
DATABASE_URL = "sqlite+aiosqlite:///./backend/system_grid.db"

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed_monitoring():
    async with AsyncSessionLocal() as session:
        # Clear existing monitors for clean seeding
        await session.execute(delete(MonitoringItem))
        await session.commit()

        # Create some BKMs first if they don't exist
        bkm1_res = await session.execute(select(KnowledgeEntry).filter(KnowledgeEntry.title == "High CPU Triage - DB Node"))
        bkm1 = bkm1_res.scalar_one_or_none()
        if not bkm1:
            bkm1 = KnowledgeEntry(
                category="BKM",
                title="High CPU Triage - DB Node",
                content="Standard procedure for handling high CPU utilization on database nodes.",
                content_json={
                    "steps": [
                        {"title": "Check running processes", "description": "Run 'top -b -n 1' to identify high CPU consumers."},
                        {"title": "Check DB locks", "description": "Query pg_stat_activity or equivalent for long running locks."},
                        {"title": "Restart service", "description": "If non-critical, restart the service to clear memory/CPU spike."}
                    ]
                }
            )
            session.add(bkm1)
            await session.commit()
            await session.refresh(bkm1)

        bkm2_res = await session.execute(select(KnowledgeEntry).filter(KnowledgeEntry.title == "API Response Time Troubleshooting"))
        bkm2 = bkm2_res.scalar_one_or_none()
        if not bkm2:
            bkm2 = KnowledgeEntry(
                category="Instruction",
                title="API Response Time Troubleshooting",
                content="Steps to diagnose slow API response times in the Gateway layer.",
                content_json={
                    "steps": [
                        {"title": "Check upstream latency", "description": "Verify latency to backend services."},
                        {"title": "Review LB logs", "description": "Check for 5xx or 4xx spikes in Load Balancer logs."},
                        {"title": "Scale Gateway", "description": "Consider adding more instances to the Gateway pool."}
                    ]
                }
            )
            session.add(bkm2)
            await session.commit()
            await session.refresh(bkm2)

        # Scenarios
        monitors = [
            MonitoringItem(
                device_id=97, # fin-core-lb-084
                category="Hardware",
                status="Existing",
                is_active=True,
                title="FIN-CORE: CPU Utilization Alert",
                platform="Zabbix",
                purpose="Monitors core financial database load to ensure transaction processing stability.",
                impact="If this alert triggers, database transactions may slow down or time out, potentially halting financial reporting.",
                severity="Critical",
                check_interval=30,
                alert_duration=300,
                notification_method="Slack",
                notification_recipients=["#fin-ops-alerts", "oncall-lead"],
                logic_json=[
                    {"id": 1, "type": "Threshold", "description": "CPU > 90%", "logic_info": "avg(system.cpu.util) > 90 for 5m"},
                    {"id": 2, "type": "Metric", "description": "I/O Wait", "logic_info": "system.cpu.util[iowait] > 15%"}
                ],
                recovery_docs=[bkm1.id]
            ),
            MonitoringItem(
                device_id=13, # k8s-cluster-01-lb-000
                category="Synthetic",
                status="Existing",
                is_active=True,
                title="K8S: API Gateway Health Check",
                platform="Prometheus",
                purpose="Ensures the primary K8S entry point is responding within SLAs to external requests.",
                impact="Alert indicates the API Gateway is down or extremely slow, blocking all client access to microservices.",
                severity="Critical",
                check_interval=60,
                alert_duration=60,
                notification_method="PagerDuty",
                notification_recipients=["SERVICE-ABC-123"],
                logic_json=[
                    {"id": 1, "type": "Health Check", "description": "Status 200", "logic_info": "GET /health\nExpect: 200\nTimeout: 2s"},
                    {"id": 2, "type": "Latency", "description": "P99 Response", "logic_info": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5"}
                ],
                recovery_docs=[bkm2.id]
            ),
            MonitoringItem(
                device_id=1, # CORE-FIREWALL-00
                category="Network",
                status="Planned",
                is_active=False,
                title="SEC-FW: High Packet Loss Detect",
                platform="Zabbix",
                purpose="Identifies potential network congestion or hardware failure on the main firewall.",
                impact="High packet loss on the firewall will lead to intermittent connectivity issues for all outbound and inbound traffic.",
                severity="Warning",
                check_interval=10,
                alert_duration=30,
                notification_method="Email",
                notification_recipients=["net-admin@company.com"],
                logic_json=[
                    {"id": 1, "type": "Threshold", "description": "Packet Loss > 5%", "logic_info": "icmppingloss > 5"}
                ]
            ),
            MonitoringItem(
                device_id=105, # bi-analytics-lb-092
                category="Log",
                status="Existing",
                is_active=True,
                title="BI-ANALYTICS: Auth Brute Force Detection",
                platform="ELK Stack",
                purpose="Security monitoring for excessive failed login attempts to prevent account compromise.",
                impact="Potential unauthorized access attempt. Security team must investigate source IP immediately.",
                severity="Critical",
                check_interval=300,
                notification_method="Teams",
                notification_recipients=["Security Response Team"],
                logic_json=[
                    {"id": 1, "type": "Regex", "description": "Failed Login Spike", "logic_info": "count(message: \"Login failed\") > 50 in 5m"}
                ]
            ),
            MonitoringItem(
                device_id=26, # sap-prod-lb-013
                category="Application",
                status="Cancelled",
                is_active=False,
                title="SAP-PROD: Transaction Failure Rate",
                platform="Datadog",
                purpose="Monitors business-critical SAP transactions for abnormal failure rates to detect app logic issues.",
                impact="High failure rates indicate broken business processes (e.g., shipping, invoicing) despite system uptime.",
                severity="Warning",
                check_interval=120,
                notification_method="Webhook",
                notification_recipients=["https://internal.ops.dashboard/hook"],
                logic_json=[
                    {"id": 1, "type": "Query", "description": "Failure %", "logic_info": "sum(sap.tx.fail) / sum(sap.tx.total) * 100 > 2"}
                ]
            )
        ]
        
        session.add_all(monitors)
        await session.commit()
        print("Successfully seeded 5 monitoring scenarios with purpose/impact split and status logic.")

if __name__ == "__main__":
    asyncio.run(seed_monitoring())
