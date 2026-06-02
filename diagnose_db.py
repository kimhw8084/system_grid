import os
import sys
import sqlite3
import shutil

def diagnose():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, "backend", "system_grid.db")
    db_dir = os.path.dirname(db_path)
    
    print(f"--- SQLite Diagnostic Report ---")
    print(f"Current OS User: {os.getlogin() if hasattr(os, 'getlogin') else 'unknown'}")
    print(f"Current Directory: {base_dir}")
    
    # 0. Check .env
    env_path = os.path.join(base_dir, "backend", ".env")
    if os.path.exists(env_path):
        print(f"[INFO] Found .env at {env_path}")
        with open(env_path, "r") as f:
            for line in f:
                if "DATABASE_URL" in line and not line.startswith("#"):
                    print(f"[INFO] .env DATABASE_URL: {line.strip()}")
                    db_url_path = line.split(":///")[-1].strip()
                    if os.path.isabs(db_url_path):
                        if not os.path.exists(os.path.dirname(db_url_path)):
                            print(f"[FAIL] The absolute path in .env does not exist on this machine: {os.path.dirname(db_url_path)}")
                        else:
                            print(f"[OK] Absolute path in .env exists.")
    
    # 1. Check Directory Existence
    if not os.path.exists(db_dir):
        print(f"[FAIL] Directory does not exist: {db_dir}")
        try:
            os.makedirs(db_dir)
            print(f"[FIXED] Created directory: {db_dir}")
        except Exception as e:
            print(f"[FATAL] Cannot create directory: {e}")
            return
    else:
        print(f"[OK] Directory exists: {db_dir}")

    # 2. Check Permissions
    print(f"[INFO] Directory Permissions: {oct(os.stat(db_dir).st_mode)[-3:]}")
    if not os.access(db_dir, os.W_OK):
        print(f"[FAIL] Directory is NOT writable.")
    else:
        print(f"[OK] Directory is writable.")

    # 3. Check for existing files and their permissions
    for ext in ["", "-wal", "-shm"]:
        path = db_path + ext
        if os.path.exists(path):
            perms = oct(os.stat(path).st_mode)[-3:]
            is_writable = os.access(path, os.W_OK)
            print(f"[INFO] Found {path} (Perms: {perms}, Writable: {is_writable})")
            if not is_writable:
                print(f"[FAIL] Existing file {path} is not writable.")

    # 4. Try manual sqlite3 connection
    print(f"[INFO] Attempting direct sqlite3 connection to {db_path}...")
    try:
        # Try to delete old files first if they exist to simulate seed.py
        for ext in ["", "-wal", "-shm"]:
            path = db_path + ext
            if os.path.exists(path):
                os.remove(path)
        
        conn = sqlite3.connect(db_path)
        conn.execute("CREATE TABLE diag (id INTEGER PRIMARY KEY)")
        conn.execute("INSERT INTO diag VALUES (1)")
        conn.commit()
        conn.close()
        print(f"[OK] Direct sqlite3 connection and write successful.")
    except Exception as e:
        print(f"[FAIL] Direct sqlite3 failed: {e}")

    # 5. Check Disk Space
    total, used, free = shutil.disk_usage(db_dir)
    print(f"[INFO] Disk Space - Total: {total // (2**30)}GB, Free: {free // (2**20)}MB")

    print(f"--- End of Report ---")

if __name__ == "__main__":
    diagnose()
