#!/usr/bin/env python3
"""
Monitored import for large meets with connection retry and progress tracking
"""
import os
import sys
import subprocess
import time
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('/Users/ron/manaxc/manaxc-project/code/importers/.env')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

MEET_ID = '256230'
FOLDER = 'to-be-processed/meet_256230_1761716889'
EXPECTED_RESULTS = 10870

print("=" * 70)
print(f"MONITORED IMPORT: Meet {MEET_ID}")
print("=" * 70)
print()

# Step 1: Delete existing partial import
print("Step 1: Cleaning up partial import...")
meet_response = supabase.table('meets').select('id, name, result_count').eq('athletic_net_id', MEET_ID).execute()

if meet_response.data:
    meet = meet_response.data[0]
    print(f"  Found existing meet: {meet['name']}")
    print(f"  Current result_count: {meet['result_count']}")
    print(f"  Deleting...")
    
    supabase.table('meets').delete().eq('id', meet['id']).execute()
    print("  ✅ Deleted (cascades to results, races, etc.)")
else:
    print("  No existing import found")

print()

# Step 2: Start monitored import
print("Step 2: Starting import with monitoring...")
print(f"  Folder: {FOLDER}")
print(f"  Expected results: {EXPECTED_RESULTS}")
print()

MAX_RETRIES = 3
retry_count = 0

while retry_count < MAX_RETRIES:
    if retry_count > 0:
        print(f"\n🔄 Retry {retry_count}/{MAX_RETRIES}")
        print("  Waiting 5 seconds before retry...")
        time.sleep(5)
    
    print(f"  Starting import (attempt {retry_count + 1})...")
    start_time = time.time()
    
    # Run import command
    cmd = ['venv/bin/python3', 'import_csv_data.py', FOLDER]
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Monitor output
    last_progress_time = time.time()
    for line in process.stdout:
        print(f"    {line.rstrip()}")
        last_progress_time = time.time()
    
    process.wait()
    elapsed = time.time() - start_time
    
    if process.returncode == 0:
        print(f"\n  ✅ Import completed in {elapsed:.1f} seconds")
        break
    else:
        print(f"\n  ❌ Import failed with code {process.returncode}")
        retry_count += 1
        
        if retry_count >= MAX_RETRIES:
            print(f"\n❌ Failed after {MAX_RETRIES} attempts")
            sys.exit(1)

print()

# Step 3: Verify import
print("Step 3: Verifying import...")
meet_response = supabase.table('meets').select('id, name, result_count').eq('athletic_net_id', MEET_ID).execute()

if not meet_response.data:
    print("  ❌ Meet not found after import!")
    sys.exit(1)

meet = meet_response.data[0]
result_count = meet['result_count']

print(f"  Meet: {meet['name']}")
print(f"  Result count: {result_count}")
print(f"  Expected: {EXPECTED_RESULTS}")

if result_count == EXPECTED_RESULTS:
    print(f"\n  ✅ SUCCESS! All {EXPECTED_RESULTS} results imported")
elif result_count > 0:
    missing = EXPECTED_RESULTS - result_count
    pct = 100 * result_count / EXPECTED_RESULTS
    print(f"\n  ⚠️ Partial import: {result_count}/{EXPECTED_RESULTS} ({pct:.1f}%)")
    print(f"  Missing: {missing} results")
else:
    print(f"\n  ❌ FAILED: No results imported")

print()
print("=" * 70)
print("IMPORT COMPLETE")
print("=" * 70)

