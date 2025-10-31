-- Find orphaned athlete_best_times records (don't delete them yet, just identify)

SELECT
    abt.id as best_time_id,
    abt.athlete_id,
    a.name as athlete_name,
    abt.season_best_time_cs,
    abt.season_best_result_id,
    CASE WHEN r.id IS NULL THEN 'ORPHANED' ELSE 'OK' END as status
FROM athlete_best_times abt
LEFT JOIN athletes a ON abt.athlete_id = a.id
LEFT JOIN results r ON abt.season_best_result_id = r.id
WHERE r.id IS NULL
ORDER BY a.name;

-- Count how many are orphaned
SELECT COUNT(*) as orphaned_count
FROM athlete_best_times abt
LEFT JOIN results r ON abt.season_best_result_id = r.id
WHERE r.id IS NULL;
