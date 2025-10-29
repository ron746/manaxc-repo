#!/usr/bin/env python3
"""
Test slug generation by attempting to insert a test athlete.
"""

import os
from supabase import create_client
from dotenv import load_dotenv
import uuid

# Load environment variables
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(env_path)

def get_supabase_client():
    """Create a Supabase client"""
    return create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    )

def main():
    supabase = get_supabase_client()

    print("🧪 Testing slug generation...")
    print("=" * 70)

    # Get Monte Vista school ID
    school_response = supabase.table('schools').select('id, name').eq(
        'name', 'Monte Vista'
    ).execute()

    if not school_response.data:
        print("❌ Monte Vista school not found!")
        return

    school = school_response.data[0]
    print(f"Using school: {school['name']} (ID: {school['id']})")

    # Try to insert a test athlete with a unique first name to avoid real collisions
    test_athlete = {
        'first_name': 'TestSlug',
        'last_name': 'Generation',
        'grad_year': 2025,
        'gender': 'M',
        'school_id': school['id']
    }

    print(f"\nInserting test athlete:")
    print(f"  Name: {test_athlete['first_name']} {test_athlete['last_name']}")
    print(f"  Grad Year: {test_athlete['grad_year']}")
    print(f"  School: {school['name']}")

    try:
        response = supabase.table('athletes').insert(test_athlete).execute()

        if response.data:
            athlete = response.data[0]
            print(f"\n✅ Athlete created successfully!")
            print(f"  Generated slug: {athlete['slug']}")
            print(f"  Expected format: testslug-generation-monte-vista-2025")

            # Clean up - delete the test athlete
            delete_response = supabase.table('athletes').delete().eq('id', athlete['id']).execute()
            print(f"\n🗑️  Test athlete deleted")

        else:
            print(f"\n❌ No data returned from insert")

    except Exception as e:
        print(f"\n❌ Error inserting test athlete: {e}")

    print("\n" + "=" * 70)
    print("✅ Done!")

if __name__ == "__main__":
    main()
