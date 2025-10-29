#!/usr/bin/env python3
"""
Check for specific athlete slugs that are causing collisions.
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

def check_slug(slug):
    """Check if a specific slug exists"""
    supabase = get_supabase_client()

    response = supabase.table('athletes').select(
        'id, first_name, last_name, grad_year, slug, school:schools!inner(id, name)'
    ).eq('slug', slug).execute()

    if response.data:
        print(f"\n✅ Found athlete(s) with slug: {slug}")
        for athlete in response.data:
            school = athlete.get('school', {})
            print(f"  ID: {athlete['id']}")
            print(f"  Name: {athlete['first_name']} {athlete['last_name']} ({athlete['grad_year']})")
            print(f"  School: {school.get('name', 'Unknown')}")
            print(f"  Slug: {athlete['slug']}")
    else:
        print(f"\n❌ No athlete found with slug: {slug}")

def main():
    print("🔍 Checking for specific slugs...")
    print("=" * 70)

    # Check the slugs that are causing errors
    slugs_to_check = [
        'ethan-chen-2029',
        'ethan-xu-2027',
        'jonathan-friedman-2027'
    ]

    for slug in slugs_to_check:
        check_slug(slug)

    print("\n" + "=" * 70)

    # Also check what the NEW format slugs should be for Ethan Chen and Ethan Xu
    print("\nChecking for expected new-format slugs:")

    new_format_slugs = [
        'ethan-chen-monte-vista-2029',
        'ethan-xu-redwood-larkspur-2027',
        'jonathan-friedman'  # Check all Jonathan Friedmans
    ]

    for slug in new_format_slugs:
        if slug == 'jonathan-friedman':
            # Search for all Jonathan Friedmans
            supabase = get_supabase_client()
            response = supabase.table('athletes').select(
                'id, first_name, last_name, grad_year, slug, school:schools!inner(id, name)'
            ).eq('first_name', 'Jonathan').eq('last_name', 'Friedman').execute()

            if response.data:
                print(f"\n✅ Found {len(response.data)} Jonathan Friedman(s):")
                for athlete in response.data:
                    school = athlete.get('school', {})
                    print(f"  ID: {athlete['id']}")
                    print(f"  Name: {athlete['first_name']} {athlete['last_name']} ({athlete['grad_year']})")
                    print(f"  School: {school.get('name', 'Unknown')}")
                    print(f"  Slug: {athlete['slug']}")
            else:
                print(f"\n❌ No Jonathan Friedman found")
        else:
            check_slug(slug)

    print("\n✅ Done!")

if __name__ == "__main__":
    main()
