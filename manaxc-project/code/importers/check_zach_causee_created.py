#!/usr/bin/env python3
"""
Check if Zach Causee was created during the failed import attempt.
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
if not school.data:
    print("School not found")
    exit(1)

school_id = school.data[0]['id']

# Check for Zach Causee
athletes = supabase.table('athletes').select('id, name, grad_year').eq('name', 'Zach Causee').eq('school_id', school_id).execute()

if athletes.data:
    print(f"Found {len(athletes.data)} athlete(s) named 'Zach Causee':")
    for a in athletes.data:
        print(f"  ID: {a['id']}")
        print(f"  Name: {a['name']}")
        print(f"  Grad Year: {a['grad_year']}")

        # Check if they have any results
        results = supabase.table('results').select('id, time_cs, meet_id').eq('athlete_id', a['id']).execute()
        print(f"  Results: {len(results.data)}")

        # Check if they have best_times
        best_times = supabase.table('athlete_best_times').select('*').eq('athlete_id', a['id']).execute()
        print(f"  Best times: {len(best_times.data)}")
        if best_times.data:
            for bt in best_times.data:
                print(f"    Season best: {bt['season_best_time_cs']} cs, result_id: {bt['season_best_result_id']}")
else:
    print("No athletes named 'Zach Causee' found")
