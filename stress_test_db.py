import os
import sys
import sqlite3
import time
import multiprocessing
import random
import argparse

def test_worker(db_path, num_inserts, worker_id, results_queue):
    """
    A worker process that attempts to write to the database.
    """
    errors = 0
    start_time = time.time()
    
    try:
        conn = sqlite3.connect(db_path, timeout=10)
        # Enable WAL mode for each connection
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        
        for i in range(num_inserts):
            try:
                # Random delay to simulate real-world jitter
                if random.random() > 0.8:
                    time.sleep(0.01)
                
                conn.execute(
                    "INSERT INTO stress_test (worker_id, iteration, payload) VALUES (?, ?, ?)",
                    (worker_id, i, "X" * 100)
                )
                conn.commit()
            except sqlite3.OperationalError as e:
                if "database is locked" in str(e).lower():
                    errors += 1
                else:
                    results_queue.put((worker_id, False, f"SQL Error: {e}"))
                    return
            except Exception as e:
                results_queue.put((worker_id, False, f"Unexpected Error: {e}"))
                return
        
        conn.close()
        results_queue.put((worker_id, True, errors))
        
    except Exception as e:
        results_queue.put((worker_id, False, f"Connection Error: {e}"))

def run_stress_test(db_dir, num_workers, inserts_per_worker):
    db_path = os.path.join(db_dir, "stress_test.db")
    
    print(f"--- SysGrid Cloud-Storage Stress Test ---")
    print(f"Target Directory: {db_dir}")
    print(f"Database Path: {db_path}")
    print(f"Configuration: {num_workers} workers, {inserts_per_worker} inserts each")
    print("-" * 40)

    # 1. Setup & WAL Check
    print("[1/4] Checking WAL Mode compatibility...")
    if os.path.exists(db_path):
        os.remove(db_path)
    
    try:
        conn = sqlite3.connect(db_path)
        conn.execute("CREATE TABLE stress_test (id INTEGER PRIMARY KEY, worker_id INTEGER, iteration INTEGER, payload TEXT)")
        res = conn.execute("PRAGMA journal_mode=WAL").fetchone()
        current_mode = res[0].lower()
        print(f"      Result: PRAGMA journal_mode=WAL -> {current_mode}")
        
        if current_mode != "wal":
            print(f"      [WARNING] Environment REJECTED WAL mode. It fell back to {current_mode}.")
            print(f"      This usually means the mount does not support mmap or file locking.")
        
        conn.close()
    except Exception as e:
        print(f"      [FAIL] Could not initialize database: {e}")
        return

    # 2. Concurrent Write Test
    print("[2/4] Starting concurrent writers...")
    results_queue = multiprocessing.Queue()
    processes = []
    
    total_start = time.time()
    for i in range(num_workers):
        p = multiprocessing.Process(target=test_worker, args=(db_path, inserts_per_worker, i, results_queue))
        processes.append(p)
        p.start()

    for p in processes:
        p.join()
    total_end = time.time()

    # 3. Analyze Results
    print("[3/4] Analyzing results...")
    total_success = 0
    total_locks = 0
    failed_workers = []
    
    while not results_queue.empty():
        worker_id, success, data = results_queue.get()
        if success:
            total_success += 1
            total_locks += data
        else:
            failed_workers.append((worker_id, data))

    # 4. Integrity Check
    print("[4/4] Verifying data integrity...")
    integrity_ok = False
    actual_rows = 0
    try:
        conn = sqlite3.connect(db_path)
        actual_rows = conn.execute("SELECT count(*) FROM stress_test").fetchone()[0]
        res = conn.execute("PRAGMA integrity_check").fetchone()
        integrity_ok = res[0].lower() == "ok"
        conn.close()
    except Exception as e:
        print(f"      [FAIL] Integrity check failed to run: {e}")

    # Final Report
    print("-" * 40)
    print(f"OVERALL RESULT: {'PASS' if (not failed_workers and integrity_ok) else 'FAIL'}")
    print(f"Success Rate: {total_success}/{num_workers} workers finished")
    print(f"Total Rows: {actual_rows} (Expected: {num_workers * inserts_per_worker - total_locks})")
    print(f"Lock Contentions: {total_locks} (Times a worker had to wait or retry)")
    print(f"Integrity Check: {'OK' if integrity_ok else 'CORRUPTED'}")
    print(f"Total Time: {total_end - total_start:.2f} seconds")
    
    if failed_workers:
        print("\nWorker Failures:")
        for wid, err in failed_workers:
            print(f"  - Worker {wid}: {err}")

    if not integrity_ok:
        print("\n[CRITICAL] Data corruption detected. This environment is NOT safe for SQLite.")
    elif total_locks > (num_workers * inserts_per_worker * 0.1):
        print("\n[WARNING] High lock contention. Performance will be poor on this mount.")
    
    # Cleanup
    try:
        # Keep it if they want to inspect, otherwise delete
        # os.remove(db_path)
        pass
    except:
        pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("dir", help="Directory on the S3 mount to test")
    parser.add_argument("--workers", type=int, default=4, help="Number of concurrent processes")
    parser.add_argument("--inserts", type=int, default=100, help="Inserts per process")
    args = parser.parse_args()
    
    run_stress_test(args.dir, args.workers, args.inserts)
