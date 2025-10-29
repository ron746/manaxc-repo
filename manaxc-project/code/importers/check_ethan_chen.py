#!/usr/bin/env python3
"""
Check for Ethan Chen from Monte Vista in the database.
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

    print("🔍 Checking for Ethan Chen, Ethan Xu, and Jonathan Friedman...")
    print("=" * 70)

    # Check for all Ethan Chens
    response = supabase.table('athletes').select(
        'id, first_name, last_name, grad_year, slug, school:schools!inner(id, name)'
    ).eq('first_name', 'Ethan').eq('last_name', 'Chen').execute()

    if response.data:
        print(f"\n✅ Found {len(response.data)} Ethan Chen(s):")
        for athlete in response.data:
            school = athlete.get('school', {})
            print(f"  ID: {athlete['id']}")
            print(f"  Name: {athlete['first_name']} {athlete['last_name']} ({athlete['grad_year']})")
            print(f"  School: {school.get('name', 'Unknown')}")
            print(f"  Slug: {athlete['slug']}")
            print()
    else:
        print(f"\n❌ No Ethan Chen found")

    # Check for all Ethan Xus
    response = supabase.table('athletes').select(
        'id, first_name, last_name, grad_year, slug, school:schools!inner(id, name)'
    ).eq('first_name', 'Ethan').eq('last_name', 'Xu').execute()

    if response.data:
        print(f"\n✅ Found {len(response.data)} Ethan Xu(s):")
        for athlete in response.data:
            school = athlete.get('school', {})
            print(f"  ID: {athlete['id']}")
            print(f"  Name: {athlete['first_name']} {athlete['last_name']} ({athlete['grad_year']})")
            print(f"  School: {school.get('name', 'Unknown')}")
            print(f"  Slug: {athlete['slug']}")
            print()
    else:
        print(f"\n❌ No Ethan Xu found")

    # Check for all in Monte Vista school
    monte_vista_response = supabase.table('schools').select('id').eq('name', 'Monte Vista').execute()
    if monte_vista_response.data:
        school_id = monte_vista_response.data[0]['id']
        print(f"\nMonte Vista school ID: {school_id}")

        # Get all athletes from Monte Vista
        athletes_response = supabase.table('athletes').select(
            'id, first_name, last_name, grad_year, slug'
        ).eq('school_id', school_id).eq('first_name', 'Ethan').execute()

        if athletes_response.data:
            print(f"\n✅ Found {len(athletes_response.data)} Ethan(s) from Monte Vista:")
            for athlete in athletes_response.data:
                print(f"  {athlete['first_name']} {athlete['last_name']} ({athlete['grad_year']}) - {athlete['slug']}")
        else:
            print(f"\n❌ No Ethans from Monte Vista found")

    print("\n" + "=" * 70)
    print("✅ Done!")

if __name__ == "__main__":
    main()
