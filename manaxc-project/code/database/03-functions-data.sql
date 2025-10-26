-- ManaXC Database Schema - Part 3: Functions and Sample Data
-- Run this AFTER Part 2 (02-results-migration.sql)

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Format centiseconds to display time (117045 → "19:30.45")
CREATE OR REPLACE FUNCTION format_time_cs(cs INTEGER)
RETURNS TEXT AS $$
DECLARE
  total_seconds INTEGER;
  minutes INTEGER;
  seconds INTEGER;
  centis INTEGER;
BEGIN
  IF cs IS NULL OR cs <= 0 THEN
    RETURN NULL;
  END IF;

  total_seconds := cs / 100;
  minutes := total_seconds / 60;
  seconds := total_seconds % 60;
  centis := cs % 100;

  RETURN LPAD(minutes::TEXT, 2, '0') || ':' ||
         LPAD(seconds::TEXT, 2, '0') || '.' ||
         LPAD(centis::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Parse time string to centiseconds ("19:30.45" → 117045)
CREATE OR REPLACE FUNCTION parse_time_to_cs(time_str TEXT)
RETURNS INTEGER AS $$
DECLARE
  parts TEXT[];
  time_parts TEXT[];
  minutes INTEGER;
  seconds INTEGER;
  centiseconds INTEGER;
BEGIN
  IF time_str IS NULL OR time_str = '' THEN
    RETURN NULL;
  END IF;

  parts := STRING_TO_ARRAY(time_str, ':');
  IF array_length(parts, 1) < 2 THEN
    RETURN NULL;
  END IF;

  minutes := parts[1]::INTEGER;
  time_parts := STRING_TO_ARRAY(parts[2], '.');
  seconds := time_parts[1]::INTEGER;
  centiseconds := COALESCE(time_parts[2]::INTEGER, 0);

  RETURN (minutes * 60 * 100) + (seconds * 100) + centiseconds;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Test time functions
DO $$
BEGIN
  ASSERT format_time_cs(117045) = '19:30.45', 'format_time_cs failed';
  ASSERT parse_time_to_cs('19:30.45') = 117045, 'parse_time_to_cs failed';
  RAISE NOTICE '✅ Time functions working correctly';
END $$;

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert Westmont High School
INSERT INTO schools (name, short_name, city, state, league, athletic_net_id)
VALUES (
  'Westmont High School',
  'Westmont',
  'Campbell',
  'CA',
  'WCAL',
  '1076'
) ON CONFLICT (name) DO NOTHING;

-- Insert sample courses
INSERT INTO courses (name, location, venue, distance_meters, distance_display, difficulty_rating, elevation_gain_meters, surface_type, terrain_description)
VALUES
  ('Crystal Springs 5K', 'Belmont, CA', 'Crystal Springs Golf Course', 5000, '5K', 8.0, 150, 'grass', 'Very hilly with significant elevation changes'),
  ('Baylands 5K', 'Sunnyvale, CA', 'Baylands Park', 5000, '5K', 3.0, 20, 'mixed', 'Flat and fast on paved paths and grass'),
  ('Toro Park 3 Mile', 'Salinas, CA', 'Toro Regional Park', 4828, '3 mile', 7.5, 120, 'dirt', 'Rolling hills on dirt trails')
ON CONFLICT (name, location) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_progress ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON schools FOR SELECT USING (TRUE);
CREATE POLICY "Public read access" ON athletes FOR SELECT USING (TRUE);
CREATE POLICY "Public read access" ON courses FOR SELECT USING (TRUE);
CREATE POLICY "Public read access" ON meets FOR SELECT USING (TRUE);
CREATE POLICY "Public read access" ON races FOR SELECT USING (TRUE);
CREATE POLICY "Public read access" ON results FOR SELECT USING (TRUE);

-- Allow inserts (will tighten security later with auth)
CREATE POLICY "Allow inserts" ON result_validations FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow selects" ON result_validations FOR SELECT USING (TRUE);
CREATE POLICY "Allow inserts" ON migration_progress FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Allow selects" ON migration_progress FOR SELECT USING (TRUE);
CREATE POLICY "Allow updates" ON migration_progress FOR UPDATE USING (TRUE);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show created tables
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT '✅ Database setup complete!' as status;
