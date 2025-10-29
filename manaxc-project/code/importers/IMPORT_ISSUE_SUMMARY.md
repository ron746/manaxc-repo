# Import Issue Summary - October 29, 2025

## Critical Issue Discovered

**Problem:** Result imports are failing due to orphaned foreign key references in the `athlete_best_times` table.

### Error Message
```
Foreign key constraint "athlete_best_times_season_best_result_id_fkey" violated
Key (season_best_result_id)=(5d99a3e7-6ae0-466a-92e8-23ac42c1f3e3) is not present in table "results"
```

### Impact
- **Meet 254032 ("Flat SAC")** import completed but:
  - ✅ Successfully created: 1 meet, 9 races, 37 schools, 1,738 athletes
  - ❌ **Only 3 out of 1,314 results imported**
  - ❌ **1,311 results failed** due to orphaned references

### Root Cause
The `athlete_best_times` table contains references to result IDs that no longer exist in the database. This likely happened from previous data cleanup operations where results were deleted but the best_times table wasn't updated.

When inserting a new result, a database trigger tries to update athlete_best_times and fails on the foreign key constraint, blocking ALL result inserts for affected athletes.

## Fix Required

### Step 1: Clean Up Orphaned References
Run the cleanup script:
```bash
cd /Users/ron/manaxc/manaxc-project/code/importers
venv/bin/python3 FIX_ORPHANED_REFERENCES.py
```

This script will:
1. Check all 1,776 records in `athlete_best_times`
2. Find any references to non-existent results
3. Set those references to NULL
4. Allow result imports to proceed

### Step 2: Re-import Meet 254032
After cleanup, re-import the meet:
```bash
venv/bin/python3 import_csv_data.py ./to-be-processed/processed/1761769077/meet_254032_1761715973
```

Expected result: All 1,314 results should import successfully.

## Improvements Made

### Enhanced Error Logging
Updated `import_csv_data.py` (lines 685-686, 702-703) to show actual error messages instead of silently failing:
```python
except Exception as e:
    print(f"      ❌ Failed to insert result: {str(e)[:100]}")
    stats['skipped_results'] += 1
```

## Database Status

### Current State
- Total `athlete_best_times` records: 1,776
- Meet 254032 exists in database: Yes (ID: `8d4f3a37-4878-49a6-8a3d-0c7a4a3274dc`)
- Results for meet 254032: Only 3
- Races for meet 254032: All 9 created

### Files Created for Troubleshooting
- `check_meet_254032_results.py` - Check if meet exists
- `check_duplicate_meet.py` - Find duplicate meets
- `check_orphaned_fast.py` - Quick check for orphaned refs
- `check_grady_jenkins.py` - Check specific athlete
- `find_orphaned_result.py` - Find specific orphaned ID
- `find_all_orphaned.py` - Comprehensive orphan scan
- `test_single_result_insert.py` - Test result insert
- **`FIX_ORPHANED_REFERENCES.py`** - **THE FIX SCRIPT**

## Next Steps

1. **Run the fix script** (FIX_ORPHANED_REFERENCES.py)
2. **Re-import meet 254032** to get the 1,311 missing results
3. **Continue with other meets** in to-be-processed folder
4. **Monitor** for any other import issues

## Performance Note
The slow import speed (10+ minutes for schools stage) is due to network latency with Supabase (~50-100ms per query). Each school requires 2 sequential queries (existence check + insert if needed). This is expected behavior for cloud databases.

---
*Generated: October 29, 2025 at 1:35 PM*
