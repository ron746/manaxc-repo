#!/usr/bin/env python3
"""
Update all existing races.csv files to include course_name field
by reading the corresponding courses.csv in each directory.
"""

import os
import csv
import sys

def update_races_csv(directory_path):
    """
    Update races.csv in the given directory with course_name from courses.csv

    Args:
        directory_path: Path to directory containing races.csv and courses.csv

    Returns:
        Tuple of (success: bool, message: str)
    """
    races_path = os.path.join(directory_path, 'races.csv')
    courses_path = os.path.join(directory_path, 'courses.csv')

    # Check if both files exist
    if not os.path.exists(races_path):
        return (False, f"races.csv not found in {directory_path}")

    if not os.path.exists(courses_path):
        return (False, f"courses.csv not found in {directory_path}")

    # Read course name from courses.csv
    try:
        with open(courses_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            courses = list(reader)

        if not courses:
            return (False, f"No courses found in {courses_path}")

        # Get the first course's name (typically only one course per meet)
        course_name = courses[0]['name']
        print(f"  Found course: {course_name}")

    except Exception as e:
        return (False, f"Error reading courses.csv: {e}")

    # Read races.csv
    try:
        with open(races_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            races = list(reader)
            fieldnames = reader.fieldnames

        if not races:
            return (False, f"No races found in {races_path}")

    except Exception as e:
        return (False, f"Error reading races.csv: {e}")

    # Check if course_name already exists
    if 'course_name' in fieldnames:
        print(f"  ⚠️  course_name field already exists, skipping")
        return (True, "Already has course_name field")

    # Add course_name to fieldnames
    new_fieldnames = list(fieldnames) + ['course_name']

    # Add course_name to each race
    for race in races:
        race['course_name'] = course_name

    # Write updated races.csv
    try:
        with open(races_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=new_fieldnames)
            writer.writeheader()
            writer.writerows(races)

        print(f"  ✅ Updated {len(races)} races with course_name")
        return (True, f"Updated {len(races)} races")

    except Exception as e:
        return (False, f"Error writing races.csv: {e}")


def main():
    """Find and update all races.csv files in to-be-processed directory"""
    base_path = '/Users/ron/manaxc/manaxc-project/code/importers/to-be-processed'

    if not os.path.exists(base_path):
        print(f"❌ Directory not found: {base_path}")
        sys.exit(1)

    print(f"🔍 Searching for races.csv files in {base_path}")
    print("=" * 70)

    # Find all subdirectories
    updated_count = 0
    skipped_count = 0
    error_count = 0

    for root, dirs, files in os.walk(base_path):
        if 'races.csv' in files:
            dir_name = os.path.basename(root)
            print(f"\n📁 Processing: {dir_name}")

            success, message = update_races_csv(root)

            if success:
                if "Already has" in message:
                    skipped_count += 1
                else:
                    updated_count += 1
            else:
                error_count += 1
                print(f"  ❌ {message}")

    # Print summary
    print("\n" + "=" * 70)
    print("📊 Summary:")
    print(f"  ✅ Updated: {updated_count} directories")
    print(f"  ⚠️  Skipped: {skipped_count} directories (already had course_name)")
    print(f"  ❌ Errors: {error_count} directories")
    print(f"  📝 Total processed: {updated_count + skipped_count + error_count} directories")

    if updated_count > 0:
        print(f"\n🎉 Successfully updated {updated_count} races.csv files!")


if __name__ == "__main__":
    main()
