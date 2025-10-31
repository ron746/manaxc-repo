-- Step 1: Update normalized times only
-- This updates only NULL normalized times (new imports)

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

SELECT 'Step 1 complete!' AS status,
    (SELECT COUNT(*) FROM results WHERE normalized_time_cs IS NOT NULL) as results_with_normalized_times;
