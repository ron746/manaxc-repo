#!/usr/bin/env python3
"""
Find athletes that were skipped during import due to slug collisions.
This script analyzes all CSV files in the processed directory and compares
them against the database to find missing athletes.
"""

import os
import csv
import time
from supabase import create_client
from dotenv import load_dotenv
from collections import defaultdict

# Load environment variables from the correct path
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(env_path)

def get_supabase_client():
    """Create a fresh Supabase client"""
    return create_client(
        os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
        os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    )

def query_with_retry(supabase_func, max_retries=3, delay=1):
    """Execute a Supabase query with retry logic"""
    for attempt in range(max_retries):
        try:
            return supabase_func()
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(delay * (2 ** attempt))  # Exponential backoff
                continue
            raise e

def find_skipped_athletes(base_path):
    """
    Find all athletes in CSV files that don't exist in the database.
    """
    skipped_athletes = []
    total_csv_athletes = 0
    processed_count = 0

    # Get fresh client
    supabase = get_supabase_client()
    client_refresh_interval = 1000  # Refresh client every 1000 queries
    queries_since_refresh = 0

    # Walk through all processed directories
    for root, dirs, files in os.walk(base_path):
        if 'athletes.csv' in files:
            athletes_path = os.path.join(root, 'athletes.csv')
            meet_name = os.path.basename(root)

            # Read athletes from CSV
            with open(athletes_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                athletes = list(reader)

            total_csv_athletes += len(athletes)
            print(f"Processing {len(athletes)} athletes from {meet_name}...")

            # Check each athlete against database
            for idx, athlete in enumerate(athletes):
                # Refresh client periodically to avoid connection timeout
                if queries_since_refresh >= client_refresh_interval:
                    print(f"  Refreshing connection... (processed {processed_count}/{total_csv_athletes})")
                    supabase = get_supabase_client()
                    queries_since_refresh = 0

                try:
                    # Get school_id from database using athletic_net_id
                    school_response = query_with_retry(
                        lambda: supabase.table('schools').select('id, name').eq(
                            'athletic_net_id',
                            athlete['school_athletic_net_id']
                        ).execute()
                    )
                    queries_since_refresh += 1

                    if not school_response.data:
                        print(f"  ⚠️  School not found: {athlete['school_athletic_net_id']}")
                        continue

                    school = school_response.data[0]

                    # Check if athlete exists
                    athlete_response = query_with_retry(
                        lambda: supabase.table('athletes').select('id, slug').eq(
                            'first_name', athlete['first_name']
                        ).eq(
                            'last_name', athlete['last_name']
                        ).eq(
                            'school_id', school['id']
                        ).execute()
                    )
                    queries_since_refresh += 1

                    if not athlete_response.data:
                        # Athlete doesn't exist in database
                        skipped_athletes.append({
                            'name': athlete['name'],
                            'first_name': athlete['first_name'],
                            'last_name': athlete['last_name'],
                            'grad_year': athlete['grad_year'],
                            'school_name': school['name'],
                            'school_id': school['id'],
                            'gender': athlete['gender'],
                            'source_file': athletes_path
                        })

                    processed_count += 1

                    # Progress update every 100 athletes
                    if processed_count % 100 == 0:
                        print(f"  Progress: {processed_count}/{total_csv_athletes} athletes checked, {len(skipped_athletes)} skipped found")

                except Exception as e:
                    print(f"  ❌ Error processing {athlete['name']}: {e}")
                    continue

    return skipped_athletes, total_csv_athletes

def main():
    base_path = '/Users/ron/manaxc/manaxc-project/code/importers/processed'

    print("🔍 Searching for skipped athletes...")
    print("=" * 70)

    skipped, total = find_skipped_athletes(base_path)

    print(f"\n📊 Results:")
    print(f"  Total athletes in CSV files: {total}")
    print(f"  Skipped athletes: {len(skipped)}")

    if skipped:
        print(f"\n❌ Skipped Athletes:")
        print("=" * 70)

        # Group by school for better readability
        by_school = defaultdict(list)
        for athlete in skipped:
            by_school[athlete['school_name']].append(athlete)

        for school_name, athletes in sorted(by_school.items()):
            print(f"\n🏫 {school_name}:")
            for athlete in athletes:
                print(f"  - {athlete['name']} ({athlete['grad_year']}) - {athlete['gender']}")
                print(f"    Source: {athlete['source_file']}")

        # Save to CSV for easy re-import
        output_file = '/Users/ron/manaxc/manaxc-project/code/importers/skipped_athletes.csv'
        with open(output_file, 'w', encoding='utf-8', newline='') as f:
            fieldnames = ['name', 'first_name', 'last_name', 'grad_year', 'gender', 'school_name', 'school_id', 'source_file']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(skipped)

        print(f"\n💾 Saved to: {output_file}")
        print(f"\nNext steps:")
        print(f"1. Run fix_athlete_slugs.sql to update the slug generation")
        print(f"2. Re-import the affected directories OR")
        print(f"3. Use the skipped_athletes.csv to manually insert these athletes")
    else:
        print(f"\n✅ No skipped athletes found!")

if __name__ == "__main__":
    main()
