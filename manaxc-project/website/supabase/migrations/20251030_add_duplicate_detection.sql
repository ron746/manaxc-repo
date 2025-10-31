-- Add batch function to detect duplicate results
-- A duplicate is when the same athlete has multiple results in the same race

CREATE OR REPLACE FUNCTION find_duplicate_results()
RETURNS TABLE (
  race_id UUID,
  race_name TEXT,
  meet_name TEXT,
  athlete_id UUID,
  athlete_name TEXT,
  result_count INTEGER,
  times_cs INTEGER[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.race_id,
    ra.name as race_name,
    m.name as meet_name,
    r.athlete_id,
    a.name as athlete_name,
    COUNT(*)::INTEGER as result_count,
    ARRAY_AGG(r.time_cs ORDER BY r.time_cs) as times_cs
  FROM results r
  JOIN athletes a ON r.athlete_id = a.id
  JOIN races ra ON r.race_id = ra.id
  JOIN meets m ON r.meet_id = m.id
  GROUP BY r.race_id, ra.name, m.name, r.athlete_id, a.name
  HAVING COUNT(*) > 1
  ORDER BY result_count DESC, meet_name, race_name, athlete_name;
END;
$$;

-- Add function to get detailed duplicate info for a specific athlete in a race
CREATE OR REPLACE FUNCTION get_duplicate_result_details(
  p_athlete_id UUID,
  p_race_id UUID
)
RETURNS TABLE (
  result_id UUID,
  time_cs INTEGER,
  place_overall INTEGER,
  data_source TEXT,
  created_at TIMESTAMPTZ,
  is_legacy_data BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id as result_id,
    r.time_cs,
    r.place_overall,
    r.data_source,
    r.created_at,
    r.is_legacy_data
  FROM results r
  WHERE r.athlete_id = p_athlete_id
    AND r.race_id = p_race_id
  ORDER BY r.created_at;
END;
$$;

COMMENT ON FUNCTION find_duplicate_results() IS 'Finds all athletes with multiple results in the same race - run this in batch operations to detect duplicates after imports';
COMMENT ON FUNCTION get_duplicate_result_details(UUID, UUID) IS 'Gets detailed information about duplicate results for manual resolution';
