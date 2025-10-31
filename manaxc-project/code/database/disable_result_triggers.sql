-- Disable all triggers on results table for bulk import
-- Run this in Supabase SQL Editor BEFORE bulk import

ALTER TABLE results DISABLE TRIGGER trigger_calculate_normalized_time_cs;
ALTER TABLE results DISABLE TRIGGER update_athlete_best_times_trigger;
ALTER TABLE results DISABLE TRIGGER maintain_course_records_trigger;
ALTER TABLE results DISABLE TRIGGER maintain_school_hall_of_fame_trigger;
ALTER TABLE results DISABLE TRIGGER maintain_school_course_records_trigger;

-- Keep the delete trigger active
-- ALTER TABLE results DISABLE TRIGGER remove_course_record_on_delete_trigger;

SELECT 'Result triggers disabled for bulk import' AS status;
