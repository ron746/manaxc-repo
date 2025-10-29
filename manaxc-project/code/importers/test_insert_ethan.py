#!/usr/bin/env python3
"""
Test inserting Ethan Chen from Monte Vista to see what happens.
"""

import os
from supabase import create_client
from dotenv import load_dotenv

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

    print("🧪 Testing insertion of Ethan Chen from Monte Vista...")
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

    # Try to insert Ethan Chen
    athlete_data = {
        'name': 'Ethan Chen',
        'first_name': 'Ethan',
        'last_name': 'Chen',
        'grad_year': 2029,
        'gender': 'M',
        'school_id': school['id']
    }

    print(f"\nAttempting to insert:")
    print(f"  Name: {athlete_data['name']}")
    print(f"  Grad Year: {athlete_data['grad_year']}")
    print(f"  School: {school['name']}")

    try:
        response = supabase.table('athletes').insert(athlete_data).execute()

        if response.data:
            athlete = response.data[0]
            print(f"\n✅ Athlete created successfully!")
            print(f"  ID: {athlete['id']}")
            print(f"  Generated slug: {athlete['slug']}")

            # Clean up - delete the test athlete
            delete_response = supabase.table('athletes').delete().eq('id', athlete['id']).execute()
            print(f"\n🗑️  Test athlete deleted")

        else:
            print(f"\n❌ No data returned from insert")

    except Exception as e:
        print(f"\n❌ Error inserting athlete: {e}")
        print(f"\nError details: {e}")

    print("\n" + "=" * 70)
    print("✅ Done!")

if __name__ == "__main__":
    main()
