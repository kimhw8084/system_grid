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
        ("vendor", "VARCHAR"),
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
    conn.close()
    print(f"Finished repairing {db_path}.")

if __name__ == "__main__":
    repair_db("system_grid.db")
    repair_db("backend/system_grid.db")
