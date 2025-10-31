# Large Meet Import Guide

**Purpose**: Comprehensive guide for importing cross country meets with 2,000+ results, based on successful import of meet 254378 (4,655 results).

**Last Updated**: 2025-10-30

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Import Preparation](#pre-import-preparation)
3. [Initial Import Process](#initial-import-process)
4. [Post-Import Analysis](#post-import-analysis)
5. [Identifying Missing Results](#identifying-missing-results)
6. [Handling Missing Athletes](#handling-missing-athletes)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Performance Optimization](#performance-optimization)
9. [Scaling to 10K+ Results](#scaling-to-10k-results)

---

## Overview

### What Qualifies as a "Large Meet"?

- **Medium**: 1,000 - 2,999 results
- **Large**: 3,000 - 6,999 results (e.g., Clovis Invitational: 4,655)
- **X-Large**: 7,000 - 10,000+ results

### Key Challenges

1. **Database performance** - Bulk inserts can be slow
2. **Missing results** - Partial imports due to athlete mismatches
3. **Name variations** - Capitalization, middle names, special characters
4. **Tied times** - Multiple athletes with identical times
5. **Slug collisions** - Athletes with special characters in names

---

## Pre-Import Preparation

### 1. Disable Triggers

For large imports, disable triggers to improve performance:

```sql
-- In Supabase SQL editor
ALTER TABLE results DISABLE TRIGGER USER;
```

**Important**: Remember to re-enable after import!

### 2. Check Available Disk Space

Large meets generate significant temporary data:
- CSV files: ~1-5 MB per meet
- Analysis JSON: ~10-50 KB
- Logs: Variable

### 3. Verify Database Connection

```bash
source venv/bin/activate
python -c "
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='../../website/.env.local')
url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(url, key)

# Test connection
result = supabase.table('meets').select('id').limit(1).execute()
print('✓ Database connection successful')
"
```

---

## Initial Import Process

### 1. Run Standard Import

```bash
cd /path/to/importers
source venv/bin/activate
python athletic_net_scraper_v2.py meet <MEET_ID>
```

### 2. Check Import Status

After import completes, verify the result count:

```bash
python -c "
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='../../website/.env.local')
url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(url, key)

MEET_ID = '<MEET_UUID>'

# Get database count
db_count = supabase.table('results').select('id', count='exact').eq('meet_id', MEET_ID).execute()

# Get CSV count
import csv
csv_count = 0
with open('to-be-processed/meet_<ATHLETIC_NET_ID>_<TIMESTAMP>/results.csv', 'r') as f:
    csv_count = sum(1 for _ in csv.DictReader(f))

print(f'Database: {db_count.count} results')
print(f'CSV:      {csv_count} results')
print(f'Missing:  {csv_count - db_count.count} results')
"
```

---

## Post-Import Analysis

### When to Run Analysis

Run comprehensive analysis if:
- Database count < CSV count
- Import logs show errors or warnings
- Meet is particularly large (3,000+ results)

### Comprehensive Missing Results Analysis Script

Create `analyze_missing_<MEET_ID>.py`:

```python
#!/usr/bin/env python3
"""
Comprehensive analysis to identify ALL missing results for a meet.
Uses (athlete_name, race_id, time_cs) for comparison.
"""

import os
import csv
from collections import defaultdict
from supabase import create_client, Client
from dotenv import load_dotenv
import json

load_dotenv(dotenv_path='../../website/.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

# Configuration
MEET_ID = '<MEET_UUID>'
CSV_PATH = 'to-be-processed/meet_<ATHLETIC_NET_ID>_<TIMESTAMP>'

print("=" * 100)
print("COMPREHENSIVE MISSING RESULTS ANALYSIS")
print("=" * 100)

# Step 1: Load CSV results
print("\nStep 1: Loading CSV results...")
csv_results = []
with open(f'{CSV_PATH}/results.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_results.append({
            'athlete_name': row['athlete_name'],
            'race_id': row['athletic_net_race_id'],
            'time_cs': int(row['time_cs']),
            'place': row.get('place_overall', ''),
            'grad_year': row.get('grad_year', ''),
            'gender': row.get('gender', '')
        })

print(f"  CSV has {len(csv_results)} results")

# Step 2: Get race mapping
print("\nStep 2: Loading race mapping...")
races = supabase.table('races')\
    .select('id, athletic_net_race_id, name')\
    .eq('meet_id', MEET_ID)\
    .execute()

race_map = {r['athletic_net_race_id']: r for r in races.data if r['athletic_net_race_id']}
race_map_reverse = {r['id']: r for r in races.data}
print(f"  Found {len(race_map)} races")

# Step 3: Load database results with athlete names (paginated)
print("\nStep 3: Loading database results...")
db_results = []
offset = 0
batch_size = 1000

while True:
    batch = supabase.table('results')\
        .select('id, athlete_id, race_id, time_cs, athletes(name)')\
        .eq('meet_id', MEET_ID)\
        .range(offset, offset + batch_size - 1)\
        .execute()

    if not batch.data:
        break

    db_results.extend(batch.data)
    offset += batch_size

    print(f"  Loaded {len(db_results)} results so far...")

    if len(batch.data) < batch_size:
        break

print(f"  Database has {len(db_results)} total results")

# Step 4: Build comparison sets
print("\nStep 4: Building comparison sets...")

# DB set: (athlete_name, race_athletic_net_id, time_cs)
db_set = set()
for result in db_results:
    race_info = race_map_reverse.get(result['race_id'])
    if race_info and result['athletes']:
        athlete_name = result['athletes']['name']
        race_athletic_net_id = race_info['athletic_net_race_id']
        time_cs = result['time_cs']
        db_set.add((athlete_name, race_athletic_net_id, time_cs))

print(f"  Database set has {len(db_set)} unique tuples")

# Step 5: Find missing results
print("\nStep 5: Finding missing results...")
missing = []
for csv_result in csv_results:
    key = (csv_result['athlete_name'], csv_result['race_id'], csv_result['time_cs'])
    if key not in db_set:
        missing.append(csv_result)

print(f"\n{'=' * 100}")
print(f"FOUND {len(missing)} MISSING RESULTS")
print(f"{'=' * 100}\n")

# Step 6: Categorize missing results
print("Step 6: Categorizing missing results...\n")

athlete_exists = []
athlete_not_found = []

for item in missing:
    # Check if athlete exists (case-insensitive)
    athlete_check = supabase.table('athletes')\
        .select('id, name, slug, grad_year, school_id')\
        .ilike('name', item['athlete_name'])\
        .execute()

    if athlete_check.data and len(athlete_check.data) > 0:
        # Athlete exists
        athlete_exists.append({
            **item,
            'athlete_id': athlete_check.data[0]['id'],
            'db_name': athlete_check.data[0]['name']
        })
    else:
        # Athlete not found
        athlete_not_found.append(item)

print(f"Category 1 - Athlete exists (just add result): {len(athlete_exists)}")
print(f"Category 2 - Athlete not found (need to create): {len(athlete_not_found)}")

# Step 7: Save analysis to JSON
analysis = {
    'meet_id': MEET_ID,
    'summary': {
        'csv_total': len(csv_results),
        'db_total': len(db_results),
        'missing_total': len(missing),
        'athlete_exists': len(athlete_exists),
        'athlete_not_found': len(athlete_not_found)
    },
    'categories': {
        'athlete_exists': athlete_exists,
        'athlete_not_found': athlete_not_found
    }
}

output_file = f'analysis_meet_{MEET_ID[:8]}.json'
with open(output_file, 'w') as f:
    json.dump(analysis, f, indent=2)

print(f"\n✓ Analysis saved to {output_file}")

# Step 8: Print summary
print("\n" + "=" * 100)
print("DETAILED BREAKDOWN")
print("=" * 100)

if athlete_exists:
    print(f"\n✓ CATEGORY 1: Athletes that exist ({len(athlete_exists)} results)")
    print("  These athletes are in the database - just add their results\n")
    for item in athlete_exists[:10]:  # Show first 10
        race_info = race_map.get(item['race_id'])
        race_name = race_info['name'] if race_info else 'Unknown'
        print(f"  - {item['athlete_name']:40s} | {item['time_cs']:6d} cs | {race_name}")
    if len(athlete_exists) > 10:
        print(f"  ... and {len(athlete_exists) - 10} more")

if athlete_not_found:
    print(f"\n⚠ CATEGORY 2: Athletes not found ({len(athlete_not_found)} results)")
    print("  These athletes need to be created or matched\n")
    for item in athlete_not_found[:10]:  # Show first 10
        race_info = race_map.get(item['race_id'])
        race_name = race_info['name'] if race_info else 'Unknown'
        print(f"  - {item['athlete_name']:40s} | {item['time_cs']:6d} cs | {race_name}")
    if len(athlete_not_found) > 10:
        print(f"  ... and {len(athlete_not_found) - 10} more")

print("\n" + "=" * 100)
print("NEXT STEPS")
print("=" * 100)
print(f"""
1. Review the analysis file: {output_file}
2. For Category 1 (athlete_exists): Run import_missing_results.py
3. For Category 2 (athlete_not_found): Run import_missing_athletes.py first, then add results
4. After all imports: Update cached result count and rebuild derived tables
""")
```

---

## Identifying Missing Results

### Key Principle: Triple-Key Comparison

**Always compare using all three fields:**

```python
key = (athlete_name, race_id, time_cs)
```

**Why this matters:**

❌ **WRONG** - Comparing by (race_id, time_cs) only:
```python
# This will MISS results when multiple athletes have the same time
key = (race_id, time_cs)  # BAD!
```

**Problem**: Cross country has many tied times. In meet 254378:
- 86 different (race_id, time_cs) pairs had 2+ athletes
- Using only these two fields made it appear 0 results were missing
- In reality, 1 result was still missing (Justin Casalins-DeBoskey)

✅ **CORRECT** - Comparing by (athlete_name, race_id, time_cs):
```python
# This correctly identifies all missing results
key = (athlete_name, race_id, time_cs)  # GOOD!
```

### Common Patterns in Missing Results

#### 1. Name Capitalization Variations

**Expected behavior** - NOT duplicates:
- CSV: `DANIEL SANTANA` vs DB: `Daniel Santana`
- CSV: `Christian DePrat` vs DB: `Christian Deprat`
- CSV: `Maggie De la Rionda` vs DB: `Maggie De La Rionda`

**Why**: Athletic.net capitalizes names differently. The database standardizes capitalization during athlete creation.

**Rate**: ~0.5% of results (23 out of 4,655 in meet 254378)

**Action**: No action needed - these are the same athlete

#### 2. Middle Name Variations

**Pattern**: CSV may omit or include middle names
- CSV: `Mario Fernandez DuFur` vs DB: `Mario Nico Fernandez Dufur`

**Solution**: Use fuzzy matching with `ILIKE`:
```python
supabase.table('athletes')\
    .select('id, name')\
    .ilike('name', '%mario%fernandez%')\
    .execute()
```

#### 3. Special Characters in Names

**Common cases**:
- Apostrophes: `O'Brien`, `D'Ambrosia`
- Hyphens: `Casalins-DeBoskey`, `DeLuca-Encinas`
- Accents: `José`, `María`

**Impact**: These often cause slug collisions

---

## Handling Missing Athletes

### When Athletes Don't Exist

If analysis shows athletes in Category 2 (not found), you need to create them first.

### Script Template: Import Missing Athletes

```python
#!/usr/bin/env python3
"""
Import missing athletes with slug collision handling.
"""

import os
import csv
import json
import time
import re
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='../../website/.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

MEET_ID = '<MEET_UUID>'
CSV_PATH = 'to-be-processed/meet_<ATHLETIC_NET_ID>_<TIMESTAMP>'

# Load missing athletes from analysis
with open('analysis_meet_<MEET_ID_SHORT>.json', 'r') as f:
    analysis = json.load(f)

missing_athletes = analysis['categories']['athlete_not_found']

print(f"Importing {len(missing_athletes)} missing athletes...\n")

# Load athletes CSV
athletes_data = {}
with open(f'{CSV_PATH}/athletes.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        athletes_data[row['name']] = row

# Load schools mapping
schools_mapping = {}
with open(f'{CSV_PATH}/schools.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        school_check = supabase.table('schools')\
            .select('id')\
            .eq('athletic_net_id', row['athletic_net_id'])\
            .execute()

        if school_check.data:
            schools_mapping[row['athletic_net_id']] = school_check.data[0]['id']

imported = []
failed = []

for item in missing_athletes:
    athlete_name = item['athlete_name']
    print(f"Processing: {athlete_name}")

    # Get athlete data from CSV
    csv_athlete = athletes_data.get(athlete_name)
    if not csv_athlete:
        print(f"  ERROR: Not found in athletes.csv")
        failed.append({'name': athlete_name, 'reason': 'Not in CSV'})
        continue

    # Get school UUID
    school_uuid = schools_mapping.get(csv_athlete['school_athletic_net_id'])
    if not school_uuid:
        print(f"  ERROR: School not found")
        failed.append({'name': athlete_name, 'reason': 'School not found'})
        continue

    # Prepare athlete data
    athlete_data = {
        'name': csv_athlete['name'],
        'first_name': csv_athlete['first_name'],
        'last_name': csv_athlete['last_name'],
        'grad_year': int(csv_athlete['grad_year']),
        'gender': csv_athlete['gender'],
        'school_id': school_uuid,
        'athletic_net_id': csv_athlete.get('athletic_net_id')
    }

    # Try to create athlete
    try:
        result = supabase.table('athletes').insert(athlete_data).execute()
        athlete_id = result.data[0]['id']
        print(f"  ✓ Created: {athlete_id}")
        imported.append({'name': athlete_name, 'id': athlete_id})

    except Exception as e:
        error_msg = str(e)

        # Handle slug collision
        if 'duplicate key' in error_msg and 'slug' in error_msg:
            print(f"  ! Slug collision - checking for similar athletes...")

            # Find similar athlete
            similar = supabase.table('athletes')\
                .select('id, name, slug, school_id')\
                .eq('school_id', school_uuid)\
                .eq('grad_year', int(csv_athlete['grad_year']))\
                .eq('gender', csv_athlete['gender'])\
                .execute()

            if similar.data:
                athlete_id = similar.data[0]['id']
                print(f"  → Using existing: {similar.data[0]['name']} ({athlete_id})")
                imported.append({
                    'name': athlete_name,
                    'id': athlete_id,
                    'matched_to': similar.data[0]['name']
                })

                # Flag as potential duplicate
                try:
                    supabase.table('potential_duplicate_athletes').insert({
                        'athlete_id_1': athlete_id,
                        'school_id': school_uuid,
                        'meet_id': MEET_ID,
                        'name_2': athlete_name,
                        'conflict_type': 'slug_collision',
                        'grad_year_2': int(csv_athlete['grad_year']),
                        'gender_2': csv_athlete['gender'],
                        'csv_data': json.dumps(csv_athlete),
                        'status': 'pending'
                    }).execute()
                    print(f"  ✓ Flagged in potential_duplicate_athletes")
                except:
                    pass
            else:
                # Force creation with modified slug
                athlete_data['slug'] = f"{re.sub(r'[^a-z0-9-]', '', csv_athlete['name'].lower().replace(' ', '-'))}-{int(time.time()) % 10000}"

                try:
                    result = supabase.table('athletes').insert(athlete_data).execute()
                    athlete_id = result.data[0]['id']
                    print(f"  ✓ Force created with custom slug: {athlete_id}")
                    imported.append({'name': athlete_name, 'id': athlete_id})
                except Exception as e2:
                    print(f"  ERROR: {e2}")
                    failed.append({'name': athlete_name, 'reason': str(e2)})
        else:
            print(f"  ERROR: {error_msg}")
            failed.append({'name': athlete_name, 'reason': error_msg})

print(f"\n{'=' * 100}")
print(f"Successfully imported: {len(imported)}")
print(f"Failed: {len(failed)}")
print(f"{'=' * 100}")
```

### Strategy for Slug Collisions

**Order of operations:**

1. **Try direct insert** - Let database generate slug
2. **If slug collision** - Check for similar athlete (same school, grad year, gender)
3. **If similar found** - Use existing athlete, flag as potential duplicate
4. **If no similar** - Force creation with custom slug (append timestamp)

---

## Common Issues & Solutions

### Issue 1: Database Count Shows X, Comparison Shows Y Missing

**Symptom**: Database says 4654/4655 (1 missing), but comparison finds 24 missing

**Cause**: You have extra results in the database that aren't in CSV, PLUS actual missing results

**Solution**: Run reverse comparison to find extras:

```python
# Find results in DB but NOT in CSV
extra = []
for result in db_results:
    race_info = race_map_reverse.get(result['race_id'])
    if race_info and result['athletes']:
        key = (result['athletes']['name'], race_info['athletic_net_race_id'], result['time_cs'])
        if key not in csv_set:
            extra.append(result)

print(f"Extra results in DB: {len(extra)}")
print(f"Missing from CSV: {len(missing)}")
print(f"Net difference: {len(missing) - len(extra)}")
```

**In meet 254378**: 24 missing - 23 extras (name capitalization) = 1 truly missing

### Issue 2: Athlete Name Exists But Results Won't Import

**Symptom**: Athlete found in database, but inserting result fails with duplicate key error

**Cause**: Result already exists with that exact (athlete_id, meet_id, race_id, time_cs, data_source)

**Solution**: Check if result already exists before inserting:

```python
# Check for existing result
existing = supabase.table('results')\
    .select('id')\
    .eq('athlete_id', athlete_id)\
    .eq('meet_id', meet_id)\
    .eq('race_id', race_id)\
    .eq('time_cs', time_cs)\
    .eq('data_source', 'athletic_net')\
    .execute()

if existing.data:
    print(f"Result already exists: {existing.data[0]['id']}")
else:
    # Safe to insert
    result = supabase.table('results').insert({...}).execute()
```

### Issue 3: Memory Issues with 10K+ Results

**Symptom**: Python script crashes or becomes very slow with large datasets

**Solution**: Use generators and process in chunks:

```python
def load_db_results_chunked(meet_id, batch_size=1000):
    """Generator that yields results in chunks"""
    offset = 0
    while True:
        batch = supabase.table('results')\
            .select('id, athlete_id, race_id, time_cs, athletes(name)')\
            .eq('meet_id', meet_id)\
            .range(offset, offset + batch_size - 1)\
            .execute()

        if not batch.data:
            break

        yield batch.data

        offset += batch_size
        if len(batch.data) < batch_size:
            break

# Use it
for batch in load_db_results_chunked(MEET_ID):
    for result in batch:
        # Process each result
        pass
```

---

## Performance Optimization

### Database Performance

**1. Disable Triggers During Bulk Import**

```sql
ALTER TABLE results DISABLE TRIGGER USER;
-- Run import
ALTER TABLE results ENABLE TRIGGER USER;
```

**Impact**: 5-10x faster inserts

**2. Use Batch Inserts**

```python
# Instead of:
for result in results:
    supabase.table('results').insert(result).execute()  # SLOW

# Do this:
batch = []
for result in results:
    batch.append(result)
    if len(batch) >= 100:
        supabase.table('results').insert(batch).execute()
        batch = []

if batch:  # Don't forget remaining
    supabase.table('results').insert(batch).execute()
```

**Impact**: 10-50x faster

**3. Limit SELECT Fields**

```python
# Instead of:
results = supabase.table('results').select('*').execute()  # SLOW

# Do this:
results = supabase.table('results')\
    .select('id, time_cs, race_id')\  # Only what you need
    .execute()
```

**Impact**: 2-5x faster, less memory

### Script Performance

**1. Use Sets for Lookups**

```python
# Build set once
db_set = {(r['athlete_name'], r['race_id'], r['time_cs']) for r in db_results}

# Fast lookups
for csv_result in csv_results:
    key = (csv_result['athlete_name'], csv_result['race_id'], csv_result['time_cs'])
    if key not in db_set:  # O(1) lookup
        missing.append(csv_result)
```

**2. Pre-load Mappings**

```python
# Load once at start
race_map = {r['athletic_net_race_id']: r for r in races.data}

# Fast lookups in loop
for result in results:
    race = race_map.get(result['race_id'])  # O(1)
```

---

## Scaling to 10K+ Results

### Estimated Processing Times

Based on meet 254378 (4,655 results):

| Meet Size | Initial Import | Analysis | Missing Data | Total |
|-----------|---------------|----------|--------------|-------|
| 1K        | 5-10 min      | 1 min    | 10-20 min    | 15-30 min |
| 3K        | 15-30 min     | 2-3 min  | 20-40 min    | 35-75 min |
| 5K        | 25-45 min     | 3-5 min  | 30-60 min    | 1-2 hours |
| 10K       | 45-90 min     | 5-10 min | 1-2 hours    | 2-3.5 hours |

### Special Considerations for 10K+ Meets

#### 1. Split CSV Files

```python
#!/usr/bin/env python3
"""Split large results.csv into smaller chunks"""

import csv

CHUNK_SIZE = 2000
input_file = 'results.csv'
output_prefix = 'results_chunk_'

with open(input_file, 'r') as f:
    reader = csv.DictReader(f)
    headers = reader.fieldnames

    chunk_num = 0
    chunk_results = []

    for row in reader:
        chunk_results.append(row)

        if len(chunk_results) >= CHUNK_SIZE:
            # Write chunk
            with open(f'{output_prefix}{chunk_num:03d}.csv', 'w') as out:
                writer = csv.DictWriter(out, fieldnames=headers)
                writer.writeheader()
                writer.writerows(chunk_results)

            print(f"Wrote chunk {chunk_num} ({len(chunk_results)} results)")
            chunk_num += 1
            chunk_results = []

    # Write remaining
    if chunk_results:
        with open(f'{output_prefix}{chunk_num:03d}.csv', 'w') as out:
            writer = csv.DictWriter(out, fieldnames=headers)
            writer.writeheader()
            writer.writerows(chunk_results)
        print(f"Wrote chunk {chunk_num} ({len(chunk_results)} results)")
```

#### 2. Process Chunks in Parallel

```python
import multiprocessing
from functools import partial

def process_chunk(chunk_file, meet_id):
    """Process a single chunk file"""
    # Import logic here
    pass

if __name__ == '__main__':
    chunk_files = ['results_chunk_000.csv', 'results_chunk_001.csv', ...]

    with multiprocessing.Pool(processes=4) as pool:
        pool.map(partial(process_chunk, meet_id=MEET_ID), chunk_files)
```

#### 3. Use Database-Side Comparison

For very large meets, use SQL instead of Python:

```sql
-- Create temporary table with CSV data
CREATE TEMP TABLE csv_results (
    athlete_name TEXT,
    race_id TEXT,
    time_cs INTEGER
);

-- Load CSV data (via COPY or bulk insert)
-- ... bulk insert logic ...

-- Find missing results using SQL
SELECT
    c.athlete_name,
    c.race_id,
    c.time_cs
FROM csv_results c
LEFT JOIN results r ON (
    r.meet_id = '<MEET_UUID>' AND
    a.name = c.athlete_name AND
    rac.athletic_net_race_id = c.race_id AND
    r.time_cs = c.time_cs
)
JOIN athletes a ON r.athlete_id = a.id
JOIN races rac ON r.race_id = rac.id
WHERE r.id IS NULL;
```

**Benefit**: Database is optimized for set operations

#### 4. Monitor Memory Usage

```python
import psutil
import os

def print_memory_usage():
    process = psutil.Process(os.getpid())
    mem = process.memory_info().rss / 1024 / 1024  # MB
    print(f"Memory usage: {mem:.2f} MB")

# Call periodically
print_memory_usage()
```

### Expected Data Volumes

| Meet Size | CSV Size | DB Results | Analysis JSON | Peak Memory |
|-----------|----------|------------|---------------|-------------|
| 1K        | ~200 KB  | ~1K rows   | ~5 KB         | ~50 MB      |
| 5K        | ~1 MB    | ~5K rows   | ~25 KB        | ~200 MB     |
| 10K       | ~2 MB    | ~10K rows  | ~50 KB        | ~400 MB     |
| 20K       | ~4 MB    | ~20K rows  | ~100 KB       | ~800 MB     |

---

## Post-Import Checklist

After completing import and resolving all missing results:

### 1. Re-enable Triggers

```sql
ALTER TABLE results ENABLE TRIGGER USER;
```

### 2. Update Cached Result Count

```python
supabase.table('meets').update({
    'result_count': <ACTUAL_COUNT>
}).eq('id', MEET_ID).execute()
```

Or via SQL:
```sql
UPDATE meets
SET result_count = (
    SELECT COUNT(*) FROM results WHERE meet_id = '<MEET_UUID>'
)
WHERE id = '<MEET_UUID>';
```

### 3. Rebuild Derived Tables

```sql
-- Batch rebuild all derived tables
SELECT batch_rebuild_athlete_best_times();
SELECT batch_rebuild_course_records();
SELECT batch_rebuild_school_hall_of_fame();
SELECT batch_rebuild_school_course_records();
```

### 4. Move Files to Processed

```bash
TIMESTAMP=$(date +%s)
mkdir -p processed/$TIMESTAMP
mv to-be-processed/meet_<ATHLETIC_NET_ID>_<TIMESTAMP> processed/$TIMESTAMP/
```

### 5. Review Flagged Duplicates

Check tables:
- `potential_duplicate_athletes` - Athletes with ambiguous matches
- `potential_duplicates` - Results with conflicting data

### 6. Verify Final Count

```python
result_count = supabase.table('results')\
    .select('id', count='exact')\
    .eq('meet_id', MEET_ID)\
    .execute()

meet = supabase.table('meets')\
    .select('name, result_count')\
    .eq('id', MEET_ID)\
    .execute()

print(f"Meet: {meet.data[0]['name']}")
print(f"Database count: {result_count.count}")
print(f"Cached count: {meet.data[0]['result_count']}")
print(f"Match: {'✓' if result_count.count == meet.data[0]['result_count'] else '✗'}")
```

---

## Troubleshooting

### Common Error Messages

#### "duplicate key value violates unique constraint"

**Constraint**: `results_athlete_id_meet_id_race_id_time_cs_data_source_key`

**Cause**: Trying to insert a result that already exists

**Solution**: Check if result exists before inserting (see Issue 2 above)

#### "invalid input syntax for type uuid"

**Cause**: Trying to use a text field (like "school_st._margaret's") as UUID

**Solution**: Look up the UUID first:
```python
school = supabase.table('schools')\
    .select('id')\
    .eq('athletic_net_id', school_athletic_net_id)\
    .execute()

school_uuid = school.data[0]['id']
```

#### "column 'athletic_net_school_id' does not exist"

**Cause**: CSV column name mismatch

**Solution**: Check actual column name:
```python
with open('athletes.csv', 'r') as f:
    reader = csv.DictReader(f)
    print(reader.fieldnames)  # See actual column names
```

### Getting Help

If you encounter issues not covered here:

1. Check the error message carefully
2. Search for the error in previous import logs
3. Check if similar meet had the same issue
4. Document the issue and solution for future reference

---

## Appendix: Quick Reference

### Essential Scripts

1. **analyze_missing_results.py** - Find missing results
2. **import_missing_athletes.py** - Create missing athletes
3. **import_missing_results.py** - Add missing results
4. **verify_import_complete.py** - Final verification

### Key SQL Queries

```sql
-- Check meet result count
SELECT
    m.name,
    m.result_count as cached_count,
    COUNT(r.id) as actual_count,
    m.result_count - COUNT(r.id) as difference
FROM meets m
LEFT JOIN results r ON r.meet_id = m.id
WHERE m.id = '<MEET_UUID>'
GROUP BY m.id, m.name, m.result_count;

-- Find athletes with multiple results in same race (potential duplicates)
SELECT
    a.name,
    r.race_id,
    COUNT(*) as result_count
FROM results r
JOIN athletes a ON r.athlete_id = a.id
WHERE r.meet_id = '<MEET_UUID>'
GROUP BY a.name, r.race_id
HAVING COUNT(*) > 1;

-- Check for orphaned best times
SELECT COUNT(*) FROM athlete_best_times abt
WHERE NOT EXISTS (
    SELECT 1 FROM results r WHERE r.id = abt.result_id
);
```

### Performance Targets

- **Import rate**: 50-100 results/second (with triggers disabled)
- **Analysis time**: <1 minute per 1000 results
- **Memory usage**: <500 MB for meets up to 10K results

---

## Document History

- **2025-10-30**: Initial version based on meet 254378 import
- **Future**: Update as new patterns emerge from larger meets

---

## Related Documentation

- `MEET_254378_COMPLETE.md` - Detailed case study
- `BULK_IMPORT_WORKFLOW.md` - Standard import procedures
- `BATCH_SYSTEM_SUMMARY.md` - Database trigger management
