-- Venue Table Design
-- Venues are physical locations that host courses
-- Example: "Crystal Springs" venue has 2.13mi, 2.95mi, 5K courses

-- 1. Create venues table
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,  -- "Belmont, CA" or "San Jose, CA"
    city TEXT,
    state TEXT DEFAULT 'CA',
    address TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    athletic_net_id INTEGER UNIQUE,  -- For matching scraped data
    surface_type TEXT,  -- "Grass", "Dirt", "Paved", "Mixed"
    terrain_description TEXT,  -- "Hilly", "Flat", "Rolling", "Challenging"
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add venue_id to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_courses_venue_id ON courses(venue_id);

-- 3. Create difficulty estimate lookup table
CREATE TABLE IF NOT EXISTS difficulty_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT UNIQUE NOT NULL,  -- "Easy", "Moderate", "Hard", "Fast", "Average", "Slow"
    difficulty_value NUMERIC NOT NULL,
    description TEXT,
    typical_range_min NUMERIC,  -- Min expected value
    typical_range_max NUMERIC   -- Max expected value
);

-- 4. Insert difficulty presets
INSERT INTO difficulty_presets (label, difficulty_value, description, typical_range_min, typical_range_max)
VALUES
    ('Fast', 0.85, 'Very fast course, significantly easier than track', 0.70, 0.90),
    ('Easy', 0.95, 'Easier than track, mostly flat with minimal obstacles', 0.90, 1.00),
    ('Average', 1.00, 'Similar difficulty to flat track', 0.95, 1.05),
    ('Moderate', 1.10, 'Moderately challenging with some hills or terrain', 1.05, 1.15),
    ('Hard', 1.20, 'Challenging course with significant hills or obstacles', 1.15, 1.30),
    ('Slow', 1.35, 'Very challenging, steep hills or difficult terrain', 1.30, 1.50)
ON CONFLICT (label) DO NOTHING;

-- 5. Example venues (run after cleaning data)
INSERT INTO venues (name, location, city, state, surface_type, terrain_description)
VALUES
    ('Crystal Springs', 'Belmont, CA', 'Belmont', 'CA', 'Grass/Dirt', 'Rolling hills with challenging terrain'),
    ('Montgomery Hill Park', 'San Jose, CA', 'San Jose', 'CA', 'Grass', 'Hilly with steep sections'),
    ('Baylands Park', 'Sunnyvale, CA', 'Sunnyvale', 'CA', 'Paved/Dirt', 'Very flat, fast course'),
    ('Toro Park', 'Salinas, CA', 'Salinas', 'CA', 'Dirt', 'Challenging hills')
ON CONFLICT DO NOTHING;

-- 6. Link existing courses to venues (example - adjust IDs as needed)
-- Run this AFTER creating venues and getting their UUIDs

-- First, get venue IDs:
-- SELECT id, name FROM venues ORDER BY name;

-- Then update courses:
-- UPDATE courses
-- SET venue_id = (SELECT id FROM venues WHERE name = 'Crystal Springs')
-- WHERE name LIKE 'Crystal Springs%';

-- UPDATE courses
-- SET venue_id = (SELECT id FROM venues WHERE name = 'Montgomery Hill Park')
-- WHERE name LIKE 'Montgomery Hill%';

-- UPDATE courses
-- SET venue_id = (SELECT id FROM venues WHERE name = 'Baylands Park')
-- WHERE name LIKE 'Baylands%';

-- 7. View venues with courses
SELECT
    v.name as venue_name,
    v.location,
    v.surface_type,
    v.terrain_description,
    COUNT(c.id) as num_courses,
    ARRAY_AGG(c.name ORDER BY c.distance_meters) as courses
FROM venues v
LEFT JOIN courses c ON c.venue_id = v.id
GROUP BY v.id, v.name, v.location, v.surface_type, v.terrain_description
ORDER BY v.name;
