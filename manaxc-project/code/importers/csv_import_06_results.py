#!/usr/bin/env python3
"""
STEP 6: Import Results from CSV

Imports results from 'westmont-xc-results - results.csv'
CSV has: Date, athlete_name, grad_year, Grade, time_cs, Event, Course, Season, Division, is_legacy_data

Requires:
- athletes table populated (run csv_import_03_athletes.py first)
- meets table populated (run csv_import_04_meets.py first)
- races table populated (run csv_import_05_races.py first)

This is the most complex import with:
- Athlete matching: (athlete_name + grad_year) → athlete_id
- Meet matching: (Event + Date) → meet_id
- Race matching: (meet_id + Course + Division/gender) → race_id
"""
import csv
from datetime import datetime
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

CSV_FILE = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - results.csv'

def parse_date(date_str):
    """Parse date from various formats"""
    if not date_str:
        return None

    # Try MM/DD/YY format
    try:
        dt = datetime.strptime(date_str, '%m/%d/%y')
        # Convert 2-digit year to 4-digit (assuming 1900s for < 70, 2000s for >= 70)
        if dt.year < 1970:
            dt = dt.replace(year=dt.year + 100)
        return dt.strftime('%Y-%m-%d')
    except:
        pass

    # Try other formats
    for fmt in ['%m/%d/%Y', '%Y-%m-%d']:
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
        except:
            continue

    return None

