#!/usr/bin/env python3
"""
Import missing results from meet 254378:
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

# Read CSV
csv_file = 'to-be-processed/meet_254378_1761786641/results.csv'
csv_rows = {}
with open(csv_file, 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        time_cs = int(row['time_cs'])
        athlete_key = (row['athlete_first_name'], row['athlete_last_name'], row['athlete_school_id'])
        csv_rows[athlete_key] = row

# Category 2: New athletes to create + add results
new_athletes = [
    ('Zach', 'Causee', 'school_st._margaret\'s'),
    ('Samarth', 'Wadhwa', 'school_st._margaret\'s'),
    ('Benjamin', 'Harrison', 'school_st._margaret\'s'),
    ('Zaiden', 'Gurusamy', 'school_st._margaret\'s'),
    ('Parker', 'Oh', 'school_st._margaret\'s'),
    ('Tyler', 'Sant', 'school_st._margaret\'s'),
    ('Kate', 'Sullivan', 'school_st._margaret\'s'),
    ('Yumi', 'Yeh', 'school_st._margaret\'s'),
    ('Addy', 'Oh', 'school_st._margaret\'s'),
]

print("=== CREATING NEW ATHLETES & RESULTS ===\n")
created_count = 0
for first, last, school_net_id in new_athletes:
    athlete_key = (first, last, school_net_id)
    if athlete_key not in csv_rows:
        print(f"❌ No CSV data for {first} {last}")
        continue

    row = csv_rows[athlete_key]

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

    athlete_name = f"{first} {last}"

    # Check if athlete already exists (shouldn't, but just in case)
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
        'time_cs': int(row['time_cs']),
        'place_overall': int(row['place_overall']),
        'data_source': 'athletic_net'
    }

    result = supabase.table('results').insert(result_data).execute()
    if result.data:
        print(f"  ✓ Added result: {int(row['time_cs'])} cs ({int(row['time_cs'])/100:.2f} sec)")
        created_count += 1
    else:
        print(f"  ❌ Failed to add result")

print(f"\n✓ Created {created_count} new athletes + results")

# Category 3: Potential duplicates - flag for admin review
print(f"\n=== FLAGGING POTENTIAL DUPLICATE ATHLETES ===\n")

potential_duplicates = [
    {
        'csv_name': ('Christian', 'DePrat', 'school_el_dorado'),
        'db_name': 'Christian Deprat',
        'conflict_type': 'capitalization_difference'
    },
    {
        'csv_name': ('Maggie', 'De la Rionda', 'school_thousand_oaks'),
        'db_name': 'Maggie De La Rionda',
        'conflict_type': 'capitalization_difference'
    },
    {
        'csv_name': ('Cameron', 'D\'Aunoy', 'school_morro_bay'),
        'db_name': 'Cameron D\'aunoy',
        'conflict_type': 'capitalization_difference'
    },
    {
        'csv_name': ('Maya', 'D\'Amour', 'school_san_marcos_(sb)'),
        'db_name': 'Maya D\'amour',
        'conflict_type': 'capitalization_difference'
    },
    {
        'csv_name': ('Chloe', 'O\'Brien', 'school_el_dorado'),
        'db_name': 'Chloe O\'brien',
        'conflict_type': 'capitalization_difference'
    },
    {
        'csv_name': ('Victor', 'leiva', 'school_laguna_creek'),
        'db_name': 'Victor Chan Leiva',
        'conflict_type': 'middle_name_difference'
    },
    {
        'csv_name': ('MiaBella', 'Medina', 'school_yosemite'),
        'db_name': 'Miabella Medina',
        'conflict_type': 'capitalization_difference'
    },
    {
        'csv_name': ('Lana', 'LoGuidice', 'school_west_ranch'),
        'db_name': 'Lana Loguidice',
        'conflict_type': 'capitalization_difference'
    },
    {
        'csv_name': ('Angel', 'Medina', 'school_mcfarland'),
        'db_name': 'Angel Tadeo Medina',  # Could also be Angel Medina Tadeo
        'conflict_type': 'middle_name_difference'
    }
]

flagged_count = 0
for dup in potential_duplicates:
    first, last, school_net_id = dup['csv_name']
    csv_full_name = f"{first} {last}"

    athlete_key = (first, last, school_net_id)
    if athlete_key not in csv_rows:
        print(f"❌ No CSV data for {csv_full_name}")
        continue

    row = csv_rows[athlete_key]

    # Get school ID
    school = supabase.table('schools').select('id').eq('athletic_net_id', school_net_id).execute()
    if not school.data:
        print(f"❌ School not found: {school_net_id}")
        continue
    school_id = school.data[0]['id']

    # Get DB athlete
    db_athlete = supabase.table('athletes').select('id, grad_year, gender').eq('name', dup['db_name']).eq('school_id', school_id).execute()
    if not db_athlete.data:
        print(f"❌ DB athlete not found: {dup['db_name']}")
        continue

    athlete_id_1 = db_athlete.data[0]['id']
    grad_year_1 = db_athlete.data[0]['grad_year']
    gender_1 = db_athlete.data[0]['gender']

    # Calculate CSV grad year
    grade = int(row['grade'])
    grad_year_2 = 2025 + (12 - grade)

    # Check if already flagged
    existing = supabase.table('potential_duplicate_athletes').select('id').eq('athlete_id_1', athlete_id_1).eq('name_2', csv_full_name).execute()
    if existing.data:
        print(f"✓ Already flagged: {csv_full_name} vs {dup['db_name']}")
        continue

    # Create potential duplicate record
    duplicate_data = {
        'athlete_id_1': athlete_id_1,
        'athlete_id_2': None,
        'school_id': school_id,
        'meet_id': meet_id,
        'name_1': dup['db_name'],
        'name_2': csv_full_name,
        'conflict_type': dup['conflict_type'],
        'grad_year_1': grad_year_1,
        'grad_year_2': grad_year_2,
        'gender_1': gender_1,
        'gender_2': gender_1,  # Same race, so same gender
        'csv_data': json.dumps({
            'race_athletic_net_id': row['athletic_net_race_id'],
            'athlete_name': csv_full_name,
            'first_name': first,
            'last_name': last,
            'school_athletic_net_id': school_net_id,
            'time_cs': int(row['time_cs']),
            'place_overall': int(row['place_overall']),
            'grade': int(row['grade'])
        }),
        'status': 'pending'
    }

    result = supabase.table('potential_duplicate_athletes').insert(duplicate_data).execute()
    if result.data:
        print(f"✓ Flagged: '{csv_full_name}' vs '{dup['db_name']}' ({dup['conflict_type']})")
        flagged_count += 1
    else:
        print(f"❌ Failed to flag: {csv_full_name}")

print(f"\n✓ Flagged {flagged_count} potential duplicate athletes")
print(f"\n=== SUMMARY ===")
print(f"New athletes created: {created_count}")
print(f"Potential duplicates flagged: {flagged_count}")
print(f"Total: {created_count + flagged_count} missing results addressed")
