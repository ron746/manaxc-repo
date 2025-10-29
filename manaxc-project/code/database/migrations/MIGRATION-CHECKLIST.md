# Migration Checklist: Adding Normalized Times

## Pre-Migration Checklist

### 1. Backup
- [ ] Verify Supabase auto-backups are enabled (should be by default)
- [ ] Note current timestamp for point-in-time recovery if needed
- [ ] Take manual backup if desired: SQL Editor → Export → Full Database

### 2. Verify Current State
- [ ] Check results table exists: `SELECT COUNT(*) FROM results;`
- [ ] Check courses have difficulty_rating: `SELECT COUNT(*) FROM courses WHERE difficulty_rating IS NULL;`
- [ ] Note current table sizes: `SELECT pg_size_pretty(pg_total_relation_size('results'));`

### 3. Review Migration
- [ ] Read `001-add-normalized-times.sql` completely
- [ ] Understand what each part does
- [ ] Note the 5 main sections: table changes, function, trigger, backfill, verification

## Running the Migration

### Option 1: Via Supabase Dashboard (Recommended)
1. [ ] Go to Supabase Dashboard → SQL Editor
2. [ ] Create New Query
3. [ ] Copy entire contents of `001-add-normalized-times.sql`
4. [ ] Paste into editor
5. [ ] Click "Run" (this may take 1-5 minutes depending on data size)
6. [ ] Wait for "Migration completed successfully!" message

### Option 2: Via psql (Advanced)
```bash
# Connect to your database
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Run migration
\i 001-add-normalized-times.sql

# Exit
\q
```

## Post-Migration Verification

### 1. Check Table Structure
```sql
-- Should show normalized_time_cs column
\d results

-- Should show new table
\d athlete_best_times

-- Should show 4 indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'athlete_best_times';
```

### 2. Verify Data Population
```sql
-- All results should have normalized times
SELECT
  COUNT(*) as total_results,
  COUNT(normalized_time_cs) as results_with_normalized,
  COUNT(*) - COUNT(normalized_time_cs) as missing_normalized
FROM results;
-- missing_normalized should be 0

-- Should have athlete_best_times records
SELECT
  COUNT(DISTINCT athlete_id) as athletes_with_bests,
  COUNT(*) as total_season_records
FROM athlete_best_times;

-- Check sample data looks reasonable
SELECT
  a.name,
  abt.season_year,
  abt.season_best_normalized_cs,
  abt.alltime_best_normalized_cs
FROM athlete_best_times abt
JOIN athletes a ON abt.athlete_id = a.id
ORDER BY abt.season_best_normalized_cs ASC
LIMIT 10;
-- Normalized times should be 25000-35000 cs range (4:10-5:50 mile pace)
```

### 3. Test Trigger
```sql
-- Insert a test result (use real IDs from your database)
INSERT INTO results (athlete_id, race_id, time_cs, place_overall)
VALUES (
  (SELECT id FROM athletes LIMIT 1),
  (SELECT id FROM races LIMIT 1),
  100000,  -- 16:40.00
  50
);

-- Check it got normalized_time_cs
SELECT
  time_cs,
  normalized_time_cs,
  normalized_time_cs::FLOAT / 100 as normalized_seconds
FROM results
WHERE time_cs = 100000
ORDER BY created_at DESC
LIMIT 1;
-- Should have normalized_time_cs populated

-- Delete test result
DELETE FROM results WHERE time_cs = 100000;
```

### 4. Check Functions Exist
```sql
-- Should show 2 functions
SELECT proname, prosrc FROM pg_proc WHERE proname LIKE '%normalized%' OR proname LIKE '%athlete_best%';
```

### 5. Check Trigger is Active
```sql
-- Should show the trigger
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname LIKE '%athlete_best%';
```

## Update Application Code

### 1. Season Projection Page
- [ ] Update to query `athlete_best_times` instead of calculating
- [ ] Test season-best and all-time modes
- [ ] Verify team standings are correct
- [ ] Check performance improvement (should load much faster)

