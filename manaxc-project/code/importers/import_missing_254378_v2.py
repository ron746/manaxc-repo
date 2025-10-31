#!/usr/bin/env python3
"""
Import missing results from meet 254378 by matching on time_cs.
1. Create 9 new athletes that don't exist
2. Flag 9 potential duplicate athletes for admin review
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

# Category 2: New athletes to create + add results
new_athlete_times = [95750, 96560, 101770, 102980, 115560, 121170, 130720, 133440, 142190]

print("=== CREATING NEW ATHLETES & RESULTS ===\n")
created_count = 0

for time_cs in new_athlete_times:
    if time_cs not in csv_by_time:
        print(f"❌ No CSV data for time {time_cs}")
        continue

    for row in csv_by_time[time_cs]:
        first = row['athlete_first_name']
        last = row['athlete_last_name']
        athlete_name = f"{first} {last}"
        school_net_id = row['athlete_school_id']

        # Get school ID
        school = supabase.table('schools').select('id').eq('athletic_net_id', school_net_id).execute()
        if not school.data:
            print(f"❌ School not found: {school_net_id}")
            continue
        school_id = school.data[0]['id']

        # Calculate grad year from grade
        grade = int(row['grade'])
        grad_year = 2025 + (12 - grade)  # Meet in 2024 season

        # Determine gender from race
        race = supabase.table('races').select('name').eq('athletic_net_race_id', row['athletic_net_race_id']).execute()
        if race.data:
            race_name = race.data[0]['name'].lower()
            gender = 'F' if 'women' in race_name or 'girls' in race_name else 'M'
        else:
            gender = 'M'  # Default

        # Check if athlete already exists
        existing = supabase.table('athletes').select('id').eq('name', athlete_name).eq('school_id', school_id).execute()
        if existing.data:
            athlete_id = existing.data[0]['id']
            print(f"✓ Athlete exists: {athlete_name}")
        else:
            # Create athlete
            athlete_data = {
                'name': athlete_name,
                'school_id': school_id,
                'grad_year': grad_year,
                'gender': gender
            }

            result = supabase.table('athletes').insert(athlete_data).execute()
            if result.data:
                athlete_id = result.data[0]['id']
                print(f"✓ Created athlete: {athlete_name} (grad {grad_year})")
            else:
                print(f"❌ Failed to create: {athlete_name}")
                continue

        # Get race ID
        race = supabase.table('races').select('id').eq('athletic_net_race_id', row['athletic_net_race_id']).execute()
        if not race.data:
            print(f"  ❌ Race not found: {row['athletic_net_race_id']}")
            continue
        race_id = race.data[0]['id']

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
            print(f"  ✓ Added result: {time_cs} cs ({time_cs/100:.2f} sec)")
            created_count += 1
        else:
            print(f"  ❌ Failed to add result")

print(f"\n✓ Created {created_count} new athletes + results")

# Category 3: Potential duplicates - flag for admin review
print(f"\n=== FLAGGING POTENTIAL DUPLICATE ATHLETES ===\n")

potential_duplicate_times = {
    100110: ('Christian DePrat', 'Christian Deprat', 'capitalization_difference'),
    109100: ('Maggie De la Rionda', 'Maggie De La Rionda', 'capitalization_difference'),
    111480: ('Cameron D\'Aunoy', 'Cameron D\'aunoy', 'capitalization_difference'),
    122030: ('Maya D\'Amour', 'Maya D\'amour', 'capitalization_difference'),
    124400: ('Chloe O\'Brien', 'Chloe O\'brien', 'capitalization_difference'),
    127430: ('Victor leiva', 'Victor Chan Leiva', 'middle_name_difference'),
    134780: ('MiaBella Medina', 'Miabella Medina', 'capitalization_difference'),
    141160: ('Lana LoGuidice', 'Lana Loguidice', 'capitalization_difference'),
    148790: ('Angel Medina', 'Angel Tadeo Medina', 'middle_name_difference')
}

flagged_count = 0

for time_cs, (csv_name, db_name, conflict_type) in potential_duplicate_times.items():
    if time_cs not in csv_by_time:
        print(f"❌ No CSV data for time {time_cs}")
        continue

    row = csv_by_time[time_cs][0]  # Get first match
    school_net_id = row['athlete_school_id']

    # Get school ID
    school = supabase.table('schools').select('id').eq('athletic_net_id', school_net_id).execute()
    if not school.data:
        print(f"❌ School not found: {school_net_id}")
        continue
    school_id = school.data[0]['id']

    # Get DB athlete
    db_athlete = supabase.table('athletes').select('id, grad_year, gender').eq('name', db_name).eq('school_id', school_id).execute()
    if not db_athlete.data:
        print(f"❌ DB athlete not found: {db_name}")
        continue

    athlete_id_1 = db_athlete.data[0]['id']
    grad_year_1 = db_athlete.data[0]['grad_year']
    gender_1 = db_athlete.data[0]['gender']

    # Calculate CSV grad year
    grade = int(row['grade'])
    grad_year_2 = 2025 + (12 - grade)

    # Check if already flagged
    existing = supabase.table('potential_duplicate_athletes').select('id').eq('athlete_id_1', athlete_id_1).eq('name_2', csv_name).execute()
    if existing.data:
        print(f"✓ Already flagged: {csv_name} vs {db_name}")
        continue

    # Create potential duplicate record
    duplicate_data = {
        'athlete_id_1': athlete_id_1,
        'athlete_id_2': None,
        'school_id': school_id,
        'meet_id': meet_id,
        'name_1': db_name,
        'name_2': csv_name,
        'conflict_type': conflict_type,
        'grad_year_1': grad_year_1,
        'grad_year_2': grad_year_2,
        'gender_1': gender_1,
        'gender_2': gender_1,  # Same race, so same gender
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
        print(f"✓ Flagged: '{csv_name}' vs '{db_name}' ({conflict_type})")
        flagged_count += 1
    else:
        print(f"❌ Failed to flag: {csv_name}")

print(f"\n✓ Flagged {flagged_count} potential duplicate athletes")
print(f"\n=== SUMMARY ===")
print(f"New athletes created: {created_count}")
print(f"Potential duplicates flagged: {flagged_count}")
print(f"Total: {created_count + flagged_count} missing results addressed")
