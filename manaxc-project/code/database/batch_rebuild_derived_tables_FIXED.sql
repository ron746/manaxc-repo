-- Batch rebuild all derived tables after bulk import - CORRECTED VERSION
-- Run this in Supabase SQL Editor AFTER importing results with triggers disabled

-- =============================================================================
-- 1. UPDATE NORMALIZED TIMES
-- =============================================================================

UPDATE results r
SET normalized_time_cs = CASE
    WHEN c.difficulty_rating > 0 THEN
        CAST((r.time_cs * 100000.0 / (c.difficulty_rating * (5280.0 / 3.0) * race.distance_meters)) AS INTEGER)
    ELSE NULL
END
FROM races race
JOIN courses c ON race.course_id = c.id
WHERE r.race_id = race.id
AND r.normalized_time_cs IS NULL;

-- =============================================================================
-- 2. REBUILD ATHLETE_BEST_TIMES (simplified - using actual schema)
-- =============================================================================

-- Insert/update athlete best times
-- This uses UPSERT to handle existing records
INSERT INTO athlete_best_times (
    athlete_id,
    season_year,
    season_best_time_cs,
    season_best_result_id,
    alltime_best_time_cs,
    alltime_best_result_id,
    created_at,
    updated_at
)
SELECT DISTINCT ON (r.athlete_id, m.season_year)
    r.athlete_id,
    m.season_year,
    MIN(r.time_cs) OVER (PARTITION BY r.athlete_id, m.season_year) as season_best_time_cs,
    (SELECT id FROM results WHERE athlete_id = r.athlete_id AND time_cs = MIN(r.time_cs) OVER (PARTITION BY r.athlete_id, m.season_year) LIMIT 1),
    MIN(r.time_cs) OVER (PARTITION BY r.athlete_id) as alltime_best_time_cs,
    (SELECT id FROM results WHERE athlete_id = r.athlete_id AND time_cs = MIN(r.time_cs) OVER (PARTITION BY r.athlete_id) LIMIT 1),
    NOW(),
    NOW()
FROM results r
JOIN meets m ON r.meet_id = m.id
WHERE r.time_cs IS NOT NULL
ON CONFLICT (athlete_id, season_year) DO UPDATE SET
    season_best_time_cs = LEAST(EXCLUDED.season_best_time_cs, athlete_best_times.season_best_time_cs),
    season_best_result_id = CASE
        WHEN EXCLUDED.season_best_time_cs < athlete_best_times.season_best_time_cs
        THEN EXCLUDED.season_best_result_id
        ELSE athlete_best_times.season_best_result_id
    END,
    alltime_best_time_cs = LEAST(EXCLUDED.alltime_best_time_cs, athlete_best_times.alltime_best_time_cs),
    alltime_best_result_id = CASE
        WHEN EXCLUDED.alltime_best_time_cs < athlete_best_times.alltime_best_time_cs
        THEN EXCLUDED.alltime_best_result_id
        ELSE athlete_best_times.alltime_best_result_id
    END,
    updated_at = NOW();

-- =============================================================================
-- 3. REBUILD COURSE_RECORDS (top 100 per course/gender)
-- =============================================================================

-- Clear existing
TRUNCATE TABLE course_records;

-- Rebuild with ranked results
INSERT INTO course_records (
    course_id,
    result_id,
    athlete_id,
    gender,
    rank
)
SELECT
    ranked.course_id,
    ranked.result_id,
    ranked.athlete_id,
    ranked.gender,
    ranked.rank
FROM (
    SELECT
        c.id as course_id,
        r.id as result_id,
        r.athlete_id,
        a.gender,
        ROW_NUMBER() OVER (PARTITION BY c.id, a.gender ORDER BY r.time_cs) as rank
    FROM results r
    JOIN races race ON r.race_id = race.id
    JOIN courses c ON race.course_id = c.id
    JOIN athletes a ON r.athlete_id = a.id
    WHERE r.time_cs IS NOT NULL
) ranked
WHERE ranked.rank <= 100;

-- =============================================================================
-- 4. REBUILD SCHOOL_HALL_OF_FAME (top 100 per school/gender by normalized time)
-- =============================================================================

-- Clear existing
TRUNCATE TABLE school_hall_of_fame;

-- Rebuild with ranked results
INSERT INTO school_hall_of_fame (
    school_id,
    result_id,
    athlete_id,
    gender,
    rank
)
SELECT
    ranked.school_id,
    ranked.result_id,
    ranked.athlete_id,
    ranked.gender,
    ranked.rank
FROM (
    SELECT
        a.school_id,
        r.id as result_id,
        r.athlete_id,
        a.gender,
        ROW_NUMBER() OVER (PARTITION BY a.school_id, a.gender ORDER BY r.normalized_time_cs) as rank
    FROM results r
    JOIN athletes a ON r.athlete_id = a.id
    WHERE r.normalized_time_cs IS NOT NULL
    AND a.school_id IS NOT NULL
) ranked
WHERE ranked.rank <= 100;

-- =============================================================================
-- 5. REBUILD SCHOOL_COURSE_RECORDS (best time per grade/course/gender/school)
-- =============================================================================

-- Clear existing
TRUNCATE TABLE school_course_records;

-- Rebuild with best times per grade
INSERT INTO school_course_records (
    school_id,
    course_id,
    result_id,
    athlete_id,
    grade_level,
    gender
)
SELECT DISTINCT ON (a.school_id, c.id, a.gender, (12 - (a.grad_year - m.season_year)))
    a.school_id,
    c.id as course_id,
    r.id as result_id,
    r.athlete_id,
    (12 - (a.grad_year - m.season_year)) as grade_level,
    a.gender
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN races race ON r.race_id = race.id
JOIN courses c ON race.course_id = c.id
JOIN meets m ON r.meet_id = m.id
WHERE r.time_cs IS NOT NULL
AND a.school_id IS NOT NULL
AND (12 - (a.grad_year - m.season_year)) BETWEEN 9 AND 12
ORDER BY a.school_id, c.id, a.gender, (12 - (a.grad_year - m.season_year)), r.time_cs;

-- =============================================================================
-- SUMMARY
-- =============================================================================

SELECT 'Batch rebuild complete!' AS status,
    (SELECT COUNT(*) FROM results WHERE normalized_time_cs IS NOT NULL) as results_with_normalized_times,
    (SELECT COUNT(*) FROM athlete_best_times) as athlete_best_times_count,
    (SELECT COUNT(*) FROM course_records) as course_records_count,
    (SELECT COUNT(*) FROM school_hall_of_fame) as school_hall_of_fame_count,
    (SELECT COUNT(*) FROM school_course_records) as school_course_records_count;
