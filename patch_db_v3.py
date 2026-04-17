import sqlite3
import os

db_path = "backend/system_grid.db"

def patch_db():
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # RcaRecord columns
    rca_columns = [
        ("detection_at", "DATETIME"),
        ("owners", "JSON"),
        ("incident_type", "VARCHAR"),
        ("detection_type", "VARCHAR"),
        ("impact_type", "VARCHAR")
    ]

    for col_name, col_type in rca_columns:
        try:
            cursor.execute(f"ALTER TABLE rca_records ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name} to rca_records")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists in rca_records")
            else:
                print(f"Error adding {col_name} to rca_records: {e}")

    # Investigation columns
    inv_columns = [
        ("research_domain", "VARCHAR"),
        ("failure_domain", "VARCHAR")
    ]

    for col_name, col_type in inv_columns:
        try:
            cursor.execute(f"ALTER TABLE investigations ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name} to investigations")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists in investigations")
            else:
                print(f"Error adding {col_name} to investigations: {e}")

    conn.commit()
    conn.close()
    print("Database patching complete.")

if __name__ == "__main__":
    patch_db()
