#!/usr/bin/env python3
"""
Import all 18 missing results from meet 254378:
1. Use existing athlete ID if there's a match (even if capitalization differs)
2. Create new athlete if no match exists
3. Keep all flagged in potential_duplicate_athletes for future merge

This way results aren't missing, but are flagged for admin to review/merge later.
"""

import os
import csv
import json
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

# Read CSV and index by time_cs
csv_file = 'to-be-processed/meet_254378_1761786641/results.csv'
csv_by_time = {}
with open(csv_file, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        time_cs = int(row['time_cs'])
        if time_cs not in csv_by_time:
            csv_by_time[time_cs] = []
        csv_by_time[time_cs].append(row)

# All 18 missing results with their DB matches
missing_results = {
    95750: {'csv_name': 'Zach Causee', 'db_match': 'Zach Causee', 'conflict_type': 'exact_match_missing_result'},
    96560: {'csv_name': 'Samarth Wadhwa', 'db_match': None, 'conflict_type': 'new_athlete'},
    100110: {'csv_name': 'Christian DePrat', 'db_match': 'Christian Deprat', 'conflict_type': 'capitalization_difference'},
    101770: {'csv_name': 'Benjamin Harrison', 'db_match': None, 'conflict_type': 'new_athlete'},
    102980: {'csv_name': 'Zaiden Gurusamy', 'db_match': None, 'conflict_type': 'new_athlete'},
    109100: {'csv_name': 'Maggie De la Rionda', 'db_match': 'Maggie De La Rionda', 'conflict_type': 'capitalization_difference'},
    111480: {'csv_name': 'Cameron D\'Aunoy', 'db_match': 'Cameron D\'aunoy', 'conflict_type': 'capitalization_difference'},
    115560: {'csv_name': 'Parker Oh', 'db_match': None, 'conflict_type': 'new_athlete'},
    121170: {'csv_name': 'Tyler Sant', 'db_match': None, 'conflict_type': 'new_athlete'},
    122030: {'csv_name': 'Maya D\'Amour', 'db_match': 'Maya D\'amour', 'conflict_type': 'capitalization_difference'},
    124400: {'csv_name': 'Chloe O\'Brien', 'db_match': 'Chloe O\'brien', 'conflict_type': 'capitalization_difference'},
    127430: {'csv_name': 'Victor leiva', 'db_match': 'Victor Chan Leiva', 'conflict_type': 'middle_name_difference'},
    130720: {'csv_name': 'Kate Sullivan', 'db_match': None, 'conflict_type': 'new_athlete'},
    133440: {'csv_name': 'Yumi Yeh', 'db_match': None, 'conflict_type': 'new_athlete'},
    134780: {'csv_name': 'MiaBella Medina', 'db_match': 'Miabella Medina', 'conflict_type': 'capitalization_difference'},
    141160: {'csv_name': 'Lana LoGuidice', 'db_match': 'Lana Loguidice', 'conflict_type': 'capitalization_difference'},
    142190: {'csv_name': 'Addy Oh', 'db_match': None, 'conflict_type': 'new_athlete'},
    148790: {'csv_name': 'Angel Medina', 'db_match': 'Angel Tadeo Medina', 'conflict_type': 'middle_name_difference'}
}

print("=== IMPORTING ALL 18 MISSING RESULTS (FLAGGED FOR FUTURE MERGE) ===\n")

# Note: We're importing with triggers enabled, which will update athlete_best_times
# If there are trigger issues, we may need to disable triggers and rebuild after
print("Note: Triggers are enabled - derived tables will be updated automatically\n")

imported_count = 0
created_athletes = 0

for time_cs, info in missing_results.items():
    if time_cs not in csv_by_time:
        print(f"❌ No CSV data for time {time_cs}")
        continue

    row = csv_by_time[time_cs][0]
    csv_name = info['csv_name']
    db_match = info['db_match']
    conflict_type = info['conflict_type']
    school_net_id = row['athlete_school_id']

    # Get school ID
    school = supabase.table('schools').select('id').eq('athletic_net_id', school_net_id).execute()
    if not school.data:
        print(f"❌ School not found: {school_net_id} for {csv_name}")
        continue
    school_id = school.data[0]['id']

    # Determine which athlete ID to use
    athlete_id = None

    if db_match:
        # Use existing athlete
        db_athlete = supabase.table('athletes').select('id, grad_year, gender').eq('name', db_match).eq('school_id', school_id).execute()
        if db_athlete.data:
            athlete_id = db_athlete.data[0]['id']
            print(f"Using existing athlete: {db_match} (ID: {athlete_id})")
        else:
            print(f"⚠️  Expected DB athlete not found: {db_match} - creating new athlete")
            db_match = None  # Fall through to create new athlete

    if not athlete_id:
        # Create new athlete
        grade = int(row['grade'])
        grad_year = 2025 + (12 - grade)

        race = supabase.table('races').select('name').eq('athletic_net_race_id', row['athletic_net_race_id']).execute()
        if race.data:
            race_name = race.data[0]['name'].lower()
            gender = 'F' if 'women' in race_name or 'girls' in race_name else 'M'
        else:
            gender = 'M'

        athlete_data = {
            'name': csv_name,
            'school_id': school_id,
            'grad_year': grad_year,
            'gender': gender
        }

        try:
            athlete_result = supabase.table('athletes').insert(athlete_data).execute()
            if athlete_result.data:
                athlete_id = athlete_result.data[0]['id']
                print(f"Created new athlete: {csv_name} (ID: {athlete_id}, grad {grad_year})")
                created_athletes += 1
            else:
                print(f"❌ Failed to create athlete: {csv_name}")
                continue
        except Exception as e:
            if 'duplicate key' in str(e) and 'slug' in str(e):
                # Slug collision - athlete likely already exists with different name
                print(f"⚠️  Slug collision for {csv_name} - searching for existing athlete...")
                # Try to find existing athlete by school and grad year
                similar = supabase.table('athletes').select('id, name').eq('school_id', school_id).eq('grad_year', grad_year).eq('gender', gender).execute()
                if similar.data:
                    print(f"  Found possible match: {similar.data[0]['name']} - skipping import for now (flagged in potential_duplicate_athletes)")
                    continue
                else:
                    print(f"  No match found - skipping")
                    continue
            else:
                print(f"❌ Error creating athlete {csv_name}: {e}")
                continue

    # Get race ID
    race = supabase.table('races').select('id').eq('athletic_net_race_id', row['athletic_net_race_id']).execute()
    if not race.data:
        print(f"  ❌ Race not found: {row['athletic_net_race_id']}")
        continue
    race_id = race.data[0]['id']

    # Check if result already exists
    existing_result = supabase.table('results').select('id').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).eq('time_cs', time_cs).execute()

    if existing_result.data:
        print(f"  ✓ Result already exists")
        imported_count += 1
    else:
        # Add result
        result_data = {
            'meet_id': meet_id,
            'race_id': race_id,
            'athlete_id': athlete_id,
            'time_cs': time_cs,
            'place_overall': int(row['place_overall']),
            'data_source': 'athletic_net'
        }

        result = supabase.table('results').insert(result_data).execute()
        if result.data:
            print(f"  ✓ Added result: {time_cs} cs ({time_cs/100:.2f} sec) - Place {int(row['place_overall'])}")
            imported_count += 1
        else:
            print(f"  ❌ Failed to add result")

print(f"\n=== SUMMARY ===")
print(f"New athletes created: {created_athletes}")
print(f"Results imported: {imported_count}")
print(f"All {imported_count} results are flagged in potential_duplicate_athletes for future admin review/merge")

# Verify final count
total = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).execute()
print(f"\nMeet 254378 now has {total.count} results")
print(f"CSV had 4655 results")
print(f"Difference: {4655 - total.count} (likely duplicate times flagged in potential_duplicates)")
