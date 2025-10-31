-- Fix the normalized time formula in batch rebuild function
-- Previous formula was inverted (divided by distance instead of properly scaling)

-- Drop and recreate batch_rebuild_normalized_times with CORRECT formula
DROP FUNCTION IF EXISTS batch_rebuild_normalized_times();

CREATE OR REPLACE FUNCTION batch_rebuild_normalized_times()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- CORRECT FORMULA: time_cs * 1600.0 / (difficulty_rating * distance_meters)
  -- This properly scales times to 1600m equivalent on flat course
  UPDATE results r
  SET normalized_time_cs = CASE
      WHEN c.difficulty_rating > 0 AND race.distance_meters > 0 THEN
          CAST((r.time_cs * 1600.0 / (c.difficulty_rating * race.distance_meters)) AS INTEGER)
      ELSE NULL
  END
  FROM races race
  JOIN courses c ON race.course_id = c.id
  WHERE r.race_id = race.id
  AND (r.normalized_time_cs IS NULL OR r.normalized_time_cs = 0);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Also update any triggers that use this formula
-- Check if there's a trigger on results table for auto-calculating normalized_time_cs
DROP TRIGGER IF EXISTS calculate_normalized_time_trigger ON results;

CREATE OR REPLACE FUNCTION calculate_normalized_time()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_difficulty_rating NUMERIC;
  v_distance_meters INTEGER;
BEGIN
  -- Get course difficulty and race distance
  SELECT c.difficulty_rating, race.distance_meters
  INTO v_difficulty_rating, v_distance_meters
  FROM races race
  JOIN courses c ON race.course_id = c.id
  WHERE race.id = NEW.race_id;

  -- Calculate normalized time using CORRECT formula
  IF v_difficulty_rating > 0 AND v_distance_meters > 0 AND NEW.time_cs IS NOT NULL THEN
    NEW.normalized_time_cs := CAST((NEW.time_cs * 1600.0 / (v_difficulty_rating * v_distance_meters)) AS INTEGER);
  ELSE
    NEW.normalized_time_cs := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_normalized_time_trigger
  BEFORE INSERT OR UPDATE OF time_cs, race_id
  ON results
  FOR EACH ROW
  EXECUTE FUNCTION calculate_normalized_time();

-- Grant permissions
GRANT EXECUTE ON FUNCTION batch_rebuild_normalized_times() TO service_role, anon;
GRANT EXECUTE ON FUNCTION calculate_normalized_time() TO service_role, anon;

-- Add comment documenting the formula
COMMENT ON FUNCTION batch_rebuild_normalized_times() IS
  'Recalculates normalized_time_cs for all results using formula: time_cs * 1600.0 / (difficulty_rating * distance_meters). This converts all race times to equivalent 1600m effort on a flat course for cross-course comparison.';

COMMENT ON FUNCTION calculate_normalized_time() IS
  'Trigger function that auto-calculates normalized_time_cs when a result is inserted/updated. Formula: time_cs * 1600.0 / (difficulty_rating * distance_meters).';
