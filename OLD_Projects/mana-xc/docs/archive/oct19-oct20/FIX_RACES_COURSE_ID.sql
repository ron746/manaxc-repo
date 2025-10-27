-- Fix: races.course_id should be INTEGER to match courses.id (SERIAL)

-- First check current types
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'courses' AND column_name = 'id')
    OR (table_name = 'races' AND column_name = 'course_id'));

-- Drop the old course_id column and recreate with correct type
ALTER TABLE races DROP COLUMN IF EXISTS course_id;
ALTER TABLE races ADD COLUMN course_id INTEGER REFERENCES courses(id);

-- Verify the fix
SELECT
  'After Fix' as status,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'courses' AND column_name = 'id')
    OR (table_name = 'races' AND column_name = 'course_id'))
ORDER BY table_name, column_name;

-- Show current counts (races will still exist but course_id will be NULL)
SELECT 'Races' as table_name, COUNT(*) as count FROM races;
