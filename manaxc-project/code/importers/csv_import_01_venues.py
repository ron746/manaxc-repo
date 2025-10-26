#!/usr/bin/env python3
"""
STEP 1: Import Venues from CSV

Imports venues from 'westmont-xc-results - venues.csv'
CSV has: name

This is the first import - venues have no dependencies.
"""
import csv
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

CSV_FILE = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - venues.csv'

def import_venues():
    """Import venues from CSV"""
    print("=" * 100)
    print("STEP 1: IMPORT VENUES FROM CSV")
    print("=" * 100)

    # Initialize Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Read CSV
    print(f"\n📂 Reading {CSV_FILE}...")
    venues = []

    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            venue = {
                'name': row['name'].strip(),
                'state': 'CA'  # Default to California
            }
            venues.append(venue)

    print(f"   ✅ Loaded {len(venues)} venues from CSV")

    # Preview
    print("\n📋 Preview (first 20 venues):")
    for idx, venue in enumerate(venues[:20], 1):
        print(f"  {idx:2d}. {venue['name']}")

    if len(venues) > 20:
        print(f"  ... and {len(venues) - 20} more venues")

    # Ask for confirmation
    print("\n" + "=" * 100)
    response = input("⚠️  Proceed with import? (yes/no): ").strip().lower()

    if response != 'yes':
        print("\n❌ Import cancelled")
        return

    # Get existing venues
    print("\n📋 Checking for existing venues...")
    existing = supabase.table('venues').select('name').execute()
    existing_names = {row['name'] for row in existing.data}
    print(f"   Found {len(existing_names)} existing venues")

    # Import
    inserted = 0
    skipped = 0
    errors = []

    print(f"\n💾 Importing {len(venues)} venues...\n")

    for idx, venue in enumerate(venues, 1):
        name = venue['name']

        # Skip if exists
        if name in existing_names:
            print(f"  ⏭️  {idx:3d}. {name:<60} - exists")
            skipped += 1
            continue

        try:
            result = supabase.table('venues').insert(venue).execute()
            print(f"  ✅ {idx:3d}. {name:<60} - imported")
            inserted += 1
            existing_names.add(name)
        except Exception as e:
            error_msg = f"{name}: {str(e)}"
            errors.append(error_msg)
            print(f"  ❌ {idx:3d}. {name:<60} - ERROR: {str(e)[:30]}")

    # Summary
    print("\n" + "=" * 100)
    print("IMPORT SUMMARY")
    print("=" * 100)
    print(f"✅ Inserted:  {inserted}")
    print(f"⏭️  Skipped:   {skipped} (already existed)")
    print(f"❌ Errors:    {len(errors)}")

    if errors:
        print("\n⚠️  Errors encountered:")
        for error in errors[:10]:
            print(f"   - {error}")
        if len(errors) > 10:
            print(f"   ... and {len(errors) - 10} more errors")

    if inserted > 0:
        print(f"\n🎉 Successfully imported {inserted} venues!")
        print("\n📌 Next Step: Run csv_import_02_courses.py")

    return inserted, skipped, errors

if __name__ == '__main__':
    import_venues()
