#!/usr/bin/env python3
"""
Fix the final 2 course name mismatches

Changes:
1. "Crystal Springs, 2.95 miles" → "Crystal Springs, 2.95 Miles" (case fix)
2. "Half Moon Bay HS , 2.25 Miles" → "Half Moon Bay HS, 2.25 Miles" (spacing fix in courses.csv)
"""
import csv
import shutil
from datetime import datetime

def fix_remaining_mismatches():
    """Fix the final 2 course name mismatches"""

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print("=" * 80)
    print("FIXING FINAL COURSE NAME MISMATCHES")
    print("=" * 80)
    print("\n2 issues to fix:")
    print('  1. "Crystal Springs, 2.95 miles" → "Crystal Springs, 2.95 Miles"')
    print('  2. "Half Moon Bay HS , 2.25 Miles" → "Half Moon Bay HS, 2.25 Miles"')
    print()

    # Fix 1: Crystal Springs case in races.csv and results.csv
    print("1. Fixing Crystal Springs case in races.csv...")
    races_input = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - races.csv'
    races_backup = f'{races_input}.backup_{timestamp}'

    shutil.copy2(races_input, races_backup)
    print(f"   ✅ Backup created: {races_backup}")

    rows = []
    fixed_count = 0
    with open(races_input, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames

        for row in reader:
            if row['course_name'] == 'Crystal Springs, 2.95 miles':
                row['course_name'] = 'Crystal Springs, 2.95 Miles'
                fixed_count += 1
            rows.append(row)

    with open(races_input, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)

    print(f"   ✅ Fixed {fixed_count} rows in races.csv")

    # Fix Crystal Springs case in results.csv
    print("\n2. Fixing Crystal Springs case in results.csv...")
    results_input = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - results.csv'
    results_backup = f'{results_input}.backup_{timestamp}'

    shutil.copy2(results_input, results_backup)
    print(f"   ✅ Backup created: {results_backup}")

    rows = []
    fixed_count = 0
    with open(results_input, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames

        for row in reader:
            if row['Course'] == 'Crystal Springs, 2.95 miles':
                row['Course'] = 'Crystal Springs, 2.95 Miles'
                fixed_count += 1
            rows.append(row)

    with open(results_input, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)

    print(f"   ✅ Fixed {fixed_count} rows in results.csv")

    # Fix 3: Half Moon Bay spacing in courses.csv
    print("\n3. Fixing Half Moon Bay spacing in courses.csv...")
    courses_input = '/Users/ron/manaxc/manaxc-project/reference/data/westmont-xc-results - courses.csv'
    courses_backup = f'{courses_input}.backup_{timestamp}'

    shutil.copy2(courses_input, courses_backup)
    print(f"   ✅ Backup created: {courses_backup}")

    rows = []
    fixed_count = 0
    with open(courses_input, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames

        for row in reader:
            if 'Half Moon Bay HS , ' in row['name']:
                row['name'] = row['name'].replace('Half Moon Bay HS , ', 'Half Moon Bay HS, ')
                fixed_count += 1
            rows.append(row)

    with open(courses_input, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)

    print(f"   ✅ Fixed {fixed_count} rows in courses.csv")

    # Verify the fix
    print("\n" + "=" * 80)
    print("VERIFYING FIXES")
    print("=" * 80)

    # Get course names from courses.csv
    with open(courses_input, 'r', encoding='utf-8') as f:
        course_names = {row['name'].strip() for row in csv.DictReader(f)}

    # Get course names from races.csv
    with open(races_input, 'r', encoding='utf-8') as f:
        race_courses = {row['course_name'].strip() for row in csv.DictReader(f) if row['course_name']}

    matched = len(race_courses & course_names)
    total = len(race_courses)
    match_pct = 100 * matched / total if total > 0 else 0

    print(f"\nCourses in courses.csv: {len(course_names)}")
    print(f"Unique courses in races.csv: {total}")
    print(f"Matched: {matched}/{total} ({match_pct:.1f}%)")

    if match_pct == 100:
        print("\n🎉 SUCCESS! All course names now match perfectly!")
    else:
        print(f"\n⚠️  Still {len(race_courses - course_names)} unmatched courses:")
        for c in sorted(race_courses - course_names)[:10]:
            print(f"  - '{c}'")

    print("\n" + "=" * 80)
    print("✅ FINAL COURSE NAME FIXES COMPLETE!")
    print("=" * 80)
    print(f"\nBackups saved with timestamp: {timestamp}")

if __name__ == '__main__':
    fix_remaining_mismatches()
