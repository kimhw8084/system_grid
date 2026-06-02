import os
import sys
import sqlite3
import shutil

def diagnose():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "system_grid.db")
    db_dir = os.path.dirname(db_path)
    
    print(f"--- SQLite Diagnostic Report ---")
    print(f"Target DB Path: {db_path}")
    print(f"Target Directory: {db_dir}")
    print(f"Current User ID: {os.getuid()}")
    
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
        print(f"[OK] Directory exists.")

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
                print(f"[FAIL] Existing file {path} is not writable. Try: sudo rm {path}")

    # 4. Try manual sqlite3 connection
    print(f"[INFO] Attempting direct sqlite3 connection...")
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
        if "readonly" in str(e).lower():
            print("  -> Hint: The filesystem might be mounted as read-only or there is a permission override.")
        if "locked" in str(e).lower():
            print("  -> Hint: Another process has an exclusive lock on the database file.")

    # 5. Check Disk Space
    total, used, free = shutil.disk_usage(db_dir)
    print(f"[INFO] Disk Space - Total: {total // (2**30)}GB, Free: {free // (2**20)}MB")
    if free < 10 * 1024 * 1024: # 10MB
        print(f"[FAIL] Low disk space (< 10MB).")

    print(f"--- End of Report ---")

if __name__ == "__main__":
    diagnose()
