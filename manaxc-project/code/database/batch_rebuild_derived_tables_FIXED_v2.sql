-- Batch rebuild all derived tables after bulk import - CORRECTED VERSION v2
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
-- 2. REBUILD ATHLETE_BEST_TIMES (using CTE to avoid window function issues)
-- =============================================================================

-- Insert/update athlete best times
WITH athlete_stats AS (
    SELECT
        r.athlete_id,
        m.season_year,
        MIN(r.time_cs) as season_best,
        MIN(r.time_cs) FILTER (WHERE TRUE) OVER (PARTITION BY r.athlete_id) as alltime_best
    FROM results r
    JOIN meets m ON r.meet_id = m.id
    WHERE r.time_cs IS NOT NULL
    GROUP BY r.athlete_id, m.season_year
),
season_result_ids AS (
    SELECT DISTINCT ON (r.athlete_id, m.season_year)
        r.athlete_id,
        m.season_year,
        r.id as result_id
    FROM results r
    JOIN meets m ON r.meet_id = m.id
    JOIN athlete_stats s ON r.athlete_id = s.athlete_id
        AND m.season_year = s.season_year
        AND r.time_cs = s.season_best
    ORDER BY r.athlete_id, m.season_year, r.created_at
),
alltime_result_ids AS (
    SELECT DISTINCT ON (r.athlete_id)
        r.athlete_id,
        r.id as result_id,
        MIN(r.time_cs) as best_time
    FROM results r
    GROUP BY r.athlete_id, r.id
    HAVING r.time_cs = (SELECT MIN(time_cs) FROM results WHERE athlete_id = r.athlete_id)
    ORDER BY r.athlete_id, r.created_at
)
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
SELECT
    s.athlete_id,
    s.season_year,
    s.season_best,
    sr.result_id,
    s.alltime_best,
    ar.result_id,
    NOW(),
    NOW()
FROM athlete_stats s
JOIN season_result_ids sr ON s.athlete_id = sr.athlete_id AND s.season_year = sr.season_year
LEFT JOIN alltime_result_ids ar ON s.athlete_id = ar.athlete_id
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
-- 4. REBUILD SCHOOL_HALL_OF_FAME (top 100 per school/gender by normalized time)
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
-- 5. REBUILD SCHOOL_COURSE_RECORDS (best time per grade/course/gender/school)
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

SELECT 'Batch rebuild complete!' AS status,
    (SELECT COUNT(*) FROM results WHERE normalized_time_cs IS NOT NULL) as results_with_normalized_times,
    (SELECT COUNT(*) FROM athlete_best_times) as athlete_best_times_count,
    (SELECT COUNT(*) FROM course_records) as course_records_count,
    (SELECT COUNT(*) FROM school_hall_of_fame) as school_hall_of_fame_count,
    (SELECT COUNT(*) FROM school_course_records) as school_course_records_count;
