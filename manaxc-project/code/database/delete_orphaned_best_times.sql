-- Find and delete orphaned athlete_best_times records that reference non-existent results

-- First, find orphaned records
SELECT abt.id, abt.athlete_id, abt.distance_meters, abt.season_best_result_id
FROM athlete_best_times abt
LEFT JOIN results r ON abt.season_best_result_id = r.id
WHERE r.id IS NULL;

-- Delete orphaned records
DELETE FROM athlete_best_times
WHERE season_best_result_id IN (
    SELECT abt.season_best_result_id
    FROM athlete_best_times abt
    LEFT JOIN results r ON abt.season_best_result_id = r.id
    WHERE r.id IS NULL
);

-- Show count of remaining athlete_best_times
SELECT COUNT(*) as remaining_best_times FROM athlete_best_times;
