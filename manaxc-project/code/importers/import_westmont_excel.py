#!/usr/bin/env python3
"""
Import Westmont XC Results from Excel to Supabase
Improved version with better error handling and course name matching
"""
import zipfile
import xml.etree.ElementTree as ET
from supabase import create_client
from datetime import datetime, timedelta
from collections import defaultdict

SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

def parse_excel_date(excel_date_value):
    """Convert Excel date serial number to Python date"""
    try:
        excel_epoch = datetime(1899, 12, 30)
        date_value = excel_epoch + timedelta(days=float(excel_date_value))
        return date_value.date()
    except:
        return None

def parse_time_decimal_to_centiseconds(decimal_value):
    """Convert Excel decimal time to centiseconds"""
    try:
        total_seconds = float(decimal_value) * 86400
        centiseconds = int(round(total_seconds * 100))
        return centiseconds
    except:
        return None

def normalize_course_name(name):
    """Normalize course name for matching"""
    if not name:
        return ""
    # Convert to lowercase and standardize spacing
    normalized = name.lower().strip()
    # Replace multiple spaces with single space
    normalized = ' '.join(normalized.split())
    return normalized

def parse_name(full_name):
    """Parse 'Last, First' format"""
    if not full_name or ',' not in full_name:
        return full_name, '', full_name

    parts = full_name.split(',', 1)
    last_name = parts[0].strip()
    first_name = parts[1].strip() if len(parts) > 1 else ''
    return f"{first_name} {last_name}".strip(), first_name, last_name

