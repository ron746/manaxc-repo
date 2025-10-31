#!/usr/bin/env python3
"""
Add the 1 missing result from meet 255929 (Andrew Xu or Anthony Martinez).
"""

import os
import csv as csv_module
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get meet ID
meet = supabase.table('meets').select('id').eq('athletic_net_id', '255929').execute()
meet_id = meet.data[0]['id']

# Read CSV to find the exact rows for Andrew Xu and Anthony Martinez
csv_file = 'to-be-processed/meet_255929_1761716332/results.csv'

print("Searching CSV for Andrew Xu and Anthony Martinez with time 113200...\n")

athletes_to_add = []

with open(csv_file, 'r') as f:
    reader = csv_module.DictReader(f)
    for row in reader:
        time_cs = int(row['time_cs'])
        name = f"{row['athlete_first_name']} {row['athlete_last_name']}"

        if time_cs == 113200 and (name == 'Andrew Xu' or name == 'Anthony Martinez'):
            athletes_to_add.append(row)
            print(f"Found: {name}")
            print(f"  School: {row['athlete_school_id']}")
            print(f"  Race: {row['athletic_net_race_id']}")
            print(f"  Grade: {row['grade']}")
            print(f"  Place: {row['place_overall']}")
            print()

if not athletes_to_add:
    print("❌ Athletes not found in CSV")
    exit(1)

print(f"Found {len(athletes_to_add)} athlete(s) to add\n")

# Add each athlete and their result
for row in athletes_to_add:
    name = f"{row['athlete_first_name']} {row['athlete_last_name']}"
    school_net_id = row['athlete_school_id']
    time_cs = int(row['time_cs'])
    grade = int(row['grade'])
    place = int(row['place_overall'])

    # Get school
    school = supabase.table('schools').select('id').eq('athletic_net_id', school_net_id).execute()
    if not school.data:
        print(f"❌ School not found: {school_net_id}")
        continue

    school_id = school.data[0]['id']

    # Calculate grad year
    grad_year = 2025 + (12 - grade)

    # Get race to determine gender
    race = supabase.table('races').select('id, name').eq('athletic_net_race_id', row['athletic_net_race_id']).execute()
    if not race.data:
        print(f"❌ Race not found: {row['athletic_net_race_id']}")
        continue

    race_id = race.data[0]['id']
    race_name = race.data[0]['name'].lower()
    gender = 'F' if 'women' in race_name or 'girls' in race_name else 'M'

    # Check if athlete exists
    athlete = supabase.table('athletes').select('id').eq('name', name).eq('school_id', school_id).execute()

    if athlete.data:
        athlete_id = athlete.data[0]['id']
        print(f"✓ Athlete exists: {name} ({athlete_id})")
    else:
        # Create athlete
        athlete_data = {
            'name': name,
            'school_id': school_id,
            'grad_year': grad_year,
            'gender': gender
        }

        try:
            result = supabase.table('athletes').insert(athlete_data).execute()
            if result.data:
                athlete_id = result.data[0]['id']
                print(f"✓ Created athlete: {name} (ID: {athlete_id}, grad {grad_year})")
            else:
                print(f"❌ Failed to create athlete: {name}")
                continue
        except Exception as e:
            print(f"❌ Error creating athlete {name}: {e}")
            continue

    # Check if result already exists
    existing_result = supabase.table('results').select('id').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).eq('time_cs', time_cs).execute()

    if existing_result.data:
        print(f"  ✓ Result already exists")
    else:
        # Add result
        result_data = {
            'meet_id': meet_id,
            'race_id': race_id,
            'athlete_id': athlete_id,
            'time_cs': time_cs,
            'place_overall': place,
            'data_source': 'athletic_net'
        }

        result = supabase.table('results').insert(result_data).execute()
        if result.data:
            print(f"  ✓ Added result: {time_cs} cs - Place {place}")
        else:
            print(f"  ❌ Failed to add result")

# Verify final count
total = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).execute()
print(f"\nMeet 255929 now has {total.count} results")
print(f"CSV has 1658 results")
print(f"Match: {total.count == 1658}")
