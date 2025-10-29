#!/usr/bin/env python3
"""
Identify and fix duplicate athlete slugs that are still using the old format.
This script finds athletes with slug collisions and regenerates their slugs
using the new format that includes school name.
"""

import os
from supabase import create_client
from dotenv import load_dotenv
import re

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

def slugify(text):
    """Convert text to slug format"""
    if not text:
        return ''
    # Convert to lowercase and replace non-alphanumeric characters with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', text.lower())
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    return slug

def generate_new_slug(athlete, school_name):
    """Generate a slug in the new format: {first_name}-{last_name}-{school_slug}-{grad_year}"""
    first_name_slug = slugify(athlete.get('first_name', ''))
    last_name_slug = slugify(athlete.get('last_name', ''))
    school_slug = slugify(school_name)
    grad_year = athlete.get('grad_year', '')

    return f"{first_name_slug}-{last_name_slug}-{school_slug}-{grad_year}"

def is_old_format_slug(slug):
    """Check if a slug is in old format (no school name)"""
    # Old format: {first_name}-{last_name}-{grad_year}
    # New format: {first_name}-{last_name}-{school_slug}-{grad_year}
    parts = slug.split('-')
    # If the last part is a 4-digit year and there are only 3 parts, it's old format
    if len(parts) == 3 and parts[-1].isdigit() and len(parts[-1]) == 4:
        return True
    return False

def find_duplicate_slugs():
    """Find all athletes with duplicate slugs"""
    supabase = get_supabase_client()

    print("🔍 Searching for duplicate slugs...")
    print("=" * 70)

    # Get all athletes with pagination to handle more than 1000 rows
    athletes = []
    PAGE_SIZE = 1000
    page = 0
    has_more = True

    while has_more:
        from_idx = page * PAGE_SIZE
        to_idx = from_idx + PAGE_SIZE - 1

        response = supabase.table('athletes').select(
            'id, first_name, last_name, grad_year, slug, school:schools!inner(id, name)'
        ).range(from_idx, to_idx).execute()

        if response.data:
            athletes.extend(response.data)
            if len(response.data) < PAGE_SIZE:
                has_more = False
            else:
                page += 1
        else:
            has_more = False

    print(f"Found {len(athletes)} total athletes")

    # Group by slug to find duplicates
    slug_groups = {}
    for athlete in athletes:
        slug = athlete['slug']
        if slug not in slug_groups:
            slug_groups[slug] = []
        slug_groups[slug].append(athlete)

    # Find duplicates
    duplicates = {slug: group for slug, group in slug_groups.items() if len(group) > 1}

    if not duplicates:
        print("\n✅ No duplicate slugs found!")
        return []

    print(f"\n❌ Found {len(duplicates)} duplicate slugs affecting {sum(len(group) for group in duplicates.values())} athletes:")
    print("=" * 70)

    duplicate_list = []
    for slug, group in duplicates.items():
        print(f"\nSlug: {slug}")
        print(f"  Old format: {is_old_format_slug(slug)}")
        for athlete in group:
            school = athlete.get('school', {})
            print(f"  - ID: {athlete['id']}")
            print(f"    Name: {athlete['first_name']} {athlete['last_name']} ({athlete['grad_year']})")
            print(f"    School: {school.get('name', 'Unknown')}")
            duplicate_list.append({
                'athlete': athlete,
                'school_name': school.get('name', 'Unknown'),
                'slug': slug,
                'is_old_format': is_old_format_slug(slug)
            })

    return duplicate_list

def fix_duplicate_slugs(duplicates):
    """Fix duplicate slugs by regenerating them with the new format"""
    if not duplicates:
        print("\n✅ No duplicates to fix!")
        return

    supabase = get_supabase_client()

    print("\n" + "=" * 70)
    print("🔧 Fixing duplicate slugs...")
    print("=" * 70)

    # Group duplicates by slug
    by_slug = {}
    for dup in duplicates:
        slug = dup['slug']
        if slug not in by_slug:
            by_slug[slug] = []
        by_slug[slug].append(dup)

    fixed_count = 0
    error_count = 0

    for slug, group in by_slug.items():
        print(f"\nProcessing slug: {slug}")

        # For each duplicate in the group
        for dup in group:
            athlete = dup['athlete']
            school_name = dup['school_name']

            # Generate new slug
            new_slug = generate_new_slug(athlete, school_name)

            print(f"  Athlete: {athlete['first_name']} {athlete['last_name']} ({school_name})")
            print(f"    Old slug: {slug}")
            print(f"    New slug: {new_slug}")

            # Check if new slug already exists
            check_response = supabase.table('athletes').select('id').eq('slug', new_slug).execute()

            if check_response.data and check_response.data[0]['id'] != athlete['id']:
                print(f"    ⚠️  New slug already exists! Skipping...")
                error_count += 1
                continue

            # Update the slug
            try:
                update_response = supabase.table('athletes').update({
                    'slug': new_slug
                }).eq('id', athlete['id']).execute()

                print(f"    ✅ Updated successfully!")
                fixed_count += 1
            except Exception as e:
                print(f"    ❌ Error updating: {e}")
                error_count += 1

    print("\n" + "=" * 70)
    print(f"📊 Summary:")
    print(f"  Fixed: {fixed_count}")
    print(f"  Errors: {error_count}")
    print("=" * 70)

def main():
    print("🔍 Duplicate Slug Finder and Fixer")
    print("=" * 70)

    # Find duplicates
    duplicates = find_duplicate_slugs()

    if duplicates:
        print("\n" + "=" * 70)
        response = input("Do you want to fix these duplicate slugs? (yes/no): ")

        if response.lower() in ['yes', 'y']:
            fix_duplicate_slugs(duplicates)
        else:
            print("\nSkipping fix. No changes made.")

    print("\n✅ Done!")

if __name__ == "__main__":
    main()
