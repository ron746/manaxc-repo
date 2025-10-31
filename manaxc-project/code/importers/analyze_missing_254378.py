#!/usr/bin/env python3
"""
Analyze all 40 missing results from meet 254378 to categorize:
1. Athlete exists, just missing result -> Add result
2. Athlete doesn't exist -> Create athlete + result
3. Name variation (duplicate athlete) -> Flag for admin review
"""

import os
import csv
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get meet ID
meet = supabase.table('meets').select('id').eq('athletic_net_id', '254378').execute()
meet_id = meet.data[0]['id']

# Read CSV and get DB times
print("Loading CSV and DB data...")
csv_file = 'to-be-processed/meet_254378_1761786641/results.csv'
csv_times = []
csv_rows = {}
with open(csv_file, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        time_cs = int(row['time_cs'])
        csv_times.append(time_cs)
        if time_cs not in csv_rows:
            csv_rows[time_cs] = []
        csv_rows[time_cs].append(row)

# Get DB times
db_times = []
offset = 0
while True:
    page = supabase.table('results').select('time_cs').eq('meet_id', meet_id).range(offset, offset + 999).execute()
    if not page.data:
        break
    db_times.extend([r['time_cs'] for r in page.data])
    offset += 1000
    if len(page.data) < 1000:
        break

# Find missing times
missing_times = sorted(set(csv_times) - set(db_times))

print(f"\nAnalyzing {len(missing_times)} missing times...")

# Categorize each missing result
categories = {
    'exists_add_result': [],  # Athlete exists, just add result
    'new_athlete': [],  # Need to create athlete
    'potential_duplicate': [],  # Name variation - needs admin review
    'error': []  # Couldn't determine
}

for time_cs in missing_times:
    for row in csv_rows[time_cs]:
        athlete_name = f"{row['athlete_first_name']} {row['athlete_last_name']}"
        school_id_str = row['athlete_school_id']

        # Get school
        school = supabase.table('schools').select('id').eq('athletic_net_id', school_id_str).execute()
        if not school.data:
            categories['error'].append({
                'reason': 'School not found',
                'name': athlete_name,
                'school': school_id_str,
                'time': time_cs,
                'row': row
            })
            continue

        school_id = school.data[0]['id']

        # Search for exact name match
        exact_match = supabase.table('athletes').select('id, name, grad_year').eq('name', athlete_name).eq('school_id', school_id).execute()

        if exact_match.data:
            # Athlete exists - just add result
            categories['exists_add_result'].append({
                'athlete_id': exact_match.data[0]['id'],
                'athlete_name': athlete_name,
                'db_name': exact_match.data[0]['name'],
                'school_id': school_id,
                'time_cs': time_cs,
                'row': row
            })
        else:
            # Check for similar names (potential duplicate athlete)
            last_name = row['athlete_last_name']
            similar = supabase.table('athletes').select('id, name, grad_year').eq('school_id', school_id).ilike('name', f'%{last_name}%').execute()

            if similar.data:
                # Found similar name - might be duplicate
                categories['potential_duplicate'].append({
                    'csv_name': athlete_name,
                    'db_matches': similar.data,
                    'school_id': school_id,
                    'time_cs': time_cs,
                    'row': row
                })
            else:
                # No match - new athlete
                categories['new_athlete'].append({
                    'athlete_name': athlete_name,
                    'school_id': school_id,
                    'time_cs': time_cs,
                    'row': row
                })

# Print summary
print(f"\n=== SUMMARY ===")
print(f"1. Athletes exist, just add result: {len(categories['exists_add_result'])}")
print(f"2. New athletes to create: {len(categories['new_athlete'])}")
print(f"3. Potential duplicate athletes: {len(categories['potential_duplicate'])}")
print(f"4. Errors: {len(categories['error'])}")

print(f"\n=== CATEGORY 1: Add Results (Athlete Exists) ===")
for item in categories['exists_add_result']:
    print(f"  {item['athlete_name']} - {item['time_cs']} cs - Race {item['row']['athletic_net_race_id']}")

print(f"\n=== CATEGORY 2: New Athletes ===")
for item in categories['new_athlete']:
    print(f"  {item['athlete_name']} - {item['time_cs']} cs - Race {item['row']['athletic_net_race_id']}")

print(f"\n=== CATEGORY 3: Potential Duplicates (Need Admin Review) ===")
for item in categories['potential_duplicate']:
    print(f"  CSV: {item['csv_name']} - {item['time_cs']} cs")
    print(f"    Similar in DB:")
    for match in item['db_matches']:
        print(f"      - {match['name']} (grad {match['grad_year']})")

print(f"\n=== CATEGORY 4: Errors ===")
for item in categories['error']:
    print(f"  {item['reason']}: {item['name']} - {item['school']}")
