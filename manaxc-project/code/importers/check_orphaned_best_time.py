#!/usr/bin/env python3
"""
Check for orphaned athlete_best_times referencing non-existent result.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# The problematic result ID from the error
problem_result_id = 'eacc14dd-984f-49e1-97d6-9c996715f151'

print(f"Checking for orphaned reference: {problem_result_id}")

# Check if this result exists
result = supabase.table('results').select('id').eq('id', problem_result_id).execute()

if result.data:
    print(f"✓ Result exists")
else:
    print(f"❌ Result does NOT exist - orphaned reference!")

# Find athlete_best_times referencing this (just check season_best_result_id)
best_times = supabase.table('athlete_best_times').select('*').eq('season_best_result_id', problem_result_id).execute()

if best_times.data:
    print(f"\nFound {len(best_times.data)} athlete_best_times record(s) referencing this non-existent result:")
    for bt in best_times.data:
        print(f"  Athlete ID: {bt['athlete_id']}")
        print(f"  Distance: {bt['distance_meters']}m")
        print(f"  Season best result ID: {bt.get('season_best_result_id')}")
        print(f"  Career best result ID: {bt.get('career_best_result_id')}")
        print(f"  Record ID: {bt['id']}")
        print()

print(f"\nTo fix: Delete these orphaned athlete_best_times records")
