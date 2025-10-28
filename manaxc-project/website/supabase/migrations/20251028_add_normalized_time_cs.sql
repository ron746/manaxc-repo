-- Add normalized_time_cs column to results table
-- This stores the per-mile pace normalized by difficulty for easy comparison
-- Formula: time_cs / course_difficulty / distance_meters * 1609.344

-- Step 1: Add the column
ALTER TABLE results ADD COLUMN IF NOT EXISTS normalized_time_cs INTEGER;

-- Step 2: Create an index for performance
CREATE INDEX IF NOT EXISTS idx_results_normalized_time_cs ON results(normalized_time_cs);

-- Step 3: Calculate normalized_time_cs for all existing results
-- This may take a while for large datasets
UPDATE results r
SET normalized_time_cs = ROUND(
  (r.time_cs::numeric / NULLIF(c.difficulty_rating, 0) / NULLIF(c.distance_meters, 0) * 1609.344)::numeric
)::integer
FROM races ra
JOIN courses c ON ra.course_id = c.id
WHERE r.race_id = ra.id
  AND c.difficulty_rating > 0
  AND c.distance_meters > 0
  AND r.time_cs > 0;

-- Step 4: Create a function to automatically calculate normalized_time_cs on insert/update
CREATE OR REPLACE FUNCTION calculate_normalized_time_cs()
RETURNS TRIGGER AS $$
DECLARE
  v_difficulty NUMERIC;
  v_distance NUMERIC;
BEGIN
  -- Get course difficulty and distance from the race
  SELECT c.difficulty_rating, c.distance_meters
  INTO v_difficulty, v_distance
  FROM races r
  JOIN courses c ON r.course_id = c.id
  WHERE r.id = NEW.race_id;

  -- Calculate normalized time if we have valid data
  IF v_difficulty > 0 AND v_distance > 0 AND NEW.time_cs > 0 THEN
    NEW.normalized_time_cs := ROUND(
      (NEW.time_cs::numeric / v_difficulty / v_distance * 1609.344)::numeric
    )::integer;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to automatically calculate on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_normalized_time_cs ON results;
CREATE TRIGGER trigger_calculate_normalized_time_cs
  BEFORE INSERT OR UPDATE OF time_cs, race_id
  ON results
  FOR EACH ROW
  EXECUTE FUNCTION calculate_normalized_time_cs();

-- Step 6: Add comment to document the column
COMMENT ON COLUMN results.normalized_time_cs IS
  'Normalized per-mile pace in centiseconds, adjusted for course difficulty. ' ||
  'Formula: time_cs / difficulty_rating / distance_meters * 1609.344. ' ||
  'Allows fair comparison of performances across different courses.';
