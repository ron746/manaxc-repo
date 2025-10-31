-- Find all races with distance_meters = 0 or NULL

SELECT
    r.id,
    r.athletic_net_race_id,
    r.name,
    r.distance_meters,
    m.name as meet_name,
    m.athletic_net_id as meet_athletic_net_id,
    COUNT(res.id) as result_count
FROM races r
LEFT JOIN meets m ON r.meet_id = m.id
LEFT JOIN results res ON r.id = res.id
WHERE r.distance_meters = 0 OR r.distance_meters IS NULL
GROUP BY r.id, r.athletic_net_race_id, r.name, r.distance_meters, m.name, m.athletic_net_id
ORDER BY m.name, r.name;

-- Summary count
SELECT
    COUNT(*) as races_with_zero_distance,
    SUM(result_count) as affected_results
FROM (
    SELECT
        r.id,
        COUNT(res.id) as result_count
    FROM races r
    LEFT JOIN results res ON r.id = res.id
    WHERE r.distance_meters = 0 OR r.distance_meters IS NULL
    GROUP BY r.id
) subquery;
