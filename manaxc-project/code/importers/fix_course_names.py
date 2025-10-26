#!/usr/bin/env python3
"""
Fix course name formatting in races.csv and results.csv

Changes: "Venue , Distance" → "Venue, Distance"
(Removes space before comma)
"""
import csv
import shutil
from datetime import datetime

def fix_course_names():
    """Fix course name formatting in races.csv and results.csv"""

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print("=" * 80)
    print("FIXING COURSE NAME FORMATTING")
    print("=" * 80)
    print("\nRemoving space before comma in course names...")
    print('  From: "Crystal Springs , 2.95 Miles"')
    print('  To:   "Crystal Springs, 2.95 Miles"')
    print()

    # Fix races.csv
    print("1. Processing races.csv...")
    races_input = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - races.csv'
    races_backup = f'/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - races.csv.backup_{timestamp}'

    # Create backup
    shutil.copy2(races_input, races_backup)
    print(f"   ✅ Backup created: {races_backup}")

    # Read and fix
    rows = []
    with open(races_input, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames

        for row in reader:
            # Fix course_name: remove space before comma
            if row['course_name']:
                row['course_name'] = row['course_name'].replace(' ,', ',')
            rows.append(row)

    # Write back
    with open(races_input, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)

    print(f"   ✅ Fixed {len(rows)} rows in races.csv")

    # Fix results.csv
    print("\n2. Processing results.csv...")
    results_input = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - results.csv'
    results_backup = f'/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - results.csv.backup_{timestamp}'

    # Create backup
    shutil.copy2(results_input, results_backup)
    print(f"   ✅ Backup created: {results_backup}")

    # Read and fix
    rows = []
    with open(results_input, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames

        for row in reader:
            # Fix Course column: remove space before comma
            if row['Course']:
                row['Course'] = row['Course'].replace(' ,', ',')
            rows.append(row)

    # Write back
    with open(results_input, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)

    print(f"   ✅ Fixed {len(rows)} rows in results.csv")

    # Verify the fix
    print("\n" + "=" * 80)
    print("VERIFYING FIXES")
    print("=" * 80)

    # Check races.csv
    print("\n✓ Sample course names from races.csv (after fix):")
    with open(races_input, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            if idx >= 5:
                break
            print(f"  '{row['course_name']}'")

    # Check results.csv
    print("\n✓ Sample course names from results.csv (after fix):")
    with open(results_input, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            if idx >= 5:
                break
            print(f"  '{row['Course']}'")

    # Validate matching
    print("\n" + "=" * 80)
    print("VALIDATION: Checking course name matching...")
    print("=" * 80)

    # Get course names from courses.csv
    courses_file = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - courses.csv'
    with open(courses_file, 'r', encoding='utf-8') as f:
        course_names = {row['name'].strip() for row in csv.DictReader(f)}

    # Get course names from races.csv
    with open(races_input, 'r', encoding='utf-8') as f:
        race_courses = {row['course_name'].strip() for row in csv.DictReader(f)}

    matched = len(race_courses & course_names)
    total = len(race_courses)
    match_pct = 100 * matched / total if total > 0 else 0

    print(f"\nCourses in courses.csv: {len(course_names)}")
    print(f"Unique courses in races.csv: {total}")
    print(f"Matched: {matched}/{total} ({match_pct:.1f}%)")

    if match_pct == 100:
        print("\n🎉 SUCCESS! All course names match perfectly!")
    elif match_pct > 90:
        print(f"\n✅ Good! {match_pct:.1f}% match rate")
        print(f"\nMissing {len(race_courses - course_names)} courses:")
        for c in sorted(race_courses - course_names)[:10]:
            print(f"  - '{c}'")
    else:
        print(f"\n⚠️  Only {match_pct:.1f}% match rate")
        print(f"\nMissing {len(race_courses - course_names)} courses (first 10):")
        for c in sorted(race_courses - course_names)[:10]:
            print(f"  - '{c}'")

    print("\n" + "=" * 80)
    print("✅ COURSE NAME FORMATTING FIXED!")
    print("=" * 80)
    print(f"\nBackups saved with timestamp: {timestamp}")
    print("If something went wrong, you can restore from backups.")

if __name__ == '__main__':
    fix_course_names()
