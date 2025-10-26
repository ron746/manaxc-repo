#!/usr/bin/env python3
"""
STEP 3: Import Athletes from CSV

Imports athletes from 'westmont-xc-results - athletes.csv'
CSV has: name, first_name, last_name, grad_year, school, gender

Requires: schools table has Westmont High School
"""
import csv
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

CSV_FILE = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - athletes.csv'

def import_athletes():
    """Import athletes from CSV"""
    print("=" * 100)
    print("STEP 3: IMPORT ATHLETES FROM CSV")
    print("=" * 100)

    # Initialize Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get Westmont school_id
    print("\n📋 Finding Westmont High School...")
    school_data = supabase.table('schools').select('id, name').eq('name', 'Westmont High School').execute()

    if not school_data.data:
        print("\n❌ ERROR: Westmont High School not found in database!")
        print("   The school should have been created by schema-v1.sql")
        return

    westmont_id = school_data.data[0]['id']
    print(f"   ✅ Found Westmont High School (id: {westmont_id})")

    # Read CSV
    print(f"\n📂 Reading {CSV_FILE}...")
    athletes = []

    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            athlete = {
                'school_id': westmont_id,
                'name': row['name'].strip(),
                'first_name': row['first_name'].strip() if row['first_name'] else None,
                'last_name': row['last_name'].strip() if row['last_name'] else None,
                'grad_year': int(row['grad_year']) if row['grad_year'] else None,
                'gender': row['gender'].strip() if row['gender'] else None,
                'is_active': int(row['grad_year']) >= 2025 if row['grad_year'] else False  # Active if not graduated yet
            }
            athletes.append(athlete)

    print(f"   ✅ Loaded {len(athletes)} athletes from CSV")

    # Stats
    grad_years = [a['grad_year'] for a in athletes if a['grad_year']]
    min_year = min(grad_years) if grad_years else 0
    max_year = max(grad_years) if grad_years else 0
    active_count = sum(1 for a in athletes if a['is_active'])

    print(f"\n📊 Athlete Statistics:")
    print(f"   Span: {min_year} - {max_year} ({max_year - min_year + 1} years)")
    print(f"   Active (not graduated): {active_count}")
    print(f"   Alumni: {len(athletes) - active_count}")

    # Gender breakdown
    male_count = sum(1 for a in athletes if a['gender'] == 'M')
    female_count = sum(1 for a in athletes if a['gender'] == 'F')
    print(f"   Male: {male_count}")
    print(f"   Female: {female_count}")

    # Preview
    print("\n📋 Preview (first 10 athletes):")
    print(f"{'Name':<35} {'Grad Year':<10} {'Gender':<8} {'Status':<10}")
    print("-" * 70)
    for athlete in athletes[:10]:
        name = athlete['name'][:33]
        grad = str(athlete['grad_year']) if athlete['grad_year'] else 'N/A'
        gender = athlete['gender'] if athlete['gender'] else 'N/A'
        status = 'Active' if athlete['is_active'] else 'Alumni'
        print(f"{name:<35} {grad:<10} {gender:<8} {status:<10}")

    if len(athletes) > 10:
        print(f"... and {len(athletes) - 10} more athletes")

    # Ask for confirmation
    print("\n" + "=" * 100)
    response = input("⚠️  Proceed with import? (yes/no): ").strip().lower()

    if response != 'yes':
        print("\n❌ Import cancelled")
        return

    # Get existing athletes (by name + grad_year)
    print("\n📋 Checking for existing athletes...")
    existing = supabase.table('athletes').select('name, grad_year').execute()
    existing_keys = {(row['name'], row['grad_year']) for row in existing.data}
    print(f"   Found {len(existing_keys)} existing athletes")

    # Import
    inserted = 0
    skipped = 0
    errors = []

    print(f"\n💾 Importing {len(athletes)} athletes...\n")

    for idx, athlete in enumerate(athletes, 1):
        name = athlete['name']
        key = (name, athlete['grad_year'])

        # Skip if exists
        if key in existing_keys:
            print(f"  ⏭️  {idx:4d}. {name[:50]:<50} - exists")
            skipped += 1
            continue

        try:
            result = supabase.table('athletes').insert(athlete).execute()
            print(f"  ✅ {idx:4d}. {name[:50]:<50} - imported")
            inserted += 1
            existing_keys.add(key)
        except Exception as e:
            error_msg = f"{name}: {str(e)}"
            errors.append(error_msg)
            print(f"  ❌ {idx:4d}. {name[:50]:<50} - ERROR: {str(e)[:30]}")

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
        print(f"\n🎉 Successfully imported {inserted} athletes!")
        print(f"   Active: {active_count}, Alumni: {len(athletes) - active_count}")
        print("\n📌 Next Step: Run csv_import_04_meets.py")

    return inserted, skipped, errors

if __name__ == '__main__':
    import_athletes()
