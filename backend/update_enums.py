import os
import sys
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app.models.models import SettingOption

DB_PATH = os.path.join(os.path.dirname(__file__), "system_grid.db")
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

def update_enums():
    cats = {
        "IncidentType": ["Network Outage", "Database Failure", "Application Crash", "Security Incident", "Hardware Fault", "Performance Degradation"],
        "DetectionType": ["Automated Alert", "Manual Observation", "Customer Report", "Log Analysis", "Security Scanner", "External Intelligence"],
        "ImpactType": ["Service Unavailable", "Data Loss", "Performance Degradation", "Internal Only", "Regulatory Non-compliance"],
        "EventType": ["Detection", "Investigation", "Mitigation", "Resolution", "Post-Mortem", "Communication"],
        "VendorCountry": ["South Korea", "USA"]
    }
    
    with Session(engine) as db:
        for cat, vals in cats.items():
            for v in vals:
                # Check if exists
                existing = db.execute(select(SettingOption).where(SettingOption.category == cat, SettingOption.value == v)).first()
                if not existing:
                    print(f"Adding {cat}: {v}")
                    db.add(SettingOption(category=cat, label=v, value=v, description=f"Standard {cat} entry: {v}"))
        db.commit()
    print("Enums updated.")

if __name__ == "__main__":
    update_enums()
