#!/usr/bin/env python3
"""Import the missing result for Ariel Hung in meet 270614."""

import os
import csv
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get meet ID
meet_response = supabase.table('meets').select('id').eq('athletic_net_id', '270614').execute()
meet_id = meet_response.data[0]['id']

# Get race ID
race_response = supabase.table('races').select('id').eq('athletic_net_id', '1077801').execute()
if not race_response.data:
    print("Race 1077801 not found!")
    exit(1)
race_id = race_response.data[0]['id']

# Get school ID
school_response = supabase.table('schools').select('id').eq('athletic_net_id', 'school_westmont').execute()
school_id = school_response.data[0]['id']

# Get athlete ID
athlete_response = supabase.table('athletes').select('id').eq('name', 'Ariel Hung').eq('school_id', school_id).execute()
if not athlete_response.data:
    print("Athlete Ariel Hung not found!")
    exit(1)
athlete_id = athlete_response.data[0]['id']

print(f"Meet ID: {meet_id}")
print(f"Race ID: {race_id}")
print(f"School ID: {school_id}")
print(f"Athlete ID: {athlete_id}")

# Insert the result
result_data = {
    'meet_id': meet_id,
    'race_id': race_id,
    'athlete_id': athlete_id,
    'time_cs': 207460,  # 34:34.60
    'place_overall': None,  # Not specified in CSV
    'data_source': 'athletic_net'
}

print(f"\nInserting result: Ariel Hung - 34:34.60")

try:
    insert_result = supabase.table('results').insert(result_data).execute()
    if insert_result.data:
        print("✓ Result inserted successfully!")
        print(f"  Result ID: {insert_result.data[0]['id']}")
    else:
        print("✗ Insert failed")
except Exception as e:
    print(f"✗ Error: {e}")
