-- Rebuild derived tables after fixing normalized_time_cs formula
-- Step 3 of the normalization fix process
-- Run AFTER: fix_normalized_time_formula.sql and 20251030_fix_normalized_time_formula.sql

-- =============================================================================
-- 1. REBUILD ATHLETE_BEST_TIMES
-- =============================================================================

-- Clear existing athlete_best_times and rebuild from scratch
-- This is safer than trying to update in place
TRUNCATE TABLE athlete_best_times;

-- Rebuild with corrected normalized times
-- Use the proper column names: season_best_normalized_cs (not season_best_normalized_time_cs)
-- Also need to include course_id and distance_meters fields
WITH season_bests AS (
    SELECT
        r.athlete_id,
        m.season_year,
        MIN(r.time_cs) as best_time,
        MIN(r.normalized_time_cs) as best_normalized_time
    FROM results r
    JOIN meets m ON r.meet_id = m.id
    WHERE r.time_cs IS NOT NULL
    GROUP BY r.athlete_id, m.season_year
),
season_best_results AS (
    SELECT DISTINCT ON (sb.athlete_id, sb.season_year)
        sb.athlete_id,
        sb.season_year,
        sb.best_time as season_best_time_cs,
        sb.best_normalized_time as season_best_normalized_cs,
        r.id as season_best_result_id,
        race.course_id as season_best_course_id,
        race.distance_meters as season_best_race_distance_meters
    FROM season_bests sb
    JOIN results r ON r.athlete_id = sb.athlete_id AND r.time_cs = sb.best_time
    JOIN meets m ON r.meet_id = m.id AND m.season_year = sb.season_year
    JOIN races race ON r.race_id = race.id
    ORDER BY sb.athlete_id, sb.season_year, m.meet_date DESC, r.id
),
alltime_bests AS (
    SELECT
        r.athlete_id,
        MIN(r.time_cs) as best_time,
        MIN(r.normalized_time_cs) as best_normalized_time
    FROM results r
    WHERE r.time_cs IS NOT NULL
    GROUP BY r.athlete_id
),
alltime_best_results AS (
    SELECT DISTINCT ON (ab.athlete_id)
        ab.athlete_id,
        ab.best_time as alltime_best_time_cs,
        ab.best_normalized_time as alltime_best_normalized_cs,
        r.id as alltime_best_result_id,
        race.course_id as alltime_best_course_id,
        race.distance_meters as alltime_best_race_distance_meters
    FROM alltime_bests ab
    JOIN results r ON r.athlete_id = ab.athlete_id AND r.time_cs = ab.best_time
    JOIN meets m ON r.meet_id = m.id
    JOIN races race ON r.race_id = race.id
    ORDER BY ab.athlete_id, m.meet_date DESC, r.id
)
INSERT INTO athlete_best_times (
    athlete_id,
    season_year,
    season_best_time_cs,
    season_best_normalized_cs,
    season_best_result_id,
    season_best_course_id,
    season_best_race_distance_meters,
    alltime_best_time_cs,
    alltime_best_normalized_cs,
    alltime_best_result_id,
    alltime_best_course_id,
    alltime_best_race_distance_meters,
    created_at,
    updated_at
)
SELECT
    sbr.athlete_id,
    sbr.season_year,
    sbr.season_best_time_cs,
    sbr.season_best_normalized_cs,
    sbr.season_best_result_id,
    sbr.season_best_course_id,
    sbr.season_best_race_distance_meters,
    abr.alltime_best_time_cs,
    abr.alltime_best_normalized_cs,
    abr.alltime_best_result_id,
    abr.alltime_best_course_id,
    abr.alltime_best_race_distance_meters,
    NOW() as created_at,
    NOW() as updated_at
FROM season_best_results sbr
JOIN alltime_best_results abr ON sbr.athlete_id = abr.athlete_id;

-- =============================================================================
-- 2. REBUILD SCHOOL_HALL_OF_FAME (top 100 per school/gender by normalized time)
-- =============================================================================

TRUNCATE TABLE school_hall_of_fame;

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
-- 3. REBUILD COURSE_RECORDS (top 100 per course/gender)
-- =============================================================================

TRUNCATE TABLE course_records;

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
-- 4. REBUILD SCHOOL_COURSE_RECORDS (best time per grade/course/gender/school)
-- =============================================================================

TRUNCATE TABLE school_course_records;

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

SELECT
    'Derived tables rebuilt with corrected normalized times!' AS status,
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
