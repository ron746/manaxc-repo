# Guide: Identifying Meets with Missing Results or Athletes

**Purpose**: Quick reference for scanning all imported meets to find those with missing or incomplete data.

**Last Updated**: 2025-10-30

---

## Table of Contents

1. [Quick Checks](#quick-checks)
2. [Automated Scanning](#automated-scanning)
3. [Red Flags](#red-flags)
4. [Diagnostic Scripts](#diagnostic-scripts)

---

## Quick Checks

### 1. Check Result Count Mismatches

Run this to find meets where cached count doesn't match actual count:

```sql
-- In Supabase SQL editor
SELECT
    m.athletic_net_id,
    m.name,
    m.result_count as cached_count,
    COUNT(r.id) as actual_count,
    m.result_count - COUNT(r.id) as difference,
    CASE
        WHEN m.result_count IS NULL THEN 'No cached count'
        WHEN m.result_count = COUNT(r.id) THEN '✓ Match'
        WHEN m.result_count > COUNT(r.id) THEN '⚠ Missing results'
        ELSE '❓ Extra results'
    END as status
FROM meets m
LEFT JOIN results r ON r.meet_id = m.id
WHERE m.result_count IS NOT NULL
GROUP BY m.id, m.name, m.athletic_net_id, m.result_count
HAVING m.result_count != COUNT(r.id)
ORDER BY ABS(m.result_count - COUNT(r.id)) DESC;
```

**Interpretation**:
- `difference > 0`: Results missing from database
- `difference < 0`: Extra results in database (shouldn't happen)
- `difference = 0` but `status = 'No cached count'`: Need to set cached count

### 2. Find Recently Imported Meets

```sql
SELECT
    m.athletic_net_id,
    m.name,
    m.date,
    m.result_count,
    COUNT(r.id) as actual_count,
    m.created_at
FROM meets m
LEFT JOIN results r ON r.meet_id = m.id
WHERE m.created_at > NOW() - INTERVAL '7 days'
GROUP BY m.id
ORDER BY m.created_at DESC;
```

### 3. Check for Meets with Zero Results

```sql
SELECT
    m.athletic_net_id,
    m.name,
    m.date,
    m.result_count
FROM meets m
WHERE NOT EXISTS (
    SELECT 1 FROM results r WHERE r.meet_id = m.id
)
AND m.result_count IS NOT NULL
AND m.result_count > 0
ORDER BY m.date DESC
LIMIT 20;
```

**Red flag**: Meet has cached result_count but zero actual results

---

## Automated Scanning

### Full System Scan Script

Create `scan_all_meets.py`:

```python
#!/usr/bin/env python3
"""
Scan all imported meets for missing results or data quality issues.
Generates a report of meets that need attention.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv(dotenv_path='../../website/.env.local')

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

print("=" * 100)
print("SCANNING ALL MEETS FOR MISSING DATA")
print("=" * 100)

# Get all meets with cached result counts
print("\nStep 1: Loading all meets...")
meets = supabase.table('meets')\
    .select('id, athletic_net_id, name, date, result_count')\
    .not_.is_('result_count', 'null')\
    .order('date', desc=True)\
    .execute()

print(f"  Found {len(meets.data)} meets with result counts")

# Check each meet's actual count
print("\nStep 2: Checking actual result counts...")

issues = {
    'missing_results': [],
    'extra_results': [],
    'zero_results': [],
    'orphaned_best_times': [],
    'large_meets_incomplete': []
}

for meet in meets.data:
    # Get actual count
    actual = supabase.table('results')\
        .select('id', count='exact')\
        .eq('meet_id', meet['id'])\
        .execute()

    cached = meet['result_count'] or 0
    actual_count = actual.count

    difference = cached - actual_count

    # Categorize issues
    if difference > 0:
        issues['missing_results'].append({
            'meet': meet,
            'cached': cached,
            'actual': actual_count,
            'missing': difference,
            'severity': 'HIGH' if difference > 100 else 'MEDIUM' if difference > 10 else 'LOW'
        })

    elif difference < 0:
        issues['extra_results'].append({
            'meet': meet,
            'cached': cached,
            'actual': actual_count,
            'extra': abs(difference)
        })

    elif actual_count == 0 and cached > 0:
        issues['zero_results'].append({
            'meet': meet,
            'cached': cached
        })

    # Check if it's a large meet that's incomplete
    if cached >= 2000 and difference > 0:
        issues['large_meets_incomplete'].append({
            'meet': meet,
            'cached': cached,
            'actual': actual_count,
            'missing': difference
        })

print("\n" + "=" * 100)
print("SCAN RESULTS")
print("=" * 100)

# Report missing results
if issues['missing_results']:
    print(f"\n⚠ MISSING RESULTS: {len(issues['missing_results'])} meets")
    print("-" * 100)

    # Group by severity
    by_severity = defaultdict(list)
    for issue in issues['missing_results']:
        by_severity[issue['severity']].append(issue)

    for severity in ['HIGH', 'MEDIUM', 'LOW']:
        if by_severity[severity]:
            print(f"\n  {severity} PRIORITY ({len(by_severity[severity])} meets):")
            for issue in sorted(by_severity[severity], key=lambda x: x['missing'], reverse=True)[:10]:
                meet = issue['meet']
                print(f"    {meet['athletic_net_id']:8s} | {meet['name']:50s} | Missing: {issue['missing']:4d}/{issue['cached']:4d}")

            if len(by_severity[severity]) > 10:
                print(f"    ... and {len(by_severity[severity]) - 10} more")

# Report extra results
if issues['extra_results']:
    print(f"\n❓ EXTRA RESULTS: {len(issues['extra_results'])} meets")
    print("-" * 100)
    for issue in issues['extra_results'][:10]:
        meet = issue['meet']
        print(f"  {meet['athletic_net_id']:8s} | {meet['name']:50s} | Extra: {issue['extra']:4d}")

    if len(issues['extra_results']) > 10:
        print(f"  ... and {len(issues['extra_results']) - 10} more")

# Report zero results
if issues['zero_results']:
    print(f"\n✗ ZERO RESULTS: {len(issues['zero_results'])} meets")
    print("-" * 100)
    for issue in issues['zero_results'][:10]:
        meet = issue['meet']
        print(f"  {meet['athletic_net_id']:8s} | {meet['name']:50s} | Expected: {issue['cached']}")

    if len(issues['zero_results']) > 10:
        print(f"  ... and {len(issues['zero_results']) - 10} more")

# Highlight large incomplete meets
if issues['large_meets_incomplete']:
    print(f"\n🔴 LARGE INCOMPLETE MEETS: {len(issues['large_meets_incomplete'])} meets")
    print("-" * 100)
    print("  These are high-priority - large meets with significant missing data\n")
    for issue in sorted(issues['large_meets_incomplete'], key=lambda x: x['missing'], reverse=True):
        meet = issue['meet']
        pct_missing = (issue['missing'] / issue['cached']) * 100
        print(f"  {meet['athletic_net_id']:8s} | {meet['name']:50s} | Missing: {issue['missing']:4d}/{issue['cached']:4d} ({pct_missing:.1f}%)")

# Check for orphaned best times
print("\n\nStep 3: Checking for orphaned best times...")
orphaned = supabase.rpc('check_orphaned_best_times').execute()
if orphaned.data and orphaned.data[0]['orphaned_count'] > 0:
    print(f"  ⚠ Found {orphaned.data[0]['orphaned_count']} orphaned best times")
    issues['orphaned_best_times'] = orphaned.data[0]['orphaned_count']
else:
    print("  ✓ No orphaned best times")

# Summary
print("\n" + "=" * 100)
print("SUMMARY")
print("=" * 100)

total_issues = sum([
    len(issues['missing_results']),
    len(issues['extra_results']),
    len(issues['zero_results'])
])

print(f"""
Total meets scanned: {len(meets.data)}
Total with issues: {total_issues}

Breakdown:
  - Missing results: {len(issues['missing_results'])}
  - Extra results: {len(issues['extra_results'])}
  - Zero results: {len(issues['zero_results'])}
  - Large incomplete: {len(issues['large_meets_incomplete'])}
  - Orphaned best times: {issues['orphaned_best_times']}
""")

# Action items
print("=" * 100)
print("RECOMMENDED ACTIONS")
print("=" * 100)

if issues['large_meets_incomplete']:
    print("\n1. PRIORITY: Fix large incomplete meets")
    for issue in issues['large_meets_incomplete'][:5]:
        meet = issue['meet']
        print(f"   → Run analysis on meet {meet['athletic_net_id']} ({meet['name']})")

if len(issues['missing_results']) > 0:
    print(f"\n2. Review {len(issues['missing_results'])} meets with missing results")
    print("   → Run detailed analysis on HIGH priority meets first")

if issues['zero_results']:
    print(f"\n3. Investigate {len(issues['zero_results'])} meets with zero results")
    print("   → These may need complete re-import")

if issues['orphaned_best_times']:
    print(f"\n4. Clean up {issues['orphaned_best_times']} orphaned best times")
    print("   → Run: DELETE FROM athlete_best_times WHERE id IN (...)")

print("\n" + "=" * 100)
```

### Run the Scan

```bash
cd /path/to/importers
source venv/bin/activate
python scan_all_meets.py
```

---

## Red Flags

### Critical Issues (Fix Immediately)

1. **Large meet with >10% missing**
   - Example: 4,000 expected, 3,500 actual (12.5% missing)
   - Action: Run comprehensive analysis and complete import

2. **Meet with zero results but positive cached count**
   - Example: result_count = 250, actual = 0
   - Action: Check if meet was accidentally deleted, re-import if needed

3. **Recent import (last 7 days) with missing results**
   - Action: Likely caught during ongoing import - finish the process

### Medium Issues (Fix Soon)

1. **Meet with 1-50 missing results**
   - Action: Run analysis to identify missing, add them manually

2. **Orphaned best times**
   - Action: Clean up orphaned records

### Low Issues (Fix Eventually)

1. **Meet with 1-5 missing results**
   - May be legitimate (DNS, DQ, etc.)
   - Action: Verify with source data

---

## Diagnostic Scripts

### Script 1: Quick Meet Status Check

```python
#!/usr/bin/env python3
"""Quick status check for a specific meet"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='../../website/.env.local')
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

ATHLETIC_NET_ID = input("Enter Athletic.net meet ID: ")

# Find meet
meet = supabase.table('meets')\
    .select('*')\
    .eq('athletic_net_id', ATHLETIC_NET_ID)\
    .execute()

if not meet.data:
    print(f"Meet {ATHLETIC_NET_ID} not found")
    exit(1)

meet = meet.data[0]
meet_id = meet['id']

print("=" * 80)
print(f"MEET STATUS: {meet['name']}")
print("=" * 80)

# Get counts
results = supabase.table('results').select('id', count='exact').eq('meet_id', meet_id).execute()
races = supabase.table('races').select('id', count='exact').eq('meet_id', meet_id).execute()

cached = meet['result_count'] or 0
actual = results.count

print(f"\nMeet ID (UUID): {meet_id}")
print(f"Athletic.net ID: {meet['athletic_net_id']}")
print(f"Date: {meet['date']}")
print(f"\nRaces: {races.count}")
print(f"\nResults:")
print(f"  Cached:  {cached}")
print(f"  Actual:  {actual}")
print(f"  Missing: {cached - actual}")

if cached == actual:
    print(f"\n✓ COMPLETE - No missing results")
elif cached > actual:
    print(f"\n⚠ INCOMPLETE - {cached - actual} results missing ({((cached-actual)/cached*100):.1f}%)")
else:
    print(f"\n❓ Extra results - Database has {actual - cached} more than expected")

# Check for CSV files
import os
csv_dirs = [d for d in os.listdir('to-be-processed') if d.startswith(f'meet_{ATHLETIC_NET_ID}_')]
if csv_dirs:
    print(f"\n📁 CSV files found in to-be-processed: {csv_dirs[0]}")
else:
    csv_dirs = [d for d in os.listdir('processed') if f'meet_{ATHLETIC_NET_ID}_' in str(d)]
    if csv_dirs:
        print(f"\n📁 CSV files found in processed: {csv_dirs[0]}")
    else:
        print(f"\n⚠ No CSV files found")

print("\n" + "=" * 80)
```

### Script 2: Find Athletes in CSV But Not in Database

```python
#!/usr/bin/env python3
"""
Check which athletes from CSV are not in the database.
This helps identify missing athletes that need to be created.
"""

import os
import csv
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='../../website/.env.local')
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

CSV_PATH = input("Enter path to meet directory (e.g., to-be-processed/meet_254378_1234567890): ")

print("Loading athletes from CSV...")
csv_athletes = set()
with open(f'{CSV_PATH}/athletes.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        csv_athletes.add(row['name'])

print(f"CSV has {len(csv_athletes)} unique athletes")

print("\nChecking which athletes exist in database...")
missing_athletes = []
found_athletes = []

for athlete_name in csv_athletes:
    # Check if athlete exists (case-insensitive)
    check = supabase.table('athletes')\
        .select('id, name')\
        .ilike('name', athlete_name)\
        .execute()

    if check.data and len(check.data) > 0:
        found_athletes.append({
            'csv_name': athlete_name,
            'db_name': check.data[0]['name'],
            'db_id': check.data[0]['id']
        })
    else:
        missing_athletes.append(athlete_name)

print(f"\n{'=' * 80}")
print(f"RESULTS")
print(f"{'=' * 80}")
print(f"Found in DB: {len(found_athletes)}")
print(f"Missing from DB: {len(missing_athletes)}")

if missing_athletes:
    print(f"\n⚠ MISSING ATHLETES ({len(missing_athletes)}):")
    for name in sorted(missing_athletes)[:20]:
        print(f"  - {name}")

    if len(missing_athletes) > 20:
        print(f"  ... and {len(missing_athletes) - 20} more")

    print("\n💡 TIP: Run import_missing_athletes.py to create these athletes")
```

### Script 3: Compare CSV to Database (Quick Version)

```python
#!/usr/bin/env python3
"""Quick comparison of CSV vs database for a meet"""

import os
import csv
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='../../website/.env.local')
url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

MEET_ID = input("Enter meet UUID: ")
CSV_PATH = input("Enter CSV directory path: ")

print("Loading CSV results...")
csv_count = 0
with open(f'{CSV_PATH}/results.csv', 'r') as f:
    csv_count = sum(1 for _ in csv.DictReader(f))

print("Loading database results...")
db_count = supabase.table('results')\
    .select('id', count='exact')\
    .eq('meet_id', MEET_ID)\
    .execute()

print(f"\n{'=' * 80}")
print(f"CSV:      {csv_count} results")
print(f"Database: {db_count.count} results")
print(f"Missing:  {csv_count - db_count.count} results")
print(f"{'=' * 80}")

if csv_count == db_count.count:
    print("\n✓ COMPLETE - All results imported")
else:
    print(f"\n⚠ Run comprehensive analysis to identify missing results")
    print(f"   Use: python analyze_missing_<MEET_ID>.py")
```

---

## Common Patterns

### Pattern 1: Meets Missing 1-5% of Results

**Characteristics**:
- Large meets (2,000+ results)
- Missing 20-100 results
- Usually due to athlete name mismatches

**Solution**:
1. Run comprehensive analysis
2. Most will be in "athlete exists" category
3. Add missing results manually

**Time**: 30-60 minutes

### Pattern 2: Meets Missing 10%+ of Results

**Characteristics**:
- Import was interrupted or had errors
- Many athletes not found

**Solution**:
1. Check import logs for errors
2. May need to re-run initial import
3. Or run comprehensive analysis and manual cleanup

**Time**: 1-3 hours

### Pattern 3: Meet with Zero Results

**Characteristics**:
- Cached count > 0, actual count = 0
- Usually from database reset or accidental deletion

**Solution**:
1. Re-run scraper for that meet
2. Re-import all data

**Time**: 20-45 minutes

---

## Automation Opportunities

### Scheduled Scan

Run the scan script daily/weekly via cron:

```bash
# Add to crontab
0 2 * * * cd /path/to/importers && source venv/bin/activate && python scan_all_meets.py > logs/scan_$(date +\%Y\%m\%d).log 2>&1
```

### Alert on Critical Issues

Modify scan script to send alerts:

```python
# At end of scan_all_meets.py

if len(issues['large_meets_incomplete']) > 0:
    # Send email/Slack notification
    send_alert(f"⚠ {len(issues['large_meets_incomplete'])} large meets have missing data")
```

### Auto-Repair Low-Severity Issues

For meets with 1-5 missing results, could automate:

```python
# Auto-fix meets with <5 missing results
if 0 < difference < 5:
    # Run analysis
    # If all athletes exist, auto-add results
    # Log action for review
```

---

## Best Practices

1. **Scan after every bulk import session** - Catch issues early
2. **Fix large meets first** - Biggest impact
3. **Document unusual cases** - Build knowledge base
4. **Keep CSV files** - Until meet is verified complete
5. **Update cached counts** - After fixing missing results

---

## Related Documentation

- `LARGE_MEET_IMPORT_GUIDE.md` - Detailed import procedures
- `MEET_254378_COMPLETE.md` - Case study example
- `BULK_IMPORT_WORKFLOW.md` - Standard workflow

---

## Quick Command Reference

```bash
# Scan all meets for issues
python scan_all_meets.py

# Check specific meet status
python check_meet_status.py

# Find missing athletes in CSV
python find_missing_athletes.py

# Compare CSV to database
python compare_csv_to_db.py

# Run comprehensive analysis
python analyze_missing_<MEET_ID>.py
```
