#!/usr/bin/env python3
"""
Check ALL Zach Causee athletes at St. Margaret's
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get school
school = supabase.table('schools').select('id').eq('athletic_net_id', "school_st._margaret's").execute()
school_id = school.data[0]['id']

# Check for ALL Zach Causee athletes
athletes = supabase.table('athletes').select('id, name, grad_year, created_at').ilike('name', '%causee%').eq('school_id', school_id).execute()

print(f"Found {len(athletes.data)} athlete(s) with 'Causee' in name at St. Margaret's:\n")
for a in athletes.data:
    print(f"ID: {a['id']}")
    print(f"Name: {a['name']}")
    print(f"Grad Year: {a['grad_year']}")
    print(f"Created: {a['created_at']}")

    # Check results
    results = supabase.table('results').select('id, time_cs, meet_id').eq('athlete_id', a['id']).execute()
    print(f"Results: {len(results.data)}")

    # Check best_times
    best_times = supabase.table('athlete_best_times').select('*').eq('athlete_id', a['id']).execute()
    print(f"Best times records: {len(best_times.data)}")
    if best_times.data:
        for bt in best_times.data:
            result_id = bt['season_best_result_id']
            # Check if result exists
            result = supabase.table('results').select('id').eq('id', result_id).execute()
            status = "OK" if result.data else "ORPHANED"
            print(f"  Season best result_id: {result_id} - {status}")
    print()
