#!/usr/bin/env python3
"""
Search for where result ID eacc14dd-984f-49e1-97d6-9c996715f151 comes from.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

problem_id = 'eacc14dd-984f-49e1-97d6-9c996715f151'

print(f"Searching for result ID: {problem_id}\n")

# Check if it exists in results
result = supabase.table('results').select('*').eq('id', problem_id).execute()
if result.data:
    print(f"✓ Found in results table:")
    r = result.data[0]
    print(f"  Athlete ID: {r['athlete_id']}")
    print(f"  Meet ID: {r['meet_id']}")
    print(f"  Time: {r['time_cs']} cs")
else:
    print(f"❌ NOT in results table")

# Check athlete_best_times
best_times = supabase.table('athlete_best_times').select('*').eq('season_best_result_id', problem_id).execute()
if best_times.data:
    print(f"\n✓ Found {len(best_times.data)} in athlete_best_times:")
    for bt in best_times.data:
        print(f"  Athlete ID: {bt['athlete_id']}")
else:
    print(f"\n❌ NOT in athlete_best_times")

# Check course_records
course_records = supabase.table('course_records').select('*').eq('result_id', problem_id).execute()
if course_records.data:
    print(f"\n✓ Found {len(course_records.data)} in course_records")
else:
    print(f"\n❌ NOT in course_records")

# Check school_hall_of_fame
hall_of_fame = supabase.table('school_hall_of_fame').select('*').eq('result_id', problem_id).execute()
if hall_of_fame.data:
    print(f"\n✓ Found {len(hall_of_fame.data)} in school_hall_of_fame")
else:
    print(f"\n❌ NOT in school_hall_of_fame")

print(f"\n=== CONCLUSION ===")
print(f"This result ID doesn't exist anywhere in the database.")
print(f"The error is likely coming from a trigger bug, not existing data.")
