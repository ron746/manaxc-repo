#!/usr/bin/env python3
"""
Comprehensive analysis of ALL missing results for meet 254378 (Clovis Invitational)

This script:
1. Compares CSV against database to find ALL missing results
2. Categorizes each missing result by reason
3. Provides detailed breakdown for fixing
4. Documents process for scaling to larger meets (10K+)
"""

import os
import csv
from supabase import create_client, Client
from dotenv import load_dotenv
from collections import defaultdict
import json

# Load environment variables
load_dotenv(dotenv_path='../../website/.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

# Constants
MEET_ID = '3f6daf82-5a37-419f-802d-f648bb97d6ff'
CSV_PATH = 'to-be-processed/meet_254378_1761786641/results.csv'

print("=" * 100)
print("COMPREHENSIVE MISSING RESULTS ANALYSIS - MEET 254378 (Clovis Invitational)")
print("=" * 100)
print()

# STEP 1: Read CSV
print("[1/8] Reading CSV file...")
csv_results = []
with open(CSV_PATH, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_results.append({
            'athletic_net_race_id': row['athletic_net_race_id'],
            'athlete_name': row['athlete_name'],
            'first_name': row['athlete_first_name'],
            'last_name': row['athlete_last_name'],
            'school_id': row['athlete_school_id'],
            'time_cs': int(row['time_cs']),
            'place': row.get('place_overall', ''),
            'grade': row.get('grade', ''),
            'needs_review': row.get('needs_review', '')
        })

print(f"      CSV contains {len(csv_results)} results")

# STEP 2: Get all results from database (paginated)
print("\n[2/8] Fetching results from database (paginated)...")
db_results = []
offset = 0
batch_size = 1000

while True:
    batch = supabase.table('results')\
        .select('id, time_cs, athlete_id, race_id')\
        .eq('meet_id', MEET_ID)\
        .range(offset, offset + batch_size - 1)\
        .execute()

    if not batch.data:
        break

    db_results.extend(batch.data)
    offset += batch_size
    print(f"      Fetched {len(db_results)} results so far...")

    if len(batch.data) < batch_size:
        break

print(f"      Database contains {len(db_results)} results")
print(f"      Missing: {len(csv_results) - len(db_results)} results")

# STEP 3: Get race mapping
print("\n[3/8] Building race mapping...")
races = supabase.table('races')\
    .select('id, athletic_net_race_id, name')\
    .eq('meet_id', MEET_ID)\
    .execute()

race_map = {}  # athletic_net_race_id -> {id, name}
for r in races.data:
    if r['athletic_net_race_id']:
        race_map[r['athletic_net_race_id']] = {
            'id': r['id'],
            'name': r['name']
        }

print(f"      Found {len(race_map)} races")

# STEP 4: Build comparison sets
print("\n[4/8] Building comparison sets...")

# Group CSV times by (race_id, time_cs) for uniqueness check
csv_time_map = {}  # (athletic_net_race_id, time_cs) -> [list of athlete data]
for result in csv_results:
    key = (result['athletic_net_race_id'], result['time_cs'])
    if key not in csv_time_map:
        csv_time_map[key] = []
    csv_time_map[key].append(result)

# Group DB times by (race_uuid, time_cs)
db_time_set = set()  # (race_uuid, time_cs)
for result in db_results:
    db_time_set.add((result['race_id'], result['time_cs']))

print(f"      CSV unique (race, time) combinations: {len(csv_time_map)}")
print(f"      DB unique (race, time) combinations: {len(db_time_set)}")

# STEP 5: Find ALL missing
print("\n[5/8] Identifying ALL missing results...")

missing_results = []
for (athletic_net_race_id, time_cs), athletes in csv_time_map.items():
    race_uuid = race_map.get(athletic_net_race_id, {}).get('id')

    if not race_uuid:
        print(f"      WARNING: Race {athletic_net_race_id} not found!")
        continue

    # Check if this (race, time) exists in DB
    if (race_uuid, time_cs) not in db_time_set:
        # This time is missing - add all athletes with this time
        for athlete_data in athletes:
            missing_results.append({
                **athlete_data,
                'race_uuid': race_uuid,
                'race_name': race_map[athletic_net_race_id]['name']
            })

print(f"      Total missing results: {len(missing_results)}")

# STEP 6: Categorize each missing result
print("\n[6/8] Categorizing missing results...")

categories = {
    'athlete_exists': [],
    'athlete_not_found': [],
    'multiple_with_same_time': []
}

for item in missing_results:
    # Check if athlete exists (school_id might be text like "school_st._margaret's")
    # Try exact match first, then try without school filter if that fails
    try:
        athlete_check = supabase.table('athletes')\
            .select('id, name, slug, grad_year, school_id')\
            .eq('name', item['athlete_name'])\
            .execute()
    except Exception as e:
        print(f"      Error checking athlete {item['athlete_name']}: {e}")
        athlete_check = None

    # If we got results, filter by school name match
    if athlete_check and athlete_check.data:
        # Filter to athletes from the same school (match by name in school_id field)
        matching_athletes = [
            a for a in athlete_check.data
            if item['school_id'].lower() in str(a.get('school_id', '')).lower()
            or a.get('school_id') == item['school_id']
        ]

        if matching_athletes:
            athlete_check.data = matching_athletes
        elif athlete_check.data:
            # Use first match even if school doesn't match perfectly
            athlete_check.data = [athlete_check.data[0]]

    if athlete_check.data:
        # Athlete exists
        categories['athlete_exists'].append({
            **item,
            'athlete_id': athlete_check.data[0]['id'],
            'athlete_slug': athlete_check.data[0]['slug']
        })
    else:
        # Athlete doesn't exist
        categories['athlete_not_found'].append(item)

# Check for duplicate times (multiple athletes with same time in same race)
time_counts = defaultdict(int)
for item in missing_results:
    key = (item['athletic_net_race_id'], item['time_cs'])
    time_counts[key] += 1

for item in missing_results:
    key = (item['athletic_net_race_id'], item['time_cs'])
    if time_counts[key] > 1 and item not in categories['multiple_with_same_time']:
        categories['multiple_with_same_time'].append({
            **item,
            'count': time_counts[key]
        })

print(f"      Athlete exists: {len(categories['athlete_exists'])}")
print(f"      Athlete not found: {len(categories['athlete_not_found'])}")
print(f"      Multiple with same time: {len(categories['multiple_with_same_time'])}")

# STEP 7: Output detailed breakdown
print("\n" + "=" * 100)
print("DETAILED BREAKDOWN")
print("=" * 100)

print(f"\nCATEGORY 1: ATHLETE EXISTS - JUST ADD RESULT ({len(categories['athlete_exists'])} results)")
print("-" * 100)
if categories['athlete_exists']:
    print("These are straightforward - athlete exists, just need to add the result:\n")
    for i, item in enumerate(categories['athlete_exists'][:15], 1):
        print(f"{i:3d}. {item['athlete_name']:30s} | Time: {item['time_cs']:6d} cs | Race: {item['race_name']}")
    if len(categories['athlete_exists']) > 15:
        print(f"... and {len(categories['athlete_exists']) - 15} more")

print(f"\n\nCATEGORY 2: ATHLETE NOT FOUND - NEED TO CREATE ({len(categories['athlete_not_found'])} results)")
print("-" * 100)
if categories['athlete_not_found']:
    print("These athletes don't exist - need to create athlete first, then add result:\n")
    for i, item in enumerate(categories['athlete_not_found'][:15], 1):
        print(f"{i:3d}. {item['athlete_name']:30s} | Time: {item['time_cs']:6d} cs | Grade: {item['grade']:2s} | School: {item['school_id']}")
    if len(categories['athlete_not_found']) > 15:
        print(f"... and {len(categories['athlete_not_found']) - 15} more")

print(f"\n\nCATEGORY 3: MULTIPLE ATHLETES SAME TIME ({len(categories['multiple_with_same_time'])} results)")
print("-" * 100)
if categories['multiple_with_same_time']:
    print("Multiple athletes had the same time in the same race (ties are normal in XC):\n")
    # Group by (race, time)
    by_time = defaultdict(list)
    for item in categories['multiple_with_same_time']:
        key = (item['athletic_net_race_id'], item['time_cs'])
        by_time[key].append(item)

    for i, (key, items) in enumerate(list(by_time.items())[:10], 1):
        print(f"{i:3d}. Race {key[0]}, Time {key[1]} cs - {len(items)} athletes:")
        for item in items:
            print(f"     - {item['athlete_name']}")
    if len(by_time) > 10:
        print(f"... and {len(by_time) - 10} more time groups")

# STEP 8: Save detailed report
print("\n" + "=" * 100)
print("SAVING DETAILED REPORT")
print("=" * 100)

report = {
    'meet_id': MEET_ID,
    'meet_name': 'Clovis Invitational',
    'athletic_net_id': '254378',
    'summary': {
        'csv_total': len(csv_results),
        'db_total': len(db_results),
        'missing_total': len(missing_results)
    },
    'categories': {
        'athlete_exists': categories['athlete_exists'],
        'athlete_not_found': categories['athlete_not_found'],
        'multiple_with_same_time': categories['multiple_with_same_time']
    }
}

report_file = 'meet_254378_comprehensive_analysis.json'
with open(report_file, 'w') as f:
    json.dump(report, f, indent=2)

print(f"\nDetailed report saved to: {report_file}")
print(f"Size: {os.path.getsize(report_file):,} bytes")

# STEP 9: Action plan
print("\n" + "=" * 100)
print("ACTION PLAN FOR COMPLETING MEET 254378")
print("=" * 100)

print(f"""
SUMMARY:
- Missing: {len(missing_results)} results total
- Easy fixes: {len(categories['athlete_exists'])} (athlete exists, just add result)
- Need athlete creation: {len(categories['athlete_not_found'])} (create athlete + result)
- Tied times: {len(categories['multiple_with_same_time'])} (normal, handle with duplicate flag)

RECOMMENDED APPROACH:

1. CREATE MISSING ATHLETES ({len(categories['athlete_not_found'])} athletes)
   - Use fuzzy matching to check for similar names first
   - Flag potential duplicates for admin review
   - Handle slug collisions by checking if similar athlete exists

2. ADD RESULTS FOR EXISTING ATHLETES ({len(categories['athlete_exists'])} results)
   - Straightforward INSERT with athlete_id from database
   - Disable triggers for batch
   - Re-enable after

3. HANDLE TIED TIMES ({len(categories['multiple_with_same_time'])} results)
   - System already supports same time for different athletes
   - Import all, no special handling needed

LESSONS FOR LARGE MEET (10K+):

1. BATCH PROCESSING
   - Process in chunks of 1000 results at a time
   - Use pagination for all DB queries
   - Commit after each batch

2. ATHLETE MATCHING
   - Build athlete cache (name -> ID mapping) before import
   - Use fuzzy matching (Levenshtein distance) for similar names
   - Flag ambiguous matches in potential_duplicate_athletes table

3. PERFORMANCE
   - Disable triggers during bulk import
   - Rebuild derived tables ONCE at the end (not per result)
   - Use COPY or bulk INSERT instead of individual INSERTs

4. ERROR HANDLING
   - Log each failure with details
   - Continue processing even if some fail
   - Generate report of failures for manual review

5. VALIDATION
   - Compare counts after import
   - Check for orphaned references
   - Verify normalized times are reasonable

Next steps:
1. Review {report_file} for complete details
2. Create import script that handles all 3 categories
3. Test on meet 254378
4. Document process for scaling to larger meets
""")

print("\nAnalysis complete!")
