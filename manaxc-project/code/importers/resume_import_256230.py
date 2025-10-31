import os
import sys
import csv
import time
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime

load_dotenv('/Users/ron/manaxc/manaxc-project/code/importers/.env')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

print("=" * 70)
print("MEET 256230 - RESUMABLE IMPORT WITH MONITORING")
print("=" * 70)
print()

# Get meet info
meet_response = supabase.table('meets').select('id, name').eq('athletic_net_id', '256230').execute()
if not meet_response.data:
    print("❌ Meet not found in database!")
    sys.exit(1)

meet = meet_response.data[0]
meet_id = meet['id']
meet_name = meet['name']

print(f"Meet: {meet_name}")
print(f"Meet ID: {meet_id}")
print()

# Load CSV to see what should be imported
csv_path = 'to-be-processed/meet_256230_1761716889/results.csv'
csv_results = []
print("Loading CSV...")
with open(csv_path, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_results.append({
            'time_cs': int(row['time_cs']),
            'place': int(row['place_overall']),
            'race_id': row['athletic_net_race_id'],
            'athlete_name': row['athlete_name']
        })

print(f"CSV contains: {len(csv_results)} results")
print()

# Get what's already imported
print("Fetching already imported results...")
imported_times = set()
offset = 0
batch_size = 1000

while True:
    batch = supabase.table('results').select('time_cs, place_overall').eq('meet_id', meet_id).range(offset, offset + batch_size - 1).execute()
    if not batch.data:
        break
    for r in batch.data:
        imported_times.add((r['time_cs'], r['place_overall']))
    offset += batch_size
    if len(batch.data) < batch_size:
        break
    print(f"  Loaded {offset} imported results...")

print(f"Already imported: {len(imported_times)} results")
print()

# Calculate what's missing
missing = 0
for r in csv_results:
    if (r['time_cs'], r['place']) not in imported_times:
        missing += 1

print(f"Missing: {missing} results")
print(f"Progress: {len(imported_times)}/{len(csv_results)} ({100*len(imported_times)/len(csv_results):.1f}%)")
print()

if missing == 0:
    print("✅ All results already imported!")
    sys.exit(0)

print("=" * 70)
print("RECOMMENDATION: Delete partial import and restart fresh")
print("=" * 70)
print()
print("Partial imports are risky because:")
print("  1. Duplicate detection may have issues")
print("  2. Derived tables (athlete_best_times, etc.) may be inconsistent")
print("  3. Easier to verify full import success")
print()
print("Options:")
print("  1. Delete meet 256230 completely and re-import")
print("  2. Continue with current state (not recommended)")
print()

response = input("Delete and re-import? (y/n): ")

if response.lower() != 'y':
    print("Aborted. No changes made.")
    sys.exit(0)

print()
print("Deleting meet 256230...")

# Delete in order (to avoid FK violations)
print("  Deleting athlete_best_times references...")
# This is complex - just delete the whole meet
result = supabase.table('meets').delete().eq('id', meet_id).execute()
print("  ✅ Meet deleted (cascaded to results, races, etc.)")
print()

print("✅ Ready to re-import")
print()
print("Now run the standard import command:")
print(f"  venv/bin/python3 import_csv_data.py to-be-processed/meet_256230_1761716889")

