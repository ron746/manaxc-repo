# Duplicate Time Resolution Workflow

This document describes the process for finding and resolving duplicate time situations where an athlete has multiple different times recorded for the same race.

## Background

The duplicate tracking system allows athletes to have multiple times for the same race. When this happens:
- Both times are stored in the `results` table
- A record is created in `potential_duplicates` for admin review
- The unique constraint allows this: `UNIQUE (athlete_id, meet_id, race_id, time_cs, data_source)`

## Quick Process (Tristan Scott Method)

### Step 1: Find the missing time in CSV
```bash
# Compare CSV count to DB count
tail -n +2 to-be-processed/meet_XXXXX_*/results.csv | wc -l  # CSV data rows
# vs DB count from Supabase

# If missing 1 result, grep the CSV to understand the data
grep ",TIME_CS," to-be-processed/meet_XXXXX_*/results.csv
```

### Step 2: Create a Python check script
```python
# check_athlete_MEETID.py
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('../../website/.env.local')
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

# Get IDs for meet, school, athlete, race
meet = supabase.table('meets').select('id, name').eq('athletic_net_id', 'MEET_AN_ID').execute()
school = supabase.table('schools').select('id, name').eq('athletic_net_id', 'school_XXX').execute()
athlete = supabase.table('athletes').select('id, name').eq('name', 'ATHLETE_NAME').eq('school_id', school_id).execute()
race = supabase.table('races').select('id, name').eq('meet_id', meet_id).execute()

# Find race by athletic_net_race_id since athletic_net_id might be NULL
for r in race.data:
    if r.get('athletic_net_id') == 'RACE_ID' or r.get('athletic_net_race_id') == 'RACE_ID':
        race_id = r['id']

# Check existing results
results = supabase.table('results').select('id, time_cs, race_id').eq('athlete_id', athlete_id).eq('meet_id', meet_id).execute()

# If same race_id found, it's a DUPLICATE TIME situation
```

### Step 3: Create SQL to add duplicate time
```sql
-- add_athlete_duplicate.sql
-- Disable triggers
ALTER TABLE results DISABLE TRIGGER USER;

-- Insert CSV time
INSERT INTO results (meet_id, race_id, athlete_id, time_cs, data_source)
SELECT
    'MEET_UUID'::UUID,
    'RACE_UUID'::UUID,
    'ATHLETE_UUID'::UUID,
    CSV_TIME_CS,
    'athletic_net'
WHERE NOT EXISTS (
    SELECT 1 FROM results
    WHERE athlete_id = 'ATHLETE_UUID'::UUID
    AND meet_id = 'MEET_UUID'::UUID
    AND race_id = 'RACE_UUID'::UUID
    AND time_cs = CSV_TIME_CS
);

-- Create potential duplicate record
INSERT INTO potential_duplicates (
    result_id_1, result_id_2, athlete_id, meet_id, race_id,
    conflict_type, time_1_cs, time_2_cs, time_difference_cs, status
)
SELECT r1.id, r2.id,
    'ATHLETE_UUID'::UUID,
    'MEET_UUID'::UUID,
    'RACE_UUID'::UUID,
    'different_times_same_athlete_race',
    r1.time_cs, r2.time_cs,
    ABS(r2.time_cs - r1.time_cs),
    'pending'
FROM results r1
CROSS JOIN results r2
WHERE r1.athlete_id = 'ATHLETE_UUID'::UUID
AND r1.meet_id = 'MEET_UUID'::UUID
AND r1.race_id = 'RACE_UUID'::UUID
AND r2.athlete_id = 'ATHLETE_UUID'::UUID
AND r2.meet_id = 'MEET_UUID'::UUID
AND r2.race_id = 'RACE_UUID'::UUID
AND r1.time_cs = EXISTING_TIME_CS
AND r2.time_cs = CSV_TIME_CS
ON CONFLICT (result_id_1, result_id_2) DO NOTHING;

-- Re-enable triggers
ALTER TABLE results ENABLE TRIGGER USER;

-- Summary
SELECT 'Added duplicate times!' AS status,
    (SELECT COUNT(*) FROM results
     WHERE athlete_id = 'ATHLETE_UUID'::UUID
     AND meet_id = 'MEET_UUID'::UUID) as athlete_results,
    (SELECT COUNT(*) FROM potential_duplicates
     WHERE athlete_id = 'ATHLETE_UUID'::UUID) as potential_duplicates_flagged;
```

### Step 4: Run SQL in Supabase SQL Editor

### Step 5: Verify
```python
# verify_athlete.py
results = supabase.table('results').select('id, time_cs').eq('athlete_id', athlete_id).eq('meet_id', meet_id).execute()
duplicates = supabase.table('potential_duplicates').select('*').eq('athlete_id', athlete_id).eq('meet_id', meet_id).execute()
```

## Examples Completed

1. **Ariel Hung** (Meet 270614)
   - Existing: 158420 cs (26:24.20)
   - CSV: 207460 cs (34:34.60)
   - Difference: 490 seconds

2. **Tristan Scott** (Meet 267582)
   - Existing: 123280 cs (20:32.80)
   - CSV: 129810 cs (21:38.10)
   - Difference: 65 seconds

## Key Points

- Use `grep` to quickly find data in CSV
- Check for `athletic_net_race_id` when `athletic_net_id` is NULL
- Always use `DISABLE TRIGGER USER` (not `ALL`) to avoid system trigger errors
- The unique constraint now includes `time_cs`, allowing multiple times per athlete/race
- Different athletes with same time (ties) are allowed and normal
- Same athlete with same time is blocked (true duplicate)