def main():
    print("=" * 100)
    print("IMPORTING WESTMONT XC RESULTS FROM EXCEL")
    print("=" * 100)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get Westmont school
    print("\n1. Finding Westmont High School...")
    westmont = supabase.table('schools').select('*').eq('name', 'Westmont High School').execute()
    if not westmont.data:
        print("   Creating Westmont High School...")
        result = supabase.table('schools').insert({
            'name': 'Westmont High School',
            'short_name': 'Westmont',
            'city': 'Campbell',
            'state': 'CA'
        }).execute()
        school_id = result.data[0]['id']
    else:
        school_id = westmont.data[0]['id']
    print(f"   ✅ Westmont ID: {school_id}")

    # Load courses from database with normalized names
    print("\n2. Loading courses from database...")
    courses_result = supabase.table('courses').select('id, name').execute()
    course_lookup = {}
    for course in courses_result.data:
        normalized = normalize_course_name(course['name'])
        course_lookup[normalized] = course['id']
    print(f"   ✅ Loaded {len(course_lookup)} courses")

    # Read Excel file
    print("\n3. Reading Excel file...")
    excel_file = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results.xlsx'
    z = zipfile.ZipFile(excel_file)

    # Get shared strings
    strings_xml = z.read('xl/sharedStrings.xml')
    strings_root = ET.fromstring(strings_xml)
    ns_strings = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    shared_strings = []
    for si in strings_root.findall('.//s:si', ns_strings):
        t = si.find('.//s:t', ns_strings)
        if t is not None and t.text:
            shared_strings.append(t.text)

    # Read MasterResults sheet
    sheet_xml = z.read('xl/worksheets/sheet7.xml')
    sheet_root = ET.fromstring(sheet_xml)
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

    # Parse rows
    print("   Parsing results...")
    rows = sheet_root.findall('.//s:row', ns)
    results_data = []
    unique_athletes = {}
    unique_courses_not_found = set()
    unique_meets = {}

    for idx, row in enumerate(rows[1:], 1):  # Skip header
        cells = row.findall('.//s:c', ns)
        if len(cells) < 8:
            continue

        # Extract values
        values = []
        for cell in cells[:10]:
            v = cell.find('.//s:v', ns)
            t = cell.get('t')
            if v is not None:
                if t == 's':
                    idx_str = int(v.text)
                    if idx_str < len(shared_strings):
                        values.append(shared_strings[idx_str])
                    else:
                        values.append('')
                else:
                    values.append(v.text)
            else:
                values.append('')

        if len(values) < 8:
            continue

        date_serial = values[0]
        athlete_name = values[1]
        grade_year = values[2]
        duration_decimal = values[3]
        event_name = values[4]
        course_name = values[5]

        if not athlete_name or not duration_decimal or not course_name:
            continue

        meet_date = parse_excel_date(date_serial)
        if not meet_date:
            continue

        # Determine season year
        if meet_date.month >= 8:
            year = meet_date.year + 1
        else:
            year = meet_date.year

        time_cs = parse_time_decimal_to_centiseconds(duration_decimal)
        if not time_cs:
            continue

        # Normalize course name for lookup
        normalized_course = normalize_course_name(course_name)
        course_id = course_lookup.get(normalized_course)

        if not course_id:
            unique_courses_not_found.add(course_name)
            continue

        results_data.append({
            'date': meet_date,
            'athlete_name': athlete_name,
            'grade_year': grade_year,
            'time_cs': time_cs,
            'event_name': event_name if event_name else 'Unknown Meet',
            'course_id': course_id,
            'season_year': year
        })

        # Track unique athletes
        if athlete_name not in unique_athletes:
            # Remove grad year suffix if present (e.g., "Ketterer, Adrian | 2026" -> "Ketterer, Adrian")
            clean_name = athlete_name.split('|')[0].strip() if '|' in athlete_name else athlete_name

            full_name, first_name, last_name = parse_name(clean_name)
            try:
                grad_year = int(float(grade_year))
            except:
                grad_year = year + 4

            unique_athletes[athlete_name] = {
                'name': full_name,
                'first_name': first_name,
                'last_name': last_name,
                'grad_year': grad_year,
                'gender': 'M',  # Default
                'school_id': school_id
            }

        # Track unique meets
        meet_key = f"{meet_date}_{event_name}"
        if meet_key not in unique_meets:
            unique_meets[meet_key] = {
                'name': event_name,
                'meet_date': meet_date,
                'season_year': year,
                'course_id': course_id
            }

        if idx % 500 == 0:
            print(f"   Processed {idx} rows...")

    print(f"\n   ✅ Parsed {len(results_data)} valid results")
    print(f"   ✅ Found {len(unique_athletes)} unique athletes")
    print(f"   ✅ Found {len(unique_meets)} unique meets")

    if unique_courses_not_found:
        print(f"\n   ⚠️  {len(unique_courses_not_found)} courses not found in database:")
        for course in list(unique_courses_not_found)[:10]:
            print(f"      - {course}")

    # Import athletes
    print(f"\n4. Importing {len(unique_athletes)} athletes...")
    athletes_cache = {}
    imported_athletes = 0
    existing_athletes = 0

    for athlete_name, athlete_data in unique_athletes.items():
        try:
            # Check if exists first
            existing = supabase.table('athletes').select('id').eq('name', athlete_data['name']).eq('school_id', school_id).execute()
            if existing.data:
                athletes_cache[athlete_name] = existing.data[0]['id']
                existing_athletes += 1
            else:
                result = supabase.table('athletes').insert(athlete_data).execute()
                athletes_cache[athlete_name] = result.data[0]['id']
                imported_athletes += 1
        except Exception as e:
            print(f"   Error importing {athlete_name}: {e}")

    print(f"   ✅ Imported {imported_athletes} new athletes, {existing_athletes} already existed")

    # Import meets
    print(f"\n5. Importing {len(unique_meets)} meets...")
    meets_cache = {}
    imported_meets = 0

    for meet_key, meet_data in unique_meets.items():
        try:
            # Check if exists
            existing = supabase.table('meets').select('id').eq('name', meet_data['name']).eq('meet_date', str(meet_data['meet_date'])).execute()
            if existing.data:
                meets_cache[meet_key] = existing.data[0]['id']
            else:
                result = supabase.table('meets').insert({
                    'name': meet_data['name'],
                    'meet_date': str(meet_data['meet_date']),
                    'season_year': meet_data['season_year'],
                    'course_id': meet_data['course_id']
                }).execute()
                meets_cache[meet_key] = result.data[0]['id']
                imported_meets += 1
        except Exception as e:
            print(f"   Error importing meet {meet_data['name']}: {e}")

    print(f"   ✅ Imported {imported_meets} meets")

    # Create default races for meets
    print(f"\n6. Creating races...")
    races_cache = {}
    created_races = 0

    for meet_key, meet_id in meets_cache.items():
        try:
            # Check if race exists
            existing = supabase.table('races').select('id').eq('meet_id', meet_id).limit(1).execute()
            if existing.data:
                races_cache[meet_key] = existing.data[0]['id']
            else:
                result = supabase.table('races').insert({
                    'meet_id': meet_id,
                    'name': 'Varsity',
                    'gender': 'M',
                    'division': 'Varsity',
                    'distance_meters': 5000
                }).execute()
                races_cache[meet_key] = result.data[0]['id']
                created_races += 1
        except Exception as e:
            print(f"   Error creating race: {e}")

    print(f"   ✅ Created {created_races} races")

    # Import results
    print(f"\n7. Importing {len(results_data)} results...")
    imported_count = 0
    error_count = 0

    for result in results_data:
        meet_key = f"{result['date']}_{result['event_name']}"
        athlete_id = athletes_cache.get(result['athlete_name'])
        race_id = races_cache.get(meet_key)

        if not athlete_id or not race_id:
            error_count += 1
            continue

        try:
            supabase.table('results').insert({
                'athlete_id': athlete_id,
                'race_id': race_id,
                'time_cs': result['time_cs'],
                'season_year': result['season_year']
            }).execute()
            imported_count += 1

            if imported_count % 100 == 0:
                print(f"   Imported {imported_count}/{len(results_data)}...")
        except Exception as e:
            error_count += 1
            if error_count <= 5:
                print(f"   Error: {e}")

    print(f"\n{'='*100}")
    print(f"✅ IMPORT COMPLETE!")
    print(f"   Athletes imported: {imported_athletes}")
    print(f"   Meets imported: {imported_meets}")
    print(f"   Races created: {created_races}")
    print(f"   Results imported: {imported_count}")
    print(f"   Errors: {error_count}")
    print(f"{'='*100}")

if __name__ == '__main__':
    main()
