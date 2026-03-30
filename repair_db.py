import asyncio
import sqlite3
import os

def repair_db(db_path):
    if not os.path.exists(db_path):
        print(f"Database {db_path} does not exist, skipping.")
        return
    
    print(f"Repairing {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. logical_services
    columns_to_add = [
        ("license_type", "VARCHAR"),
        ("license_key", "VARCHAR"),
        ("purchase_type", "VARCHAR"),
        ("purchase_date", "DATETIME"),
        ("expiry_date", "DATETIME"),
        ("cost", "FLOAT"),
        ("currency", "VARCHAR DEFAULT 'USD'"),
        ("vendor", "VARCHAR"),
        ("criticality", "VARCHAR"),
        ("service_owner", "VARCHAR"),
        ("documentation_url", "VARCHAR"),
    ]
    
    cursor.execute("PRAGMA table_info(logical_services)")
    existing_cols = [row[1] for row in cursor.fetchall()]
    
    for col_name, col_type in columns_to_add:
        if col_name not in existing_cols:
            print(f"Adding {col_name} to logical_services...")
            try:
                cursor.execute(f"ALTER TABLE logical_services ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")
    
    conn.commit()
    
    # 2. devices
    cursor.execute("PRAGMA table_info(devices)")
    existing_cols = [row[1] for row in cursor.fetchall()]
    if "primary_ip" not in existing_cols:
        print("Adding primary_ip to devices...")
        cursor.execute("ALTER TABLE devices ADD COLUMN primary_ip VARCHAR")
    
    # 3. service_secrets
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS service_secrets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id INTEGER NOT NULL,
            username VARCHAR,
            password VARCHAR,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by_user_id VARCHAR DEFAULT 'system_admin',
            FOREIGN KEY (service_id) REFERENCES logical_services (id) ON DELETE CASCADE
        )
    """)
    
    # 5. incident_logs expansions
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='incident_logs'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(incident_logs)")
        inc_cols = [row[1] for row in cursor.fetchall()]
        new_inc_cols = [
            ("systems", "JSON"),
            ("impacted_device_ids", "JSON"),
            ("reporter", "VARCHAR"),
            ("initial_symptoms", "TEXT"),
            ("trigger_event", "TEXT"),
            ("log_evidence", "TEXT"),
            ("mitigation_steps", "TEXT"),
            ("impacts_json", "JSON")
            ]

        for col_name, col_type in new_inc_cols:
            if col_name not in inc_cols:
                print(f"Adding {col_name} to incident_logs...")
                cursor.execute(f"ALTER TABLE incident_logs ADD COLUMN {col_name} {col_type}")
    
    conn.commit()
    conn.close()
    print(f"Finished repairing {db_path}.")

if __name__ == "__main__":
    repair_db("system_grid.db")
    repair_db("backend/system_grid.db")
