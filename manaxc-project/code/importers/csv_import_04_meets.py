#!/usr/bin/env python3
"""
STEP 4: Import Meets from CSV

Imports meets from 'westmont-xc-results - meets.csv'
CSV has: name, meet_date, season_year, venue_name

Requires: venues table populated (run csv_import_01_venues.py first)
"""
import csv
from datetime import datetime
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

CSV_FILE = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - meets.csv'

def import_meets():
    """Import meets from CSV"""
    print("=" * 100)
    print("STEP 4: IMPORT MEETS FROM CSV")
    print("=" * 100)

    # Initialize Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get venue lookup (name → id)
    print("\n📋 Loading venue lookup table...")
    venue_data = supabase.table('venues').select('id, name').execute()
    venue_lookup = {row['name'].strip(): row['id'] for row in venue_data.data}
    print(f"   ✅ Loaded {len(venue_lookup)} venues")

    if len(venue_lookup) == 0:
        print("\n❌ ERROR: No venues found! Run csv_import_01_venues.py first.")
        return

    # Read CSV
    print(f"\n📂 Reading {CSV_FILE}...")
    meets = []
    missing_venues = set()

    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            venue_name = row['venue_name'].strip() if row['venue_name'] else ''

            # Get venue_id
            venue_id = venue_lookup.get(venue_name)
            if not venue_id:
                missing_venues.add(venue_name)
                continue

            meet = {
                'name': row['name'].strip(),
                'meet_date': row['meet_date'].strip() if row['meet_date'] else None,
                'season_year': int(row['season_year']) if row['season_year'] else None,
                'venue_id': venue_id
            }
            meets.append(meet)

    print(f"   ✅ Loaded {len(meets)} meets from CSV")

    if missing_venues:
        print(f"\n   ⚠️  Warning: {len(missing_venues)} meets reference missing venues:")
        for v in list(missing_venues)[:5]:
            print(f"      - '{v}'")

    # Stats
    years = [m['season_year'] for m in meets if m['season_year']]
    min_year = min(years) if years else 0
    max_year = max(years) if years else 0

    print(f"\n📊 Meet Statistics:")
    print(f"   Span: {min_year} - {max_year} ({max_year - min_year + 1} seasons)")
    print(f"   Total meets: {len(meets)}")

    # Preview
    print("\n📋 Preview (first 10 meets):")
    print(f"{'Name':<40} {'Date':<12} {'Season':<8} {'Venue':<30}")
    print("-" * 100)

    # Rebuild reverse lookup for display
    venue_id_to_name = {v: k for k, v in venue_lookup.items()}

    for meet in meets[:10]:
        name = meet['name'][:38]
        date = meet['meet_date'][:10] if meet['meet_date'] else 'N/A'
        season = str(meet['season_year']) if meet['season_year'] else 'N/A'
        venue = venue_id_to_name.get(meet['venue_id'], 'Unknown')[:28]
        print(f"{name:<40} {date:<12} {season:<8} {venue:<30}")

    if len(meets) > 10:
        print(f"... and {len(meets) - 10} more meets")

    # Ask for confirmation
    print("\n" + "=" * 100)
    response = input("⚠️  Proceed with import? (yes/no): ").strip().lower()

    if response != 'yes':
        print("\n❌ Import cancelled")
        return

    # Get existing meets (by name + date)
    print("\n📋 Checking for existing meets...")
    existing = supabase.table('meets').select('name, meet_date').execute()
    existing_keys = {(row['name'], row['meet_date']) for row in existing.data}
    print(f"   Found {len(existing_keys)} existing meets")

    # Import
    inserted = 0
    skipped = 0
    errors = []

    print(f"\n💾 Importing {len(meets)} meets...\n")

    for idx, meet in enumerate(meets, 1):
        name = meet['name']
        key = (name, meet['meet_date'])

        # Skip if exists
        if key in existing_keys:
            print(f"  ⏭️  {idx:3d}. {name[:55]:<55} - exists")
            skipped += 1
            continue

        try:
            result = supabase.table('meets').insert(meet).execute()
            print(f"  ✅ {idx:3d}. {name[:55]:<55} - imported")
            inserted += 1
            existing_keys.add(key)
        except Exception as e:
            error_msg = f"{name} ({meet['meet_date']}): {str(e)}"
            errors.append(error_msg)
            print(f"  ❌ {idx:3d}. {name[:55]:<55} - ERROR: {str(e)[:30]}")

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
        print(f"\n🎉 Successfully imported {inserted} meets!")
        print(f"   Spanning {min_year}-{max_year}")
        print("\n📌 Next Step: Run csv_import_05_races.py")

    return inserted, skipped, errors

if __name__ == '__main__':
    import_meets()
