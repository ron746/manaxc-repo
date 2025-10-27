-- List ALL courses with their statistics
-- Simple query to see all 17 courses in the database

SELECT
  v.name as venue,
  v.city,
  c.distance_meters,
  ROUND(c.distance_meters / 1609.34, 2) as distance_miles,
  c.xc_time_rating as current_rating,
  COUNT(DISTINCT res.athlete_id) as unique_athletes,
  COUNT(res.id) as total_results,
  MIN(res.season_year) as first_season,
  MAX(res.season_year) as last_season
FROM courses c
JOIN venues v ON v.id = c.venue_id
LEFT JOIN races r ON r.course_id = c.id
LEFT JOIN results res ON res.race_id = r.id
GROUP BY c.id, v.id, v.name, v.city, c.distance_meters, c.xc_time_rating
ORDER BY unique_athletes DESC, v.name;

-- Quick count
SELECT COUNT(*) as total_courses FROM courses;
