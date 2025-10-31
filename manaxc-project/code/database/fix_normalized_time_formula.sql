-- FIX CRITICAL BUG: Normalized time formula is inverted
-- Current formula DIVIDES by distance, making longer races have SMALLER normalized times (impossible!)
-- Correct formula should MULTIPLY to convert all times to equivalent 1600m effort

-- The normalized_time_cs should represent: "What would this athlete run for 1600m on a flat course?"
-- Formula: (actual_time / actual_distance) * 1600 / difficulty_rating
-- Simplified: actual_time * 1600 / (difficulty_rating * actual_distance)

-- BEFORE (BROKEN - line 18 in migrations/20251029_add_batch_rebuild_functions_v4.sql):
-- time_cs * 100000.0 / (difficulty_rating * (5280.0 / 3.0) * distance_meters)
-- This divides by distance, so a 5000m race gets a LOWER normalized time than 3000m - WRONG!

-- AFTER (CORRECT):
-- time_cs * 1600.0 / (difficulty_rating * distance_meters)
-- This properly scales the time to 1600m equivalent

-- Update ALL normalized_time_cs values with correct formula
UPDATE results r
SET normalized_time_cs = CASE
    WHEN c.difficulty_rating > 0 AND race.distance_meters > 0 THEN
        CAST((r.time_cs * 1600.0 / (c.difficulty_rating * race.distance_meters)) AS INTEGER)
    ELSE NULL
END
FROM races race
JOIN courses c ON race.course_id = c.id
WHERE r.race_id = race.id
AND r.time_cs IS NOT NULL;

-- Summary of what changed
SELECT
    'Normalized time formula fixed!' as status,
    (SELECT COUNT(*) FROM results WHERE normalized_time_cs IS NOT NULL) as total_normalized,
    (SELECT COUNT(*) FROM results WHERE normalized_time_cs < 10000) as impossible_times_under_100sec,
    (SELECT MIN(normalized_time_cs) FROM results WHERE normalized_time_cs IS NOT NULL) as fastest_normalized,
    (SELECT MAX(normalized_time_cs) FROM results WHERE normalized_time_cs IS NOT NULL) as slowest_normalized;

-- Sample check: Show some results with their normalized times
-- Good high school mile times should be in 28000-40000 cs range (4:40 - 6:40)
SELECT
    a.name as athlete,
    r.time_cs,
    race.distance_meters,
    c.difficulty_rating,
    r.normalized_time_cs,
    -- Convert to readable time (MM:SS.cc)
    CONCAT(
        LPAD((r.normalized_time_cs / 6000)::text, 2, '0'), ':',
        LPAD(((r.normalized_time_cs % 6000) / 100)::text, 2, '0'), '.',
        LPAD((r.normalized_time_cs % 100)::text, 2, '0')
    ) as normalized_mile_time
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN races race ON r.race_id = race.id
JOIN courses c ON race.course_id = c.id
WHERE r.normalized_time_cs IS NOT NULL
ORDER BY r.normalized_time_cs
LIMIT 20;
