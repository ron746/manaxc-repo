# Database Schema - Mana XC

**Database:** PostgreSQL 15+ (via Supabase)  
**Version:** 1.0 (MVP)  
**Last Updated:** October 22, 2025

---

## Schema Overview

```
schools (1) ←──→ (many) athletes
athletes (1) ←──→ (many) results
courses (1) ←──→ (many) meets
meets (1) ←──→ (many) results
athletes (1) ←──→ (many) personal_records
```

---

## Core Tables

### `schools`
**Purpose:** Store high school information

```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT, -- e.g., "Westmont" vs "Westmont High School"
  city TEXT,
  state TEXT DEFAULT 'CA',
  league TEXT, -- e.g., "WCAL", "PAL"
  mascot TEXT,
  colors TEXT[], -- e.g., ['blue', 'gold']
  website_url TEXT,
  athletic_net_id TEXT, -- For scraping reference
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_schools_league ON schools(league);
CREATE INDEX idx_schools_state_city ON schools(state, city);

-- Sample data
INSERT INTO schools (name, short_name, city, state, league) VALUES
('Westmont High School', 'Westmont', 'Campbell', 'CA', 'WCAL');
```

**Notes:**
- Start with just Westmont for MVP
- Will expand to WCAL teams in Phase 2

---

### `athletes`
**Purpose:** Store athlete profiles

```sql
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  grad_year INTEGER NOT NULL CHECK (grad_year >= 2020 AND grad_year <= 2035),
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  photo_url TEXT,
  bio TEXT,
  slug TEXT UNIQUE, -- URL-friendly name, e.g., "sarah-johnson-2026"
  athletic_net_id TEXT, -- For scraping reference
  is_active BOOLEAN DEFAULT TRUE, -- FALSE for graduated athletes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_athletes_school ON athletes(school_id);
CREATE INDEX idx_athletes_grad_year ON athletes(grad_year);
CREATE INDEX idx_athletes_active ON athletes(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_athletes_slug ON athletes(slug);

-- Generate slug automatically
CREATE OR REPLACE FUNCTION generate_athlete_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := lower(regexp_replace(
    NEW.first_name || '-' || NEW.last_name || '-' || NEW.grad_year,
    '[^a-z0-9]+', '-', 'gi'
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER athlete_slug_trigger
BEFORE INSERT OR UPDATE ON athletes
FOR EACH ROW
EXECUTE FUNCTION generate_athlete_slug();
```

**Notes:**
- `slug` used for SEO-friendly URLs: `/athlete/sarah-johnson-2026`
- `is_active` allows soft-delete (preserve records of graduated athletes)

---

### `courses`
**Purpose:** Store cross country course information

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- e.g., "Crystal Springs 5K"
  location TEXT, -- e.g., "Belmont, CA"
  venue TEXT, -- e.g., "Crystal Springs Golf Course"
  distance_meters INTEGER NOT NULL, -- 5000 for 5K, 4828 for 3 mile
  distance_display TEXT, -- "5K", "3 mile"
  difficulty_rating DECIMAL(12,9) CHECK (difficulty_rating >= 1.0 AND difficulty_rating <= 2.0), -- Most XC courses: 1.10-1.25
  elevation_gain_meters INTEGER,
  surface_type TEXT, -- 'grass', 'dirt', 'mixed', 'trail'
  terrain_description TEXT, -- "Flat and fast", "Rolling hills", "Very hilly"
  course_map_url TEXT, -- Link to course map
  athletic_net_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, location)
);

-- Indexes
CREATE INDEX idx_courses_difficulty ON courses(difficulty_rating);
CREATE INDEX idx_courses_distance ON courses(distance_meters);

