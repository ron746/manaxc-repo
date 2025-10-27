-- Fix: Change courses.venue_id from INTEGER to UUID to match venues.id

-- First, check if we have any data (we should have some from the 2025 import)
SELECT COUNT(*) as course_count FROM courses;

-- Drop the courses table and recreate with correct UUID type
DROP TABLE IF EXISTS courses CASCADE;

CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,  -- Changed to UUID!
  distance_meters INTEGER NOT NULL,

  -- Course versioning for layout changes over time
  layout_version TEXT DEFAULT 'standard',
  layout_description TEXT,
  active_from DATE,
  active_to DATE,

  -- Course characteristics
  elevation_gain_meters INTEGER,
  surface_type TEXT,
  xc_time_rating NUMERIC(5,3) DEFAULT 1.000,

  -- Course records (per layout version)
  boys_course_record_cs INTEGER,
  boys_record_holder_id INTEGER,
  boys_record_date DATE,
  girls_course_record_cs INTEGER,
  girls_record_holder_id INTEGER,
  girls_record_date DATE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(venue_id, distance_meters, layout_version)
);

CREATE INDEX idx_courses_venue ON courses(venue_id);
CREATE INDEX idx_courses_distance ON courses(distance_meters);
CREATE INDEX idx_courses_rating ON courses(xc_time_rating);

-- Verify it worked
SELECT
  'courses.venue_id type' as check_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'courses' AND column_name = 'venue_id';
