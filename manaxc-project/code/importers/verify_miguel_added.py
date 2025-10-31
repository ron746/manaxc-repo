#!/usr/bin/env python3
"""
Verify Miguel Rodriguez's second time was added to meet 254332.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Miguel's athlete ID
athlete_id = 'd2e14bbf-01f8-4e8f-8bf5-3ef4fd59eafd'

# Get meet ID
meet = supabase.table('meets').select('id').eq('athletic_net_id', '254332').execute()
meet_id = meet.data[0]['id']

print(f"Meet 254332 ID: {meet_id}")
print(f"Miguel's athlete ID: {athlete_id}")

# Check all results for Miguel in this meet
results = supabase.table('results').select('id, time_cs, place_overall, race_id').eq('athlete_id', athlete_id).eq('meet_id', meet_id).execute()

print(f"\nMiguel has {len(results.data)} result(s) in meet 254332:")
for r in results.data:
    print(f"  - Result ID: {r['id']}")
    print(f"    Time: {r['time_cs']} cs ({r['time_cs']/100:.2f} sec)")
    print(f"    Place: {r['place_overall']}")
    print(f"    Race ID: {r['race_id']}")

# Count total results for meet 254332
total = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).execute()
print(f"\nTotal results in meet 254332: {total.count}")

# Check potential_duplicates
duplicates = supabase.table('potential_duplicates').select('*').eq('athlete_id', athlete_id).execute()
print(f"\nPotential duplicates flagged for Miguel: {len(duplicates.data)}")
for d in duplicates.data:
    print(f"  - Time 1: {d['time_1_cs']} cs, Time 2: {d['time_2_cs']} cs")
    print(f"    Difference: {d['time_difference_cs']} cs ({d['time_difference_cs']/100:.2f} sec)")
    print(f"    Status: {d['status']}")