-- Sample courses
INSERT INTO courses (name, location, venue, distance_meters, distance_display, difficulty_rating, elevation_gain_meters, surface_type, terrain_description) VALUES
('Crystal Springs 5K', 'Belmont, CA', 'Crystal Springs Golf Course', 5000, '5K', 1.177163037, 150, 'grass', 'Rolling hills with moderate elevation changes'),
('Baylands 5K', 'Sunnyvale, CA', 'Baylands Park', 5000, '5K', 1.1298165, 20, 'mixed', 'Flat and fast on paved paths and grass'),
('Toro Park 3 Mile', 'Salinas, CA', 'Toro Regional Park', 4828, '3 mile', 1.18, 120, 'dirt', 'Rolling hills on dirt trails');
```

**Notes:**
- Difficulty rating represents how much harder the course is than a track mile
  - 1.0 = Track mile (theoretical baseline)
  - Most XC courses: 1.10-1.25
  - Based on pace per meter accounting for: elevation gain, terrain type, typical times
- Will start with ~50 California courses

---

### `meets`
**Purpose:** Store meet/race information

```sql
CREATE TABLE meets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- e.g., "WCAL Championships 2024"
  meet_date DATE NOT NULL,
  course_id UUID REFERENCES courses(id),
  season_year INTEGER NOT NULL, -- 2024, 2025, etc.
  meet_type TEXT, -- 'invitational', 'dual', 'league', 'championship'
  host_school_id UUID REFERENCES schools(id),
  weather_conditions TEXT, -- 'sunny', 'rainy', 'windy', etc.
  temperature_f INTEGER,
  results_url TEXT, -- Link to official results
  athletic_net_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_meets_date ON meets(meet_date DESC);
CREATE INDEX idx_meets_course ON meets(course_id);
CREATE INDEX idx_meets_season ON meets(season_year DESC);

-- Sample meet
INSERT INTO meets (name, meet_date, course_id, season_year, meet_type) VALUES
('WCAL Championships 2024', '2024-11-02', 
  (SELECT id FROM courses WHERE name = 'Crystal Springs 5K'),
  2024, 'championship');
```

---

### `results`
**Purpose:** Store individual race results

```sql
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  meet_id UUID NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  time_seconds INTEGER NOT NULL CHECK (time_seconds > 0), -- Store as seconds (e.g., 19:30 = 1170)
  standardized_mile_seconds INTEGER, -- Calculated by algorithm
  place_overall INTEGER CHECK (place_overall > 0),
  place_team INTEGER CHECK (place_team > 0),
  place_gender INTEGER CHECK (place_gender > 0),
  scored BOOLEAN DEFAULT TRUE, -- Did this result count for team score?
  is_pr BOOLEAN DEFAULT FALSE, -- Was this a personal record when set?
  notes TEXT, -- e.g., "Paced teammate", "Sick", "Injured"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, meet_id) -- One result per athlete per meet
);

-- Indexes
CREATE INDEX idx_results_athlete ON results(athlete_id);
CREATE INDEX idx_results_meet ON results(meet_id);
CREATE INDEX idx_results_time ON results(time_seconds);
CREATE INDEX idx_results_standardized ON results(standardized_mile_seconds);

-- Function to check if result is a PR
CREATE OR REPLACE FUNCTION check_if_pr()
RETURNS TRIGGER AS $$
DECLARE
  previous_best INTEGER;
BEGIN
  -- Get athlete's previous best time for this distance
  SELECT MIN(r.time_seconds) INTO previous_best
  FROM results r
  JOIN meets m ON r.meet_id = m.id
  JOIN courses c ON m.course_id = c.id
  WHERE r.athlete_id = NEW.athlete_id
    AND c.distance_meters = (SELECT distance_meters FROM courses WHERE id = (SELECT course_id FROM meets WHERE id = NEW.meet_id))
    AND r.id != NEW.id;
  
  -- If this is the best time, it's a PR
  IF previous_best IS NULL OR NEW.time_seconds < previous_best THEN
    NEW.is_pr := TRUE;
  ELSE
    NEW.is_pr := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER result_pr_trigger
