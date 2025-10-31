#!/usr/bin/env python3
"""
Update the cached result_count for meet 254332 after adding Miguel Rodriguez's result.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get meet
meet = supabase.table('meets').select('id, result_count').eq('athletic_net_id', '254332').execute()
meet_id = meet.data[0]['id']
cached_count = meet.data[0].get('result_count')

print(f"Meet 254332 ID: {meet_id}")
print(f"Cached result_count: {cached_count}")

# Count actual results
actual = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).execute()
actual_count = actual.count

print(f"Actual results count: {actual_count}")

if cached_count != actual_count:
    print(f"\n❌ Mismatch! Updating cached count from {cached_count} to {actual_count}")

    # Update the cached count
    result = supabase.table('meets').update({'result_count': actual_count}).eq('id', meet_id).execute()

    if result.data:
        print(f"✓ Updated meet 254332 result_count to {actual_count}")
    else:
        print(f"✗ Failed to update")
else:
    print(f"\n✓ Counts match - no update needed")
