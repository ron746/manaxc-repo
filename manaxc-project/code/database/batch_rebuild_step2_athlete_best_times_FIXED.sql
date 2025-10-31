-- Step 2: Rebuild athlete_best_times for meet 254378 athletes only
-- This is much faster than rebuilding all athletes

WITH meet_athletes AS (
    -- Get only athletes from meet 254378
    SELECT DISTINCT athlete_id
    FROM results
    WHERE meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
),
season_stats AS (
    -- Get season best times for these athletes
    SELECT
        r.athlete_id,
        m.season_year,
        MIN(r.time_cs) as season_best_time
    FROM results r
    JOIN meets m ON r.meet_id = m.id
    WHERE r.time_cs IS NOT NULL
    AND r.athlete_id IN (SELECT athlete_id FROM meet_athletes)
    GROUP BY r.athlete_id, m.season_year
),
alltime_stats AS (
    -- Get all-time best times for these athletes
    SELECT
        athlete_id,
        MIN(time_cs) as alltime_best_time
    FROM results
    WHERE time_cs IS NOT NULL
    AND athlete_id IN (SELECT athlete_id FROM meet_athletes)
    GROUP BY athlete_id
),
season_result_details AS (
    -- Get full result details for season bests
    SELECT DISTINCT ON (r.athlete_id, m.season_year)
        r.athlete_id,
        m.season_year,
        r.id as result_id,
        r.normalized_time_cs,
        race.course_id,
        race.distance_meters
    FROM results r
    JOIN meets m ON r.meet_id = m.id
    JOIN races race ON r.race_id = race.id
    JOIN season_stats s ON r.athlete_id = s.athlete_id
        AND m.season_year = s.season_year
        AND r.time_cs = s.season_best_time
    ORDER BY r.athlete_id, m.season_year, r.created_at
),
alltime_result_details AS (
    -- Get full result details for all-time bests
    SELECT DISTINCT ON (r.athlete_id)
        r.athlete_id,
        r.id as result_id,
        r.normalized_time_cs,
        race.course_id,
        race.distance_meters
    FROM results r
    JOIN races race ON r.race_id = race.id
    JOIN alltime_stats a ON r.athlete_id = a.athlete_id
        AND r.time_cs = a.alltime_best_time
    ORDER BY r.athlete_id, r.created_at
)
INSERT INTO athlete_best_times (
    athlete_id,
    season_year,
    season_best_time_cs,
    season_best_result_id,
    season_best_normalized_cs,
    season_best_course_id,
    season_best_race_distance_meters,
    alltime_best_time_cs,
    alltime_best_result_id,
    alltime_best_normalized_cs,
    alltime_best_course_id,
    alltime_best_race_distance_meters,
    created_at,
    updated_at
)
SELECT
    ss.athlete_id,
    ss.season_year,
    ss.season_best_time,
    srd.result_id,
    srd.normalized_time_cs,
    srd.course_id,
    srd.distance_meters,
    ats.alltime_best_time,
    ard.result_id,
    ard.normalized_time_cs,
    ard.course_id,
    ard.distance_meters,
    NOW(),
    NOW()
FROM season_stats ss
JOIN season_result_details srd ON ss.athlete_id = srd.athlete_id AND ss.season_year = srd.season_year
JOIN alltime_stats ats ON ss.athlete_id = ats.athlete_id
JOIN alltime_result_details ard ON ss.athlete_id = ard.athlete_id
ON CONFLICT (athlete_id, season_year) DO UPDATE SET
    season_best_time_cs = LEAST(EXCLUDED.season_best_time_cs, athlete_best_times.season_best_time_cs),
    season_best_result_id = CASE
        WHEN EXCLUDED.season_best_time_cs < athlete_best_times.season_best_time_cs
        THEN EXCLUDED.season_best_result_id
        ELSE athlete_best_times.season_best_result_id
    END,
    season_best_normalized_cs = CASE
        WHEN EXCLUDED.season_best_time_cs < athlete_best_times.season_best_time_cs
        THEN EXCLUDED.season_best_normalized_cs
        ELSE athlete_best_times.season_best_normalized_cs
    END,
    season_best_course_id = CASE
        WHEN EXCLUDED.season_best_time_cs < athlete_best_times.season_best_time_cs
        THEN EXCLUDED.season_best_course_id
        ELSE athlete_best_times.season_best_course_id
    END,
    season_best_race_distance_meters = CASE
        WHEN EXCLUDED.season_best_time_cs < athlete_best_times.season_best_time_cs
        THEN EXCLUDED.season_best_race_distance_meters
        ELSE athlete_best_times.season_best_race_distance_meters
    END,
    alltime_best_time_cs = LEAST(EXCLUDED.alltime_best_time_cs, athlete_best_times.alltime_best_time_cs),
    alltime_best_result_id = CASE
        WHEN EXCLUDED.alltime_best_time_cs < athlete_best_times.alltime_best_time_cs
        THEN EXCLUDED.alltime_best_result_id
        ELSE athlete_best_times.alltime_best_result_id
    END,
    alltime_best_normalized_cs = CASE
        WHEN EXCLUDED.alltime_best_time_cs < athlete_best_times.alltime_best_time_cs
        THEN EXCLUDED.alltime_best_normalized_cs
        ELSE athlete_best_times.alltime_best_normalized_cs
    END,
    alltime_best_course_id = CASE
        WHEN EXCLUDED.alltime_best_time_cs < athlete_best_times.alltime_best_time_cs
        THEN EXCLUDED.alltime_best_course_id
        ELSE athlete_best_times.alltime_best_course_id
    END,
    alltime_best_race_distance_meters = CASE
        WHEN EXCLUDED.alltime_best_time_cs < athlete_best_times.alltime_best_time_cs
        THEN EXCLUDED.alltime_best_race_distance_meters
        ELSE athlete_best_times.alltime_best_race_distance_meters
    END,
    updated_at = NOW();

-- Separate query for summary (CTEs are out of scope)
SELECT 'Step 2 complete!' AS status,
    (SELECT COUNT(DISTINCT athlete_id)
     FROM athlete_best_times
     WHERE athlete_id IN (
         SELECT DISTINCT athlete_id
         FROM results
         WHERE meet_id = (SELECT id FROM meets WHERE athletic_net_id = '254378')
     )) as updated_athlete_count;
