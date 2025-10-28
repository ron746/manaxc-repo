#!/usr/bin/env python3
"""
Batch import script for multiple schools
Scrapes and imports data for a list of schools for a given season
"""

import subprocess
import sys
import time
from datetime import datetime

# School Athletic.net IDs mapping
# TODO: Need to look up the numeric IDs for each school
SCHOOL_IDS = {
    # BVAL Schools
    'Andrew Hill': None,  # Need ID
    'Branham': None,
    'Christopher': None,
    'Del Mar': None,
    'Evergreen Valley': None,
    'Gilroy': None,
    'Gunderson': None,
    'Independence': None,
    'James Lick': None,
    'Leigh': None,
    'Leland': None,
    'Lincoln': None,
    'Live Oak': None,
    'Mt Pleasant': None,
    'Oak Grove': None,
    'Overfelt': None,
    'Piedmont Hills': None,
    'Pioneer': None,
    'Prospect': None,
    'San Jose': None,
    'Santa Teresa': None,
    'Silver Creek': None,
    'Sobrato': None,
    'Westmont': 1076,  # We know this one!
    'Willow Glen': None,
    'Yerba Buena': None,

    # Division 2 Schools (additional)
    'Archbishop Mitty': None,
    'Cupertino': None,
    'Everett Alvarez': None,
    'Fremont': None,
    'Gunn': None,
    'Junipero Serra': None,
    'Los Gatos': None,
    'Lynbrook': None,
    'Mountain View': None,
    'Palo Alto': None,
    'Rancho San Juan': None,
    'Saint Francis': None,
    'Santa Clara': None,
    'Sequoia': None,
}

def scrape_school(school_name, school_id, season):
    """Scrape data for a single school"""
    print(f"\n{'='*60}")
    print(f"📚 {school_name} (ID: {school_id})")
    print(f"{'='*60}")

    try:
        # Run scraper
        result = subprocess.run(
            ['venv/bin/python3', 'athletic_net_scraper_v2.py', 'school-meets', str(school_id), str(season)],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        if result.returncode == 0:
            print(f"✅ Scraping completed for {school_name}")
            print(result.stdout)
            return True
        else:
            print(f"❌ Scraping failed for {school_name}")
            print(result.stderr)
            return False

    except subprocess.TimeoutExpired:
        print(f"⏱️ Timeout scraping {school_name}")
        return False
    except Exception as e:
        print(f"❌ Error scraping {school_name}: {e}")
        return False


def import_scraped_data(folder_name):
    """Import scraped data from a folder"""
    print(f"\n📥 Importing data from {folder_name}...")

    try:
        result = subprocess.run(
            ['venv/bin/python3', 'import_csv_data.py', f'to-be-processed/{folder_name}'],
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )

        if result.returncode == 0:
            print(f"✅ Import completed")
            print(result.stdout)
            return True
        else:
            print(f"❌ Import failed")
            print(result.stderr)
            return False

    except subprocess.TimeoutExpired:
        print(f"⏱️ Timeout importing data")
        return False
    except Exception as e:
        print(f"❌ Error importing: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 batch_import_schools.py <season_year>")
        print("Example: python3 batch_import_schools.py 2025")
        sys.exit(1)

    season = sys.argv[1]

    print(f"\n🏃 Batch Import for {season} Season")
    print(f"Starting at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total schools to process: {len([s for s in SCHOOL_IDS.values() if s is not None])}")

    stats = {
        'total': 0,
        'scraped': 0,
        'imported': 0,
        'failed': 0,
        'skipped': 0
    }

    for school_name, school_id in SCHOOL_IDS.items():
        if school_id is None:
            print(f"\n⏭️  Skipping {school_name} (no Athletic.net ID)")
            stats['skipped'] += 1
            continue

        stats['total'] += 1

        # Scrape
        if scrape_school(school_name, school_id, season):
            stats['scraped'] += 1

            # Find the folder that was just created
            # It will be named like school_<id>_<timestamp>
            import os
            import glob
            folders = glob.glob(f'to-be-processed/school_{school_id}_*')
            if folders:
                latest_folder = max(folders, key=os.path.getctime)
                folder_name = os.path.basename(latest_folder)

                # Import
                time.sleep(2)  # Brief pause between scrape and import
                if import_scraped_data(folder_name):
                    stats['imported'] += 1
                else:
                    stats['failed'] += 1
                    print(f"⚠️  Data scraped but import failed for {school_name}")
            else:
                stats['failed'] += 1
                print(f"⚠️  Could not find scraped data folder for {school_name}")
        else:
            stats['failed'] += 1

        # Pause between schools to avoid rate limiting
        if stats['total'] < len([s for s in SCHOOL_IDS.values() if s is not None]):
            print(f"\n⏸️  Pausing 5 seconds before next school...")
            time.sleep(5)

    # Print summary
    print(f"\n\n{'='*60}")
    print("📊 BATCH IMPORT SUMMARY")
    print(f"{'='*60}")
    print(f"Total schools processed: {stats['total']}")
    print(f"Successfully scraped: {stats['scraped']}")
    print(f"Successfully imported: {stats['imported']}")
    print(f"Failed: {stats['failed']}")
    print(f"Skipped (no ID): {stats['skipped']}")
    print(f"\nCompleted at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == '__main__':
    main()
