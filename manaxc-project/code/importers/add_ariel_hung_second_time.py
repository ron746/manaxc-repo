#!/usr/bin/env python3
"""
Add Ariel Hung's correct time (34:34.60) as a second result and flag as potential duplicate.
This creates a record of both times for admin review.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get IDs
meet = supabase.table('meets').select('id').eq('athletic_net_id', '270614').execute()
meet_id = meet.data[0]['id']

race = supabase.table('races').select('id').eq('athletic_net_id', '1077801').execute()
race_id = race.data[0]['id']

school = supabase.table('schools').select('id').eq('athletic_net_id', 'school_westmont').execute()
school_id = school.data[0]['id']

athlete = supabase.table('athletes').select('id').eq('name', 'Ariel Hung').eq('school_id', school_id).execute()
athlete_id = athlete.data[0]['id']

# Get the existing (incorrect) result
existing = supabase.table('results').select('id, time_cs').eq('athlete_id', athlete_id).eq('meet_id', meet_id).eq('race_id', race_id).execute()
existing_result_id = existing.data[0]['id']
existing_time = existing.data[0]['time_cs']

new_time = 207460

print(f"Existing result: {existing_time} cs ({existing_time/100:.2f} sec) - ID: {existing_result_id}")
print(f"New time from CSV: {new_time} cs ({new_time/100:.2f} sec)")
print(f"Difference: {new_time - existing_time} cs ({(new_time - existing_time)/100:.2f} sec)")

# Check if times are the same
if existing_time == new_time:
    print(f"\n⚠ Times are identical - this is a true duplicate, not adding second result")
    print(f"  No action needed - result already exists with correct time")
    exit(0)

# First, create the potential_duplicates table if it doesn't exist
# (User will need to run the SQL file we created first)

# Check if table exists
try:
    test = supabase.table('potential_duplicates').select('id').limit(1).execute()
    print("\n✓ potential_duplicates table exists")
except Exception as e:
    print(f"\n✗ potential_duplicates table doesn't exist yet")
    print(f"  Please run: code/database/create_potential_duplicates_table.sql in Supabase SQL Editor first")
    print(f"  Error: {e}")
    exit(1)

# Insert the new result - we'll mark it as needing review via the potential_duplicates table
# Keep same data_source but mark as needing_review to distinguish it
new_result_data = {
    'meet_id': meet_id,
    'race_id': race_id,
    'athlete_id': athlete_id,
    'time_cs': 207460,
    'place_overall': None,
    'data_source': 'athletic_net',
    'needs_review': True  # Flag this result as needing admin review
}

print(f"\nInserting corrected time as new result...")
try:
    new_result = supabase.table('results').insert(new_result_data).execute()
    if new_result.data:
        new_result_id = new_result.data[0]['id']
        print(f"✓ New result inserted: {new_result_id}")

        # Now create the potential duplicate record
        duplicate_data = {
            'result_id_1': existing_result_id,
            'result_id_2': new_result_id,
            'athlete_id': athlete_id,
            'meet_id': meet_id,
            'race_id': race_id,
            'conflict_type': 'different_times_same_race',
            'time_1_cs': existing_time,
            'time_2_cs': 207460,
            'time_difference_cs': 207460 - existing_time,
            'status': 'pending'
        }

        print(f"\nCreating potential duplicate record...")
        dup_result = supabase.table('potential_duplicates').insert(duplicate_data).execute()
        if dup_result.data:
            print(f"✓ Potential duplicate flagged for admin review")
            print(f"  Duplicate ID: {dup_result.data[0]['id']}")
            print(f"\nBoth times are now in the system:")
            print(f"  Result 1: {existing_time} cs ({existing_time/100:.2f} sec)")
            print(f"  Result 2: 207460 cs (2074.60 sec) ← from CSV")
            print(f"\nAdmin can review and decide which is correct.")
        else:
            print(f"✗ Failed to create duplicate record")
    else:
        print(f"✗ Failed to insert new result")
except Exception as e:
    print(f"✗ Error: {e}")
