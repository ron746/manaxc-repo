-- Rebuild athlete_best_times for athletes affected by distance_meters fix
-- These 8 races had distance_meters = 0, now corrected to 4000
-- This affects normalized_time_cs calculations and thus athlete_best_times

-- First, recalculate normalized_time_cs for results in these 8 races
-- CORRECT FORMULA: time_cs * 1600.0 / (difficulty_rating * distance_meters)
UPDATE results r
SET normalized_time_cs = CASE
    WHEN c.difficulty_rating > 0 AND race.distance_meters > 0 THEN
        CAST((r.time_cs * 1600.0 / (c.difficulty_rating * race.distance_meters)) AS INTEGER)
    ELSE NULL
END
FROM races race
JOIN courses c ON race.course_id = c.id
WHERE r.race_id = race.id
AND race.id IN (
    'c81c8281-39f3-4ce0-8943-262dc17c4dfe',  -- Mens 4,000 Meters Freshmen
    '75941ccf-d59d-42c2-9ed1-13c2d2413875',  -- Mens 4,000 Meters Sophomore
    '07a09763-086a-472c-aa0b-de8393d72912',  -- Womens 4,000 Meters Freshmen
    '6cfde952-8a7a-446e-ad19-f7f13547d57b',  -- Womens 4,000 Meters Sophomore
    'e3e546c5-1b9a-46b3-92de-5a0be3abbb93',  -- Mens 4,000 Meters Junior
    '9910b8ee-e65b-4907-bc97-4fc8694e8134',  -- Womens 4,000 Meters Junior
    '3c42b260-2868-4b32-a8e3-5ccb4d458678',  -- Womens 4,000 Meters Senior
    '8e5cd45a-0ee2-49ae-bcc0-20e9b97f9f3c'   -- Mens 4,000 Meters Senior
);

-- Rebuild athlete_best_times for all affected athletes
-- Get unique athlete IDs first, then rebuild their records
WITH affected_athletes AS (
    SELECT DISTINCT r.athlete_id
    FROM results r
    WHERE r.race_id IN (
        'c81c8281-39f3-4ce0-8943-262dc17c4dfe',
        '75941ccf-d59d-42c2-9ed1-13c2d2413875',
        '07a09763-086a-472c-aa0b-de8393d72912',
        '6cfde952-8a7a-446e-ad19-f7f13547d57b',
        'e3e546c5-1b9a-46b3-92de-5a0be3abbb93',
        '9910b8ee-e65b-4907-bc97-4fc8694e8134',
        '3c42b260-2868-4b32-a8e3-5ccb4d458678',
        '8e5cd45a-0ee2-49ae-bcc0-20e9b97f9f3c'
    )
),
athlete_seasons AS (
    -- For each affected athlete, calculate their best times per season
    SELECT
        r.athlete_id,
        m.season_year,
        MIN(r.time_cs) as season_best_time_cs,
        MIN(r.normalized_time_cs) as season_best_normalized_time_cs,
        (SELECT id FROM results
         WHERE athlete_id = r.athlete_id
         AND time_cs = MIN(r.time_cs)
         LIMIT 1) as season_best_result_id,
        MIN(r.time_cs) FILTER (WHERE 1=1) OVER (PARTITION BY r.athlete_id) as alltime_best_time_cs,
        MIN(r.normalized_time_cs) FILTER (WHERE 1=1) OVER (PARTITION BY r.athlete_id) as alltime_best_normalized_time_cs,
        (SELECT id FROM results
         WHERE athlete_id = r.athlete_id
         ORDER BY time_cs
         LIMIT 1) as alltime_best_result_id
    FROM results r
    JOIN meets m ON r.meet_id = m.id
    WHERE r.athlete_id IN (SELECT athlete_id FROM affected_athletes)
    AND r.time_cs IS NOT NULL
    GROUP BY r.athlete_id, m.season_year
)
INSERT INTO athlete_best_times (
    athlete_id,
    season_year,
    season_best_time_cs,
    season_best_normalized_time_cs,
    season_best_result_id,
    alltime_best_time_cs,
    alltime_best_normalized_time_cs,
    alltime_best_result_id,
    created_at,
    updated_at
)
SELECT DISTINCT ON (athlete_id, season_year)
    athlete_id,
    season_year,
    season_best_time_cs,
    season_best_normalized_time_cs,
    season_best_result_id,
    alltime_best_time_cs,
    alltime_best_normalized_time_cs,
    alltime_best_result_id,
    NOW(),
    NOW()
FROM athlete_seasons
ON CONFLICT (athlete_id, season_year) DO UPDATE SET
    season_best_time_cs = EXCLUDED.season_best_time_cs,
    season_best_normalized_time_cs = EXCLUDED.season_best_normalized_time_cs,
    season_best_result_id = EXCLUDED.season_best_result_id,
    alltime_best_time_cs = EXCLUDED.alltime_best_time_cs,
    alltime_best_normalized_time_cs = EXCLUDED.alltime_best_normalized_time_cs,
    alltime_best_result_id = EXCLUDED.alltime_best_result_id,
    updated_at = NOW();

-- Summary
SELECT
    'Distance fix cascade rebuild complete' as status,
    (SELECT COUNT(DISTINCT athlete_id) FROM results WHERE race_id IN (
        'c81c8281-39f3-4ce0-8943-262dc17c4dfe',
        '75941ccf-d59d-42c2-9ed1-13c2d2413875',
        '07a09763-086a-472c-aa0b-de8393d72912',
        '6cfde952-8a7a-446e-ad19-f7f13547d57b',
        'e3e546c5-1b9a-46b3-92de-5a0be3abbb93',
        '9910b8ee-e65b-4907-bc97-4fc8694e8134',
        '3c42b260-2868-4b32-a8e3-5ccb4d458678',
        '8e5cd45a-0ee2-49ae-bcc0-20e9b97f9f3c'
    )) as affected_athletes,
    (SELECT COUNT(*) FROM results WHERE race_id IN (
        'c81c8281-39f3-4ce0-8943-262dc17c4dfe',
        '75941ccf-d59d-42c2-9ed1-13c2d2413875',
        '07a09763-086a-472c-aa0b-de8393d72912',
        '6cfde952-8a7a-446e-ad19-f7f13547d57b',
        'e3e546c5-1b9a-46b3-92de-5a0be3abbb93',
        '9910b8ee-e65b-4907-bc97-4fc8694e8134',
        '3c42b260-2868-4b32-a8e3-5ccb4d458678',
        '8e5cd45a-0ee2-49ae-bcc0-20e9b97f9f3c'
    ) AND normalized_time_cs IS NOT NULL) as results_with_normalized_times;
