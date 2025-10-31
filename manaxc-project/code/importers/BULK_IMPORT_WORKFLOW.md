# Bulk Import Workflow (High Performance)

## Problem
Importing results with triggers enabled is **extremely slow** because each result insert fires 5+ expensive triggers that calculate normalized times, update best times, rebuild leaderboards, etc. This makes bulk imports 10-100x slower than necessary.

## Solution
Disable triggers during bulk import, then run batch updates to rebuild all derived tables at once.

## Performance Comparison

### With Triggers (Current)
- **1,391 results**: ~6 minutes, 90% failure rate
- **10,870 results**: Would take 45+ minutes
- Each insert triggers 5+ expensive database operations

### Without Triggers (New Workflow)
- **1,391 results**: ~10 seconds
- **10,870 results**: ~60 seconds
- **10-100x faster**

## Workflow

### Step 1: Disable Triggers (in Supabase SQL Editor)

Open Supabase SQL Editor and run:
```sql
-- File: code/database/disable_result_triggers.sql

ALTER TABLE results DISABLE TRIGGER trigger_calculate_normalized_time_cs;
ALTER TABLE results DISABLE TRIGGER update_athlete_best_times_trigger;
ALTER TABLE results DISABLE TRIGGER maintain_course_records_trigger;
ALTER TABLE results DISABLE TRIGGER maintain_school_hall_of_fame_trigger;
ALTER TABLE results DISABLE TRIGGER maintain_school_course_records_trigger;
```

### Step 2: Import All Your Data (Terminal)

Run imports normally - they'll be fast now:
```bash
cd /Users/ron/manaxc/manaxc-project/code/importers

# Import single meet
venv/bin/python3 import_csv_data.py to-be-processed/meet_254535_1761716232

# Or import multiple meets
for dir in to-be-processed/meet_*/; do
    venv/bin/python3 import_csv_data.py "$dir"
done
```

### Step 3: Batch Rebuild Derived Tables (in Supabase SQL Editor)

Run the batch rebuild script:
```sql
-- File: code/database/batch_rebuild_derived_tables.sql

-- This script will:
-- 1. Calculate normalized times for all results
-- 2. Rebuild athlete_best_times table
-- 3. Rebuild course_records (top 100 per course/gender)
-- 4. Rebuild school_hall_of_fame (top 100 per school/gender)
-- 5. Rebuild school_course_records (best per grade/course/gender/school)
```

### Step 4: Re-enable Triggers (in Supabase SQL Editor)

```sql
-- File: code/database/enable_result_triggers.sql

ALTER TABLE results ENABLE TRIGGER trigger_calculate_normalized_time_cs;
ALTER TABLE results ENABLE TRIGGER update_athlete_best_times_trigger;
ALTER TABLE results ENABLE TRIGGER maintain_course_records_trigger;
ALTER TABLE results ENABLE TRIGGER maintain_school_hall_of_fame_trigger;
ALTER TABLE results ENABLE TRIGGER maintain_school_course_records_trigger;
```

## When to Use This Workflow

**Use bulk import workflow when:**
- Importing 500+ results
- Importing multiple meets at once
- Initial data load
- Historical data migration

**Use regular import (triggers enabled) when:**
- Adding individual results
- Small updates (< 100 results)
- Real-time result entry during meets

## Files Created

- `code/database/disable_result_triggers.sql` - Disable triggers before import
- `code/database/enable_result_triggers.sql` - Re-enable triggers after import
- `code/database/batch_rebuild_derived_tables.sql` - Rebuild all derived tables

## Notes

- **Always disable triggers BEFORE bulk import**
- **Always re-enable triggers AFTER batch rebuild**
- The batch rebuild script is idempotent (safe to run multiple times)
- You can verify completion by checking the summary at the end of batch_rebuild_derived_tables.sql

## Troubleshooting

**If imports still fail after disabling triggers:**
- Verify triggers are actually disabled: `SELECT * FROM pg_trigger WHERE tgrelid = 'results'::regclass;`
- Check for other constraints (foreign keys, unique indexes)

**If batch rebuild takes too long:**
- Run each section of the script separately
- Check for missing indexes on join columns

**If data looks wrong after rebuild:**
- Check the formulas in batch_rebuild_derived_tables.sql
- Compare against a few manual calculations
- Re-run the batch rebuild script
