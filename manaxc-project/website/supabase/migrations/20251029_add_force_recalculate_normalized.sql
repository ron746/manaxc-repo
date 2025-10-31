-- Add function to FORCE recalculate ALL normalized times
-- Useful when course difficulty ratings are updated

CREATE OR REPLACE FUNCTION batch_force_recalculate_normalized_times()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Recalculate ALL normalized times (not just NULL/0)
  UPDATE results r
  SET normalized_time_cs = CASE
      WHEN c.difficulty_rating > 0 THEN
          CAST((r.time_cs * 100000.0 / (c.difficulty_rating * (5280.0 / 3.0) * race.distance_meters)) AS INTEGER)
      ELSE NULL
  END
  FROM races race
  JOIN courses c ON race.course_id = c.id
  WHERE r.race_id = race.id
  AND r.time_cs IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION batch_force_recalculate_normalized_times() TO service_role, anon;

COMMENT ON FUNCTION batch_force_recalculate_normalized_times IS 'Force recalculate ALL normalized times - use when course difficulty ratings change';
