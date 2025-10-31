#!/usr/bin/env python3
"""
Flag ALL 18 missing results from meet 254378 as potential duplicate athletes for admin review.
Admin can then decide whether to:
1. Use existing athlete (if same person with name variation)
2. Create new athlete (if different person)
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

# All 18 missing times with their potential DB matches
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

print("=== FLAGGING ALL 18 MISSING RESULTS AS POTENTIAL DUPLICATE ATHLETES ===\n")

flagged_count = 0

for time_cs, info in missing_results.items():
    if time_cs not in csv_by_time:
        print(f"❌ No CSV data for time {time_cs}")
        continue

    row = csv_by_time[time_cs][0]  # Get first match
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

    # Get DB athlete if there's a match
    athlete_id_1 = None
    grad_year_1 = None
    gender_1 = None

    if db_match:
        db_athlete = supabase.table('athletes').select('id, grad_year, gender').eq('name', db_match).eq('school_id', school_id).execute()
        if db_athlete.data:
            athlete_id_1 = db_athlete.data[0]['id']
            grad_year_1 = db_athlete.data[0]['grad_year']
            gender_1 = db_athlete.data[0]['gender']
        else:
            print(f"⚠️  Expected DB athlete not found: {db_match} - treating as new athlete")
            db_match = None
            conflict_type = 'new_athlete'

    # Calculate CSV grad year and gender
    grade = int(row['grade'])
    grad_year_2 = 2025 + (12 - grade)

    race = supabase.table('races').select('name').eq('athletic_net_race_id', row['athletic_net_race_id']).execute()
    if race.data:
        race_name = race.data[0]['name'].lower()
        gender_2 = 'F' if 'women' in race_name or 'girls' in race_name else 'M'
    else:
        gender_2 = 'M'

    # Check if already flagged
    if athlete_id_1:
        existing = supabase.table('potential_duplicate_athletes').select('id').eq('athlete_id_1', athlete_id_1).eq('name_2', csv_name).execute()
    else:
        # For new athletes, check if we've already flagged this CSV name at this school
        existing = supabase.table('potential_duplicate_athletes').select('id').eq('school_id', school_id).eq('name_2', csv_name).execute()

    if existing.data:
        print(f"✓ Already flagged: {csv_name} ({conflict_type})")
        continue

    # Create potential duplicate record
    duplicate_data = {
        'athlete_id_1': athlete_id_1,  # NULL for new athletes
        'athlete_id_2': None,
        'school_id': school_id,
        'meet_id': meet_id,
        'name_1': db_match if db_match else None,  # NULL for new athletes
        'name_2': csv_name,
        'conflict_type': conflict_type,
        'grad_year_1': grad_year_1,
        'grad_year_2': grad_year_2,
        'gender_1': gender_1,
        'gender_2': gender_2,
        'csv_data': json.dumps({
            'race_athletic_net_id': row['athletic_net_race_id'],
            'athlete_name': csv_name,
            'first_name': row['athlete_first_name'],
            'last_name': row['athlete_last_name'],
            'school_athletic_net_id': school_net_id,
            'time_cs': time_cs,
            'place_overall': int(row['place_overall']),
            'grade': int(row['grade'])
        }),
        'status': 'pending'
    }

    result = supabase.table('potential_duplicate_athletes').insert(duplicate_data).execute()
    if result.data:
        if db_match:
            print(f"✓ Flagged: '{csv_name}' vs '{db_match}' ({conflict_type})")
        else:
            print(f"✓ Flagged: '{csv_name}' as new athlete ({conflict_type})")
        flagged_count += 1
    else:
        print(f"❌ Failed to flag: {csv_name}")

print(f"\n✓ Flagged {flagged_count} athletes for admin review")
print(f"\nAdmin can now review each case and decide:")
print(f"  - If same person with name variation: Use existing athlete ID")
print(f"  - If different person: Create new athlete from CSV data")
print(f"  - If truly new athlete: Create athlete from CSV data")