BEFORE INSERT OR UPDATE ON results
FOR EACH ROW
EXECUTE FUNCTION check_if_pr();
```

**Time Storage Notes:**
- Store as seconds (INTEGER) for easy math
- Display as MM:SS in UI (e.g., 1170 seconds → "19:30")
- Never store as strings (prevents sorting/comparison)

---

### `personal_records`
**Purpose:** Cache best times for fast lookups

```sql
CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  distance_meters INTEGER NOT NULL, -- 5000, 4828, etc.
  time_seconds INTEGER NOT NULL,
  standardized_mile_seconds INTEGER,
  result_id UUID REFERENCES results(id) ON DELETE SET NULL, -- Link to the race where PR was set
  meet_id UUID REFERENCES meets(id),
  course_id UUID REFERENCES courses(id),
  set_date DATE NOT NULL,
  season_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, distance_meters, season_year) -- One PR per distance per season
);

-- Indexes
CREATE INDEX idx_pr_athlete ON personal_records(athlete_id);
CREATE INDEX idx_pr_distance ON personal_records(distance_meters);
CREATE INDEX idx_pr_season ON personal_records(season_year);

-- Materialized view for all-time PRs (refresh periodically)
CREATE MATERIALIZED VIEW athlete_all_time_prs AS
SELECT DISTINCT ON (athlete_id, distance_meters)
  athlete_id,
  distance_meters,
  time_seconds,
  standardized_mile_seconds,
  result_id,
  set_date
FROM personal_records
ORDER BY athlete_id, distance_meters, time_seconds ASC;

CREATE UNIQUE INDEX idx_all_time_prs ON athlete_all_time_prs(athlete_id, distance_meters);
```

**Notes:**
- Denormalized for speed (faster than querying MIN(time) from results)
- Separate PRs for season vs. all-time
- Refresh materialized view after importing new results

---

## Supporting Tables

### `users` (Supabase Auth)
**Purpose:** Authentication for coaches

```sql
-- This is managed by Supabase Auth, but we reference it
-- No need to create manually

-- Link coaches to schools
CREATE TABLE coach_schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'coach' CHECK (role IN ('head_coach', 'assistant_coach', 'coach')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, school_id)
);

CREATE INDEX idx_coach_schools_user ON coach_schools(user_id);
```

**Notes:**
- For MVP, Ron is the only user
- Phase 2: Add multiple coaches per school

---

## Views for Common Queries

### `athlete_season_stats`
**Purpose:** Pre-calculate season statistics

```sql
CREATE VIEW athlete_season_stats AS
SELECT 
  a.id as athlete_id,
  a.name,
  a.school_id,
  m.season_year,
  COUNT(r.id) as total_races,
  MIN(r.time_seconds) as season_best_time,
  AVG(r.time_seconds) as average_time,
  MIN(r.standardized_mile_seconds) as season_best_standardized,
  -- Most improved calculation
  (
    SELECT time_seconds 
    FROM results r2 
    JOIN meets m2 ON r2.meet_id = m2.id 
    WHERE r2.athlete_id = a.id AND m2.season_year = m.season_year 
    ORDER BY m2.meet_date ASC 
    LIMIT 1
  ) as first_race_time,
  -- Improvement percentage
  CASE 
    WHEN (
      SELECT time_seconds 
      FROM results r2 
      JOIN meets m2 ON r2.meet_id = m2.id 
      WHERE r2.athlete_id = a.id AND m2.season_year = m.season_year 
      ORDER BY m2.meet_date ASC 
      LIMIT 1
    ) > 0 THEN
      (
        (
          SELECT time_seconds 
          FROM results r2 
          JOIN meets m2 ON r2.meet_id = m2.id 
          WHERE r2.athlete_id = a.id AND m2.season_year = m.season_year 
          ORDER BY m2.meet_date ASC 
          LIMIT 1
        ) - MIN(r.time_seconds)
      )::FLOAT / 
      (
        SELECT time_seconds 
        FROM results r2 
        JOIN meets m2 ON r2.meet_id = m2.id 
        WHERE r2.athlete_id = a.id AND m2.season_year = m.season_year 
        ORDER BY m2.meet_date ASC 
        LIMIT 1
      )::FLOAT * 100
    ELSE 0
  END as improvement_percentage
