#!/usr/bin/env python3
"""
Delete all results for meet 254378 while keeping races, meet, and other data
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../../website/.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Missing Supabase credentials")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def main():
    print("="*80)
    print("DELETE RESULTS FOR MEET 254378")
    print("="*80)

    # Get meet ID
    athletic_net_meet_id = "254378"
    response = supabase.table('meets')\
        .select('id, name')\
        .eq('athletic_net_id', athletic_net_meet_id)\
        .execute()

    if not response.data:
        print(f"❌ Meet not found: {athletic_net_meet_id}")
        return

    meet = response.data[0]
    meet_id = meet['id']
    meet_name = meet['name']

    print(f"✓ Found meet: {meet_name}")
    print(f"  Meet ID: {meet_id}")

    # Count existing results
    count_response = supabase.table('results')\
        .select('id', count='exact')\
        .eq('meet_id', meet_id)\
        .execute()

    result_count = count_response.count if count_response.count else 0
    print(f"  Existing results: {result_count}")

    if result_count == 0:
        print("\n✓ No results to delete")
        return

    # Confirm deletion
    print(f"\n⚠️  WARNING: This will delete {result_count} results")
    print("   Races, meet, athletes, and schools will NOT be affected")
    confirm = input("\nType 'DELETE' to confirm: ")

    if confirm != 'DELETE':
        print("❌ Cancelled")
        return

    # Delete results
    print(f"\nDeleting {result_count} results...")
    delete_response = supabase.table('results')\
        .delete()\
        .eq('meet_id', meet_id)\
        .execute()

    print(f"✅ Deleted all results for meet {meet_name}")

    # Verify deletion
    verify_response = supabase.table('results')\
        .select('id', count='exact')\
        .eq('meet_id', meet_id)\
        .execute()

    remaining = verify_response.count if verify_response.count else 0
    print(f"   Remaining results: {remaining}")

    if remaining == 0:
        print("\n✅ All results successfully deleted!")
    else:
        print(f"\n⚠️  Warning: {remaining} results still remain")

if __name__ == '__main__':
    main()
