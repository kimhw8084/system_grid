
import os
import sys
import random
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app.models.models import (
    Device, FarFailureMode, FarFailureCause, FarResolution, FarMitigation, 
    KnowledgeEntry, SettingOption, MonitoringItem
)

DB_PATH = os.path.join(os.path.dirname(__file__), "system_grid.db")
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

def seed_far():
    print("Seeding FAR Dummy Data...")
    with Session(engine) as db:
        # Get systems and some devices
        systems = db.execute(select(SettingOption).filter(SettingOption.category == 'LogicalSystem')).scalars().all()
        system_names = [s.value for s in systems] or ["SAP-PROD", "K8S-CLUSTER-01", "FIN-CORE"]
        
        devices = db.execute(select(Device).limit(50)).scalars().all()
        if not devices:
            print("No devices found. Please run main seed first.")
            return

        # Create some BKMs in Knowledge base for resolutions
        bkms = []
        for i in range(5):
            bkm = KnowledgeEntry(
                category="BKM",
                title=f"Resolution Protocol FAR-BKM-00{i}",
                content=f"Step-by-step resolution for technical failure mode type {i}...",
                is_answered=True,
                tags=["Resolution", "FAR", "Reliability"]
            )
            db.add(bkm)
            bkms.append(bkm)
        db.flush()

        # Scenarios LV 0-8
        scenarios = [
            {"lv": 0, "title": "Critical DB Deadlock", "system": "SAP-PROD", "status": "Analyzing", "hasM": False, "hasR": False, "hasW": False},
            {"lv": 1, "title": "Memory Leak Threshold", "system": "K8S-CLUSTER-01", "status": "Monitoring", "hasM": True, "hasR": False, "hasW": False},
            {"lv": 2, "title": "Manual Fan Speed Control", "system": "GLOBAL-INFRA", "status": "Analyzing", "hasM": False, "hasR": False, "hasW": True},
            {"lv": 3, "title": "API Latency Workaround", "system": "FIN-CORE", "status": "Mitigated", "hasM": True, "hasR": False, "hasW": True},
            {"lv": 4, "title": "Corrupt Log Rotation Fix", "system": "HR-PEOPLE", "status": "Resolution Identified", "hasM": False, "hasR": True, "hasW": False},
            {"lv": 5, "title": "Network Jitter Mitigation", "system": "GLOBAL-DNS", "status": "Resolution Identified", "hasM": False, "hasR": True, "hasW": True},
            {"lv": 6, "title": "Auto-Reboot Policy", "system": "SAP-PROD", "status": "Resolved", "hasM": True, "hasR": True, "hasW": False},
            {"lv": 7, "title": "Full Reliability Stack", "system": "K8S-CLUSTER-01", "status": "Mitigated", "hasM": True, "hasR": True, "hasW": True},
            {"lv": 8, "title": "Design Proofed Power", "system": "GLOBAL-INFRA", "status": "Prevented", "hasM": False, "hasR": False, "hasW": False},
        ]

        for sc in scenarios:
            # 1. Create Mode
            mode = FarFailureMode(
                system_name=sc["system"],
                title=sc["title"],
                effect=f"Impact analysis for {sc['title']} resulting in potential downtime.",
                severity=random.randint(5, 10),
                occurrence=random.randint(1, 5),
                detection=random.randint(1, 5),
                status=sc["status"]
            )
            mode.rpn = mode.severity * mode.occurrence * mode.detection
            db.add(mode)
            db.flush()

            # Link some random assets
            mode.affected_assets = random.sample(devices, random.randint(1, 3))

            # 2. Create Cause if needed for Level >= 4
            if sc["hasR"] or random.random() > 0.5:
                cause = FarFailureCause(
                    cause_text=f"Root cause identification for {sc['title']}",
                    occurrence_level=mode.occurrence,
                    responsible_team="Reliability Engineering"
                )
                db.add(cause)
                db.flush()
                mode.causes.append(cause)

                # 3. Create Resolution if hasR is True
                if sc["hasR"]:
                    res = FarResolution(
                        knowledge_id=random.choice(bkms).id,
                        preventive_follow_up="Regular audits of configuration parameters.",
                        responsible_team="L3 Support"
                    )
                    db.add(res)
                    db.flush()
                    cause.resolutions.append(res)

            # 4. Create Mitigations (Monitoring/Workaround)
            if sc["hasM"]:
                mon = FarMitigation(
                    mitigation_type="Monitoring",
                    mitigation_steps="Threshold alerts set at 90% utilization via Prometheus.",
                    responsible_team="Monitoring Team"
                )
                db.add(mon)
                mode.mitigations.append(mon)
            
            if sc["hasW"]:
                work = FarMitigation(
                    mitigation_type="Workaround",
                    mitigation_steps="Execute flush-cache script to temporarily restore service.",
                    responsible_team="SRE Team"
                )
                db.add(work)
                mode.mitigations.append(work)

        db.commit()
        print("FAR Seed Complete.")

if __name__ == "__main__":
    seed_far()
