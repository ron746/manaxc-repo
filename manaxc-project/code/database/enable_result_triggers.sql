-- Re-enable all triggers on results table after bulk import
-- Run this in Supabase SQL Editor AFTER bulk import AND batch updates

ALTER TABLE results ENABLE TRIGGER trigger_calculate_normalized_time_cs;
ALTER TABLE results ENABLE TRIGGER update_athlete_best_times_trigger;
ALTER TABLE results ENABLE TRIGGER maintain_course_records_trigger;
ALTER TABLE results ENABLE TRIGGER maintain_school_hall_of_fame_trigger;
ALTER TABLE results ENABLE TRIGGER maintain_school_course_records_trigger;

SELECT 'Result triggers re-enabled' AS status;
