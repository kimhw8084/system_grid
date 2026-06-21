
import sqlite3
import os

DB_PATH = "backend/config.local.db" # Adjusted path based on start-local.sh

if not os.path.exists(DB_PATH):
    print(f"DB NOT FOUND AT: {DB_PATH}")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("--- Inspecting GlobalSetting ---")
cursor.execute("SELECT * FROM global_settings")
rows = cursor.fetchall()

if not rows:
    print("NO DATA FOUND")
else:
    for row in rows:
        print(row)

conn.close()
