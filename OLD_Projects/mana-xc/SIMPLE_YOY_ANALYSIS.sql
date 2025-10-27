-- Simplified Year-Over-Year Analysis
-- Faster version that focuses on key courses

-- Query 1: Average times by course and season
SELECT
  v.name as venue,
  c.distance_meters,
  res.season_year,
  r.gender,
  COUNT(*) as result_count,
  AVG(res.time_cs)::integer as avg_time_cs,
  FLOOR(AVG(res.time_cs)::integer / 6000)::text || ':' ||
  LPAD(FLOOR((AVG(res.time_cs)::integer % 6000) / 100)::text, 2, '0') || '.' ||
  LPAD((AVG(res.time_cs)::integer % 100)::text, 2, '0') as avg_time
FROM results res
JOIN races r ON r.id = res.race_id
JOIN courses c ON c.id = r.course_id
JOIN venues v ON v.id = c.venue_id
WHERE res.time_cs > 0
  AND res.time_cs < 200000
  AND v.name IN ('Montgomery Hill Park', 'Crystal Springs', 'Baylands Park', 'Woodward Park')
GROUP BY v.name, c.distance_meters, res.season_year, r.gender
HAVING COUNT(*) >= 10
ORDER BY v.name, r.gender, res.season_year;
