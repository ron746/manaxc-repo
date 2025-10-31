#!/usr/bin/env python3
"""
Flag Miguel Rodriguez as a potential duplicate athlete.
CSV has "Miguel Rodriguez", DB has "Miguel A. Rodriguez" - might be different people.
"""

import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get IDs
school = supabase.table('schools').select('id').eq('athletic_net_id', 'school_redwood_(visalia)').execute()
school_id = school.data[0]['id']

athlete_db = supabase.table('athletes').select('id, name, grad_year, gender').eq('slug', 'miguel-rodriguez-redwood-visalia-2028').execute()
athlete_id_1 = athlete_db.data[0]['id']
name_1 = athlete_db.data[0]['name']
grad_year_1 = athlete_db.data[0]['grad_year']
gender_1 = athlete_db.data[0]['gender']

meet = supabase.table('meets').select('id').eq('athletic_net_id', '254332').execute()
meet_id = meet.data[0]['id']

print(f"Existing athlete in DB:")
print(f"  Name: {name_1}")
print(f"  ID: {athlete_id_1}")
print(f"  Grad Year: {grad_year_1}")

# CSV data for Miguel Rodriguez
csv_row = {
    'race_athletic_net_id': '1015487',
    'athlete_name': 'Miguel Rodriguez',
    'first_name': 'Miguel',
    'last_name': 'Rodriguez',
    'school_athletic_net_id': 'school_redwood_(visalia)',
    'time_cs': 124551,
    'place_overall': 85,
    'grade': 10,
    'needs_review': False
}

# Check if already flagged
existing = supabase.table('potential_duplicate_athletes').select('id').eq('athlete_id_1', athlete_id_1).eq('name_2', 'Miguel Rodriguez').eq('school_id', school_id).execute()

if existing.data:
    print(f"\n✓ Already flagged as potential duplicate: {existing.data[0]['id']}")
else:
    # Create potential duplicate record
    print(f"\nFlagging as potential duplicate athlete...")

    duplicate_data = {
        'athlete_id_1': athlete_id_1,
        'athlete_id_2': None,  # CSV athlete doesn't exist yet
        'school_id': school_id,
        'meet_id': meet_id,
        'name_1': name_1,
        'name_2': 'Miguel Rodriguez',
        'conflict_type': 'middle_initial_difference',
        'grad_year_1': grad_year_1,
        'grad_year_2': 2028,
        'gender_1': gender_1,
        'gender_2': 'M',
        'csv_data': json.dumps(csv_row),
        'status': 'pending'
    }

    result = supabase.table('potential_duplicate_athletes').insert(duplicate_data).execute()

    if result.data:
        print(f"✓ Flagged successfully!")
        print(f"  Duplicate ID: {result.data[0]['id']}")
        print(f"\n  Admin can review:")
        print(f"    - Are 'Miguel A. Rodriguez' and 'Miguel Rodriguez' the same person?")
        print(f"    - If YES: Use Miguel A. Rodriguez's ID for the result")
        print(f"    - If NO: Create new athlete 'Miguel Rodriguez' and import result")
    else:
        print(f"✗ Failed to flag")

print("\n✓ Done")
