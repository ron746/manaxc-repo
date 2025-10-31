#!/usr/bin/env python3
"""
Split large CSV files into smaller batches for incremental import
This avoids HTTP/2 connection timeouts on large datasets
"""
import os
import csv
import sys

def split_csv(input_file, output_dir, batch_size=2000, prefix='batch'):
    """Split a CSV file into multiple smaller files"""

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Read the CSV
    with open(input_file, 'r') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames

        batch_num = 1
        batch_rows = []
        total_rows = 0

        for row in reader:
            batch_rows.append(row)
            total_rows += 1

            if len(batch_rows) >= batch_size:
                # Write batch
                output_file = os.path.join(output_dir, f'{prefix}_{batch_num}.csv')
                with open(output_file, 'w', newline='') as out:
                    writer = csv.DictWriter(out, fieldnames=headers)
                    writer.writeheader()
                    writer.writerows(batch_rows)

                print(f"  Created {output_file}: {len(batch_rows)} rows")
                batch_num += 1
                batch_rows = []

        # Write remaining rows
        if batch_rows:
            output_file = os.path.join(output_dir, f'{prefix}_{batch_num}.csv')
            with open(output_file, 'w', newline='') as out:
                writer = csv.DictWriter(out, fieldnames=headers)
                writer.writeheader()
                writer.writerows(batch_rows)

            print(f"  Created {output_file}: {len(batch_rows)} rows")

    print(f"  Total: {total_rows} rows split into {batch_num} batches")
    return batch_num

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 split_csv_for_batched_import.py <folder>")
        print("Example: python3 split_csv_for_batched_import.py to-be-processed/meet_256230_1761716889")
        sys.exit(1)

    folder = sys.argv[1]
    batch_size = int(sys.argv[2]) if len(sys.argv) > 2 else 2000

    print("=" * 80)
    print("SPLITTING CSVs FOR BATCHED IMPORT")
    print("=" * 80)
    print()

    # Split athletes.csv
    athletes_file = os.path.join(folder, 'athletes.csv')
    if os.path.exists(athletes_file):
        print(f"Splitting {athletes_file}...")
        athletes_dir = os.path.join(folder, 'athletes_batches')
        split_csv(athletes_file, athletes_dir, batch_size, 'athletes')
        print()
    else:
        print(f"⚠️  {athletes_file} not found")
        print()

    # Split results.csv
    results_file = os.path.join(folder, 'results.csv')
    if os.path.exists(results_file):
        print(f"Splitting {results_file}...")
        results_dir = os.path.join(folder, 'results_batches')
        split_csv(results_file, results_dir, batch_size, 'results')
        print()
    else:
        print(f"⚠️  {results_file} not found")
        print()

    print("=" * 80)
    print("SPLIT COMPLETE")
    print("=" * 80)
    print()
    print("Next steps:")
    print(f"  1. Import athlete batches: venv/bin/python3 import_batched_athletes.py {folder}")
    print(f"  2. Import result batches: venv/bin/python3 import_batched_results.py {folder}")
    print(f"  3. Run housekeeping: venv/bin/python3 housekeeping_after_import.py {folder}")
