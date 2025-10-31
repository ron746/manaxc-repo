-- Verify meet 267582 (STAL #2) results in database
-- This is a small meet, easy to verify manually

-- Get meet info
SELECT
    id,
    name,
    athletic_net_id,
    result_count,
    date
FROM meets
WHERE athletic_net_id = '267582';

-- Get all results for this meet with athlete and race info
SELECT
    r.id as result_id,
    r.time_cs,
    r.place_overall,
    r.time_cs / 6000.0 as time_minutes,
    a.first_name,
    a.last_name,
    s.name as school_name,
    races.name as race_name,
    races.athletic_net_id as race_athletic_net_id
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN schools s ON a.school_id = s.id
JOIN races ON r.race_id = races.id
WHERE r.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '267582')
ORDER BY r.time_cs
LIMIT 20;

-- Get total count
SELECT COUNT(*) as total_results
FROM results r
WHERE r.meet_id = (SELECT id FROM meets WHERE athletic_net_id = '267582');

-- Get all time_cs and place combinations (for comparison with CSV)
SELECT
    time_cs,
    place_overall,
    time_cs / 6000.0 as time_minutes
FROM results
WHERE meet_id = (SELECT id FROM meets WHERE athletic_net_id = '267582')
ORDER BY place_overall;
