#!/usr/bin/env python3
"""
Check if Zach Causee exists in DB and if this is a duplicate athlete situation.
CSV: Zach Causee (St. Margaret's) - 95750 cs
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Search for "Zach Causee" or similar names at St. Margaret's
school = supabase.table('schools').select('id, name').eq('athletic_net_id', 'school_st._margaret\'s').execute()
if school.data:
    school_id = school.data[0]['id']
    school_name = school.data[0]['name']
    print(f"School: {school_name} ({school_id})")

    # Search for athletes with similar names
    athletes = supabase.table('athletes').select('id, name, slug, grad_year, gender').eq('school_id', school_id).ilike('name', '%causee%').execute()

    if athletes.data:
        print(f"\nFound {len(athletes.data)} athlete(s) with 'Causee' in name:")
        for a in athletes.data:
            print(f"  - {a['name']} ({a['slug']}) - Grad {a['grad_year']}, {a['gender']}")

            # Check if they have results in meet 254378
            meet = supabase.table('meets').select('id').eq('athletic_net_id', '254378').execute()
            meet_id = meet.data[0]['id']

            results = supabase.table('results').select('time_cs, race_id').eq('athlete_id', a['id']).eq('meet_id', meet_id).execute()
            if results.data:
                print(f"    Has {len(results.data)} result(s) in meet 254378:")
                for r in results.data:
                    print(f"      Time: {r['time_cs']} cs ({r['time_cs']/100:.2f} sec)")
            else:
                print(f"    No results in meet 254378")
    else:
        print(f"\n❌ No athletes found with 'Causee' in name")
        print(f"This is likely a NEW athlete that needs to be created")
else:
    print(f"❌ School not found")