def import_results():
    """Import results from CSV"""
    print("=" * 100)
    print("STEP 6: IMPORT RESULTS FROM CSV (FINAL STEP)")
    print("=" * 100)

    # Initialize Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get Westmont school_id (needed for creating missing athletes)
    print("\n📋 Getting Westmont school ID...")
    school_data = supabase.table('schools').select('id').eq('name', 'Westmont High School').execute()
    if not school_data.data:
        print("❌ ERROR: Westmont High School not found!")
        return
    westmont_id = school_data.data[0]['id']
    print(f"   ✅ Found Westmont (id: {westmont_id})")

    # Load lookup tables
    print("\n📋 Loading lookup tables...")

    # Athletes: (name, grad_year) → id
    print("   Loading athletes...")
    athlete_data = supabase.table('athletes').select('id, name, grad_year').execute()
    athlete_lookup = {(row['name'].strip(), row['grad_year']): row['id'] for row in athlete_data.data}
    print(f"   ✅ Loaded {len(athlete_lookup)} athletes")

    # Meets: (name, date) → id
    print("   Loading meets...")
    meet_data = supabase.table('meets').select('id, name, meet_date').execute()
    meet_lookup = {(row['name'].strip(), row['meet_date']): row['id'] for row in meet_data.data}
    print(f"   ✅ Loaded {len(meet_lookup)} meets")

    # Courses: name → id
    print("   Loading courses...")
    course_data = supabase.table('courses').select('id, name').execute()
    course_lookup = {row['name'].strip(): row['id'] for row in course_data.data}
    print(f"   ✅ Loaded {len(course_lookup)} courses")

    # Races: (meet_id, name, gender) → id
    print("   Loading races...")
    race_data = supabase.table('races').select('id, meet_id, name, gender, course_id').execute()
    race_lookup = {}
    for row in race_data.data:
        key = (row['meet_id'], row['name'].strip(), row['gender'])
        race_lookup[key] = row['id']
    print(f"   ✅ Loaded {len(race_lookup)} races")

    if len(athlete_lookup) == 0 or len(meet_lookup) == 0 or len(race_lookup) == 0:
        print("\n❌ ERROR: Missing required data! Run previous import scripts first.")
        return

    # Read CSV
    print(f"\n📂 Reading {CSV_FILE}...")
    results = []
    created_athletes = 0
    skipped_no_athlete = 0
    skipped_no_meet = 0
    skipped_no_race = 0

    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Parse date
            meet_date = parse_date(row['Date'])
            if not meet_date:
                skipped_no_meet += 1
                continue

            # Match athlete
            athlete_name = row['athlete_name'].strip() if row['athlete_name'] else ''
            grad_year = int(row['grad_year']) if row['grad_year'] and row['grad_year'].isdigit() else None
            gender = row['Division'].strip() if row['Division'] else None  # M/F in Division column

            # Skip if athlete_name is a grad year (legacy data issue)
            if athlete_name.isdigit():
                skipped_no_athlete += 1
                continue

            # Skip if no name or grad year
            if not athlete_name or not grad_year:
                skipped_no_athlete += 1
                continue

            athlete_key = (athlete_name, grad_year)
            athlete_id = athlete_lookup.get(athlete_key)

            # CREATE MISSING ATHLETE ON THE FLY
            if not athlete_id:
                try:
                    # Parse first/last name (simple split on last space)
                    name_parts = athlete_name.rsplit(' ', 1)
                    first_name = name_parts[0] if len(name_parts) > 1 else athlete_name
                    last_name = name_parts[1] if len(name_parts) > 1 else ''

                    new_athlete = {
                        'school_id': westmont_id,
                        'name': athlete_name,
                        'first_name': first_name,
                        'last_name': last_name,
                        'grad_year': grad_year,
                        'gender': gender if gender in ['M', 'F'] else None,
                        'is_active': grad_year >= 2025
                    }

                    result = supabase.table('athletes').insert(new_athlete).execute()
                    athlete_id = result.data[0]['id']
                    athlete_lookup[athlete_key] = athlete_id
                    created_athletes += 1

                except Exception as e:
                    skipped_no_athlete += 1
                    continue

            # Match meet
            event_name = row['Event'].strip() if row['Event'] else ''
            meet_key = (event_name, meet_date)
            meet_id = meet_lookup.get(meet_key)

            if not meet_id:
                skipped_no_meet += 1
                continue

            # Match race (meet_id + course + gender)
            course_name = row['Course'].strip() if row['Course'] else ''
            # gender already assigned above (line 124)

            # Find race for this meet with matching gender
            # Try exact match first (meet_id + "Not Disclosed" + gender)
            race_key = (meet_id, "Not Disclosed", gender)
            race_id = race_lookup.get(race_key)

            if not race_id:
                # Try to find any race with this meet_id and gender
                race_id = next(
                    (rid for (mid, rname, rgender), rid in race_lookup.items()
                     if mid == meet_id and rgender == gender),
                    None
                )

            if not race_id:
                skipped_no_race += 1
                continue

            # Parse time
            time_cs = int(row['time_cs']) if row['time_cs'] and row['time_cs'].isdigit() else None
            if not time_cs:
                continue

            result = {
                'athlete_id': athlete_id,
                'meet_id': meet_id,
                'race_id': race_id,
                'time_cs': time_cs,
                'data_source': 'excel_import',
                'is_legacy_data': True,  # All Westmont historical data is legacy
                'is_complete_results': False  # Only Westmont results, not full meet
            }
            results.append(result)

    print(f"   ✅ Loaded {len(results)} results from CSV")

    if created_athletes > 0:
        print(f"   ✨ Created {created_athletes} missing athletes on the fly")
    if skipped_no_athlete > 0:
        print(f"   ⚠️  Skipped {skipped_no_athlete} results (invalid athlete data)")
    if skipped_no_meet > 0:
        print(f"   ⚠️  Skipped {skipped_no_meet} results (no matching meet)")
    if skipped_no_race > 0:
        print(f"   ⚠️  Skipped {skipped_no_race} results (no matching race)")

    # Stats
    print(f"\n📊 Results Statistics:")
    print(f"   Total results: {len(results)}")
    print(f"   Created athletes: {created_athletes}")
    print(f"   Skipped (invalid athlete): {skipped_no_athlete}")
    print(f"   Skipped (no meet): {skipped_no_meet}")
    print(f"   Skipped (no race): {skipped_no_race}")
    print(f"   Ready to import: {len(results)}")

    # Preview
    print("\n📋 Preview (first 10 results):")
    print(f"{'Athlete ID (partial)':<22} {'Meet ID (partial)':<22} {'Time':<12}")
    print("-" * 60)

    def format_time_cs(cs):
        """Convert centiseconds to MM:SS.CC"""
        total_seconds = cs // 100
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        centis = cs % 100
        return f"{minutes:02d}:{seconds:02d}.{centis:02d}"

    for result in results[:10]:
        athlete_id_short = str(result['athlete_id'])[:20]
        meet_id_short = str(result['meet_id'])[:20]
        time = format_time_cs(result['time_cs'])
        print(f"{athlete_id_short:<22} {meet_id_short:<22} {time:<12}")

    if len(results) > 10:
        print(f"... and {len(results) - 10} more results")

    # Ask for confirmation
    print("\n" + "=" * 100)
    response = input("⚠️  Proceed with import? (yes/no): ").strip().lower()

    if response != 'yes':
        print("\n❌ Import cancelled")
        return

    # Get existing results (by athlete_id + meet_id + race_id)
    print("\n📋 Checking for existing results...")
    existing = supabase.table('results').select('athlete_id, meet_id, race_id').execute()
    existing_keys = {(row['athlete_id'], row['meet_id'], row['race_id']) for row in existing.data}
    print(f"   Found {len(existing_keys)} existing results")

    # Import in batches for better performance
    inserted = 0
    skipped = 0
    errors = []
    batch_size = 100

    print(f"\n💾 Importing {len(results)} results in batches of {batch_size}...\n")

    for batch_start in range(0, len(results), batch_size):
        batch_end = min(batch_start + batch_size, len(results))
        batch = results[batch_start:batch_end]

        # Filter out existing results in this batch
        new_results = []
        for result in batch:
            key = (result['athlete_id'], result['meet_id'], result['race_id'])
            if key in existing_keys:
                skipped += 1
            else:
                new_results.append(result)
                existing_keys.add(key)

        if not new_results:
            print(f"  ⏭️  Batch {batch_start+1:4d}-{batch_end:4d}: All existed, skipped")
            continue

        try:
            supabase.table('results').insert(new_results).execute()
            inserted += len(new_results)
            print(f"  ✅ Batch {batch_start+1:4d}-{batch_end:4d}: Imported {len(new_results)} results")
        except Exception as e:
            error_msg = f"Batch {batch_start+1}-{batch_end}: {str(e)}"
            errors.append(error_msg)
            print(f"  ❌ Batch {batch_start+1:4d}-{batch_end:4d}: ERROR: {str(e)[:50]}")

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
        print(f"\n🎉 Successfully imported {inserted} results!")
        if created_athletes > 0:
            print(f"   ✨ Auto-created {created_athletes} missing athletes during import")
        print("\n" + "=" * 100)
        print("✅ ALL CSV IMPORTS COMPLETE!")
        print("=" * 100)
        print("\n📌 Next Steps:")
        print("   1. Re-enable RLS: Run ENABLE_RLS_AFTER_IMPORT.sql in Supabase")
        print("   2. Verify data: Run verification queries")
        print("   3. Test website: Visit https://manaxc.com")

    return inserted, skipped, errors

if __name__ == '__main__':
    import_results()
