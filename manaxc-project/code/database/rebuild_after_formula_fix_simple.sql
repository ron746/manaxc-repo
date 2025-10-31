-- Rebuild derived tables after fixing normalized_time_cs formula
-- Step 3 of the normalization fix process
-- Run AFTER: fix_normalized_time_formula.sql and 20251030_fix_normalized_time_formula.sql

-- This uses the existing batch rebuild functions that are already in the database
-- These functions know the correct schema for each table

-- =============================================================================
-- 1. REBUILD ATHLETE_BEST_TIMES
-- =============================================================================
SELECT batch_rebuild_athlete_best_times() as athlete_best_times_rebuilt;

-- =============================================================================
-- 2. REBUILD COURSE_RECORDS
-- =============================================================================
SELECT batch_rebuild_course_records() as course_records_rebuilt;

-- =============================================================================
-- 3. REBUILD SCHOOL_HALL_OF_FAME
-- =============================================================================
SELECT batch_rebuild_school_hall_of_fame() as school_hall_of_fame_rebuilt;

-- =============================================================================
-- 4. REBUILD SCHOOL_COURSE_RECORDS
-- =============================================================================
SELECT batch_rebuild_school_course_records() as school_course_records_rebuilt;

-- =============================================================================
-- SUMMARY
-- =============================================================================

SELECT
    'All derived tables rebuilt with corrected normalized times!' AS status,
    (SELECT COUNT(*) FROM athlete_best_times) as athlete_best_times_count,
    (SELECT COUNT(*) FROM school_hall_of_fame) as school_hall_of_fame_count,
    (SELECT COUNT(*) FROM course_records) as course_records_count,
    (SELECT COUNT(*) FROM school_course_records) as school_course_records_count,
    (SELECT COUNT(*) FROM results WHERE normalized_time_cs IS NOT NULL) as results_with_normalized_time;

-- Verify normalized times are in reasonable range
SELECT
    'Normalized time sanity check' as check_type,
    MIN(normalized_time_cs) as fastest_normalized,
    MAX(normalized_time_cs) as slowest_normalized,
    AVG(normalized_time_cs)::INTEGER as avg_normalized,
    COUNT(*) FILTER (WHERE normalized_time_cs < 20000) as world_record_pace_count,
    COUNT(*) FILTER (WHERE normalized_time_cs BETWEEN 20000 AND 30000) as elite_count,
    COUNT(*) FILTER (WHERE normalized_time_cs BETWEEN 30000 AND 40000) as good_count,
    COUNT(*) FILTER (WHERE normalized_time_cs > 40000) as slower_count
FROM results
WHERE normalized_time_cs IS NOT NULL;
