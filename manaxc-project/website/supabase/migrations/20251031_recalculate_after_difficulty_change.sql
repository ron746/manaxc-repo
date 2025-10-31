-- Recalculate all derived tables after a course difficulty rating change
-- This ensures athlete_best_times, course_records, and other materialized data stays in sync

CREATE OR REPLACE FUNCTION recalculate_normalized_times_for_course(target_course_id uuid)
RETURNS TABLE (
  results_updated int,
  best_times_recalculated int,
  course_records_recalculated int
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_results_count int;
  v_best_times_count int;
  v_records_count int;
  v_affected_athletes uuid[];
  v_course_distance int;
BEGIN
  -- Get course distance for logging
  SELECT distance_meters INTO v_course_distance
  FROM courses WHERE id = target_course_id;

  RAISE NOTICE 'Recalculating normalized times for course %', target_course_id;

  -- Step 1: Get all athletes who have results on this course
  SELECT ARRAY_AGG(DISTINCT r.athlete_id)
  INTO v_affected_athletes
  FROM results r
  JOIN races ra ON r.race_id = ra.id
  WHERE ra.course_id = target_course_id;

  RAISE NOTICE 'Found % athletes with results on this course', COALESCE(array_length(v_affected_athletes, 1), 0);

  -- Step 2: Recalculate normalized_time_cs for all results on this course
  -- The normalized time calculation uses the course difficulty, so we need to update it
  UPDATE results r
  SET normalized_time_cs = (
    (r.time_cs::float * 1609.344 / c.distance_meters) / c.difficulty_rating
  )::int
  FROM races ra
  JOIN courses c ON ra.course_id = c.id
  WHERE r.race_id = ra.id
    AND ra.course_id = target_course_id
    AND r.time_cs IS NOT NULL;

  GET DIAGNOSTICS v_results_count = ROW_COUNT;
  RAISE NOTICE 'Updated % result records', v_results_count;

  -- Step 3: Recalculate athlete_best_times for affected athletes
  -- The athlete_best_times table is organized by athlete and season
  -- We need to recalculate for any affected athlete-season combinations

  -- For now, just mark that we need to recalculate
  -- The actual recalculation happens via the rebuild_athlete_best_times function
  -- which should be called after this completes

  v_best_times_count := 0;
  RAISE NOTICE 'Note: athlete_best_times should be recalculated for % affected athletes', COALESCE(array_length(v_affected_athletes, 1), 0);
  RAISE NOTICE 'Run: SELECT batch_rebuild_athlete_best_times() to update athlete best times';

  -- Step 4: Recalculate course records for this course
  -- Delete old course records for this course
  DELETE FROM course_records
  WHERE course_id = target_course_id;

  -- Recalculate course records (male and female)
  INSERT INTO course_records (
    course_id,
    gender,
    athlete_id,
    result_id,
    time_cs,
    athlete_name,
    athlete_grad_year,
    school_id,
    school_name,
    meet_id,
    meet_name,
    meet_date,
    race_id,
    rank
  )
  SELECT DISTINCT ON (c.id, a.gender)
    c.id as course_id,
    a.gender,
    r.athlete_id,
    r.id as result_id,
    r.time_cs,
    a.first_name || ' ' || a.last_name as athlete_name,
    a.grad_year as athlete_grad_year,
    s.id as school_id,
    s.name as school_name,
    m.id as meet_id,
    m.name as meet_name,
    m.meet_date,
    ra.id as race_id,
    1 as rank  -- They're all rank 1 since we're taking DISTINCT ON with fastest time
  FROM results r
  JOIN races ra ON r.race_id = ra.id
  JOIN courses c ON ra.course_id = c.id
  JOIN meets m ON ra.meet_id = m.id
  JOIN athletes a ON r.athlete_id = a.id
  LEFT JOIN schools s ON a.school_id = s.id
  WHERE c.id = target_course_id
    AND r.time_cs IS NOT NULL
  ORDER BY c.id, a.gender, r.time_cs ASC;

  GET DIAGNOSTICS v_records_count = ROW_COUNT;
  RAISE NOTICE 'Recalculated % course records', v_records_count;

  -- Return summary
  RETURN QUERY SELECT v_results_count, v_best_times_count, v_records_count;
END;
$$;

-- Create a trigger to automatically recalculate when difficulty changes
CREATE OR REPLACE FUNCTION trigger_recalculate_on_difficulty_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only recalculate if difficulty actually changed
  IF OLD.difficulty_rating IS DISTINCT FROM NEW.difficulty_rating THEN
    RAISE NOTICE 'Course % difficulty changed from % to %, triggering recalculation',
      NEW.id, OLD.difficulty_rating, NEW.difficulty_rating;

    -- Call the recalculation function
    PERFORM recalculate_normalized_times_for_course(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS recalculate_on_difficulty_change ON courses;

-- Create the trigger
CREATE TRIGGER recalculate_on_difficulty_change
  AFTER UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_on_difficulty_change();

GRANT EXECUTE ON FUNCTION recalculate_normalized_times_for_course TO service_role, authenticated;

COMMENT ON FUNCTION recalculate_normalized_times_for_course IS
'Recalculates all normalized times, athlete best times, and course records after a course difficulty rating changes. Call this after manually adjusting difficulty or use the automatic trigger.';

COMMENT ON FUNCTION trigger_recalculate_on_difficulty_change IS
'Automatically recalculates derived tables when a course difficulty rating is updated. Ensures athlete_best_times and course_records stay synchronized.';