### 2. Rankings Pages
- [ ] Update to use `athlete_best_times.season_best_normalized_cs`
- [ ] Add indexes to queries using normalized times
- [ ] Test filtering and sorting

### 3. Athlete Profiles
- [ ] Display season bests from `athlete_best_times`
- [ ] Link to the result where best was achieved
- [ ] Show improvement over time

## Performance Testing

### Before and After Comparison
```sql
-- Before (slow - scans all results)
EXPLAIN ANALYZE
SELECT DISTINCT ON (athlete_id)
  athlete_id,
  time_cs
FROM results
WHERE race_id IN (SELECT id FROM races JOIN meets ON races.meet_id = meets.id WHERE season_year = 2024)
ORDER BY athlete_id, time_cs ASC;

-- After (fast - indexed table)
EXPLAIN ANALYZE
SELECT athlete_id, season_best_time_cs
FROM athlete_best_times
WHERE season_year = 2024;
```

Expected improvement: 20-50x faster

## Rollback Plan (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS update_athlete_best_times_trigger ON results;

-- Remove functions
DROP FUNCTION IF EXISTS update_athlete_best_times();
DROP FUNCTION IF EXISTS calculate_normalized_time(INTEGER, INTEGER, DECIMAL);

-- Remove table
DROP TABLE IF EXISTS athlete_best_times;

-- Remove column (optional - data is not lost, just column is removed)
ALTER TABLE results DROP COLUMN IF EXISTS normalized_time_cs;
```

Then restore from backup if needed.

## Success Criteria

✅ Migration is successful when:
1. All results have `normalized_time_cs` populated
2. `athlete_best_times` table has records for all athletes
3. Test result insertion automatically updates normalized time
4. Season projection page loads 10x+ faster
5. All time calculations match expected values

## Troubleshooting

### Problem: normalized_time_cs is NULL for some results
**Solution:** Missing course data
```sql
-- Find results with missing course info
SELECT r.id, ra.course_id, c.difficulty_rating
FROM results r
JOIN races ra ON r.race_id = ra.id
LEFT JOIN courses c ON ra.course_id = c.id
WHERE r.normalized_time_cs IS NULL;

-- Update courses table with missing difficulty ratings
UPDATE courses SET difficulty_rating = 1.13 WHERE difficulty_rating IS NULL;

-- Re-run normalization
UPDATE results r
SET normalized_time_cs = calculate_normalized_time(
  r.time_cs,
  c.distance_meters,
  c.difficulty_rating
)
FROM races ra
JOIN courses c ON ra.course_id = c.id
WHERE r.race_id = ra.id
  AND r.normalized_time_cs IS NULL;
```

### Problem: athlete_best_times is empty
**Solution:** Re-run backfill section of migration

### Problem: Trigger not firing
**Solution:** Check trigger is enabled
```sql
-- Check trigger status
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE '%athlete_best%';

-- Re-enable if disabled
ALTER TABLE results ENABLE TRIGGER update_athlete_best_times_trigger;
```

### Problem: Times look wrong
**Solution:** Verify formula
```sql
-- Test with known good data
SELECT
  92900 as input_time_cs,
  4410 as input_distance_m,
  1.205297234 as input_difficulty,
  calculate_normalized_time(92900, 4410, 1.205297234) as calculated,
  28127 as expected,
  ABS(calculate_normalized_time(92900, 4410, 1.205297234) - 28127) as difference;
-- difference should be < 1
```

## Post-Migration Monitoring

For the first week after migration:
- [ ] Monitor query performance (should be much faster)
- [ ] Check that new results get normalized automatically
- [ ] Verify season bests update correctly
- [ ] Watch for any error logs related to triggers
- [ ] Confirm all-time bests are accurate

## Documentation Updates

After successful migration:
- [ ] Update README to note optimization is live
- [ ] Update any performance documentation
- [ ] Note migration date in project changelog
- [ ] Update API documentation if exposing athlete_best_times

---

**Migration:** 001-add-normalized-times.sql
**Expected Duration:** 1-5 minutes (depending on data volume)
**Risk Level:** Low (rollback available, data preserved)
**Testing:** Thoroughly test on staging before production