FROM athletes a
JOIN results r ON a.id = r.athlete_id
JOIN meets m ON r.meet_id = m.id
WHERE a.is_active = TRUE
GROUP BY a.id, a.name, a.school_id, m.season_year;
```

---

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view athlete profiles)
CREATE POLICY "Public read access" ON athletes
  FOR SELECT USING (TRUE);

CREATE POLICY "Public read access" ON results
  FOR SELECT USING (TRUE);

CREATE POLICY "Public read access" ON meets
  FOR SELECT USING (TRUE);

CREATE POLICY "Public read access" ON courses
  FOR SELECT USING (TRUE);

-- Coaches can modify their school's data
CREATE POLICY "Coaches can update their athletes" ON athletes
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM coach_schools WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can manage results" ON results
  FOR ALL USING (
    athlete_id IN (
      SELECT id FROM athletes WHERE school_id IN (
        SELECT school_id FROM coach_schools WHERE user_id = auth.uid()
      )
    )
  );
```

**Notes:**
- All data is publicly readable (like Athletic.net)
- Only authenticated coaches can modify data
- Protects against unauthorized edits

---

## Utility Functions

### Format Time (Seconds → MM:SS)
```sql
CREATE OR REPLACE FUNCTION format_time(seconds INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN LPAD((seconds / 60)::TEXT, 2, '0') || ':' || LPAD((seconds % 60)::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Usage: SELECT format_time(1170); -- Returns "19:30"
```

### Parse Time (MM:SS → Seconds)
```sql
CREATE OR REPLACE FUNCTION parse_time(time_str TEXT)
RETURNS INTEGER AS $$
DECLARE
  parts TEXT[];
BEGIN
  parts := STRING_TO_ARRAY(time_str, ':');
  RETURN (parts[1]::INTEGER * 60) + parts[2]::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Usage: SELECT parse_time('19:30'); -- Returns 1170
```

---

## Data Migration Plan

### Phase 1: Initial Setup (Day 2)
1. Create all tables
2. Set up RLS policies
3. Create indexes
4. Insert Westmont school record

### Phase 2: Course Data (Day 3-4)
1. Import ~50 California XC courses
2. Manually set difficulty ratings (with Ron's input)

### Phase 3: Westmont Historical Data (Day 4-5)
1. Scrape Athletic.net (2022-2025)
2. Import athletes, meets, results
3. Calculate standardized times
4. Generate personal records

### Phase 4: Validation (Day 5)
1. Verify data integrity
2. Check for duplicates
3. Validate time ranges (no 5-minute 5Ks)
4. Ron reviews sample athlete profiles

---

## Database Backup Strategy

**Supabase Auto-Backups:**
- Daily backups (included in free tier)
- 7-day retention
- Point-in-time recovery

**Manual Exports:**
- Weekly CSV export to Google Drive (redundancy)
- Export scripts in `/code/backend/scripts/`

---

## Performance Optimization

**Expected Data Volume (MVP):**
- Schools: 1 (Westmont)
- Athletes: ~40 current + ~60 graduated = 100 total
- Courses: ~50
- Meets: ~60 (4 years × ~15 meets/year)
- Results: ~1,000 (60 meets × ~17 athletes avg)

**Scaling (Phase 2 - All WCAL):**
- Schools: 8
- Athletes: ~800
- Results: ~8,000

**Scaling (Phase 3 - California):**
- Schools: 500+
- Athletes: 50,000+
- Results: 500,000+

**Optimization Strategies:**
- Materialized views for expensive queries
- Denormalized data (PRs, season stats)
- Indexes on all foreign keys
- Partition `results` table by season_year (if >1M rows)

---

**Last Updated:** October 22, 2025  
**Schema Version:** 1.0 (MVP)  
**Next Review:** Day 2 (October 23, 2025) when setting up Supabase
