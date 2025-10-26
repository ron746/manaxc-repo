-- ManaXC Database Schema - Part 1: Core Tables
-- Run this in Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schools Table
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  short_name TEXT,
  city TEXT,
  state TEXT DEFAULT 'CA',
  league TEXT,
  mascot TEXT,
  colors TEXT[],
  website_url TEXT,
  athletic_net_id TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schools_league ON schools(league);
CREATE INDEX idx_schools_state_city ON schools(state, city);

-- Athletes Table
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  grad_year INTEGER NOT NULL CHECK (grad_year >= 1966 AND grad_year <= 2035),
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  photo_url TEXT,
  bio TEXT,
  slug TEXT UNIQUE,
  athletic_net_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_athletes_school ON athletes(school_id);
CREATE INDEX idx_athletes_grad_year ON athletes(grad_year);
CREATE INDEX idx_athletes_active ON athletes(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_athletes_slug ON athletes(slug);
CREATE INDEX idx_athletes_name ON athletes(name);

-- Auto-generate slug
CREATE OR REPLACE FUNCTION generate_athlete_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug := lower(regexp_replace(
    COALESCE(NEW.first_name, '') || '-' || COALESCE(NEW.last_name, '') || '-' || NEW.grad_year,
    '[^a-z0-9]+', '-', 'gi'
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER athlete_slug_trigger
BEFORE INSERT OR UPDATE ON athletes
FOR EACH ROW
EXECUTE FUNCTION generate_athlete_slug();

-- Courses Table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  venue TEXT,
  distance_meters INTEGER NOT NULL,
  distance_display TEXT,
  difficulty_rating DECIMAL(4,2) CHECK (difficulty_rating >= 1 AND difficulty_rating <= 10),
  elevation_gain_meters INTEGER,
  surface_type TEXT CHECK (surface_type IN ('grass', 'dirt', 'mixed', 'trail', 'paved')),
  terrain_description TEXT,
  course_map_url TEXT,
  athletic_net_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, location)
);

CREATE INDEX idx_courses_difficulty ON courses(difficulty_rating);
CREATE INDEX idx_courses_distance ON courses(distance_meters);
CREATE INDEX idx_courses_name ON courses(name);

-- Meets Table
CREATE TABLE meets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  meet_date DATE NOT NULL,
  season_year INTEGER NOT NULL,
  course_id UUID REFERENCES courses(id),
  host_school_id UUID REFERENCES schools(id),
  meet_type TEXT CHECK (meet_type IN ('invitational', 'dual', 'league', 'championship', 'scrimmage')),
  weather_conditions TEXT,
  temperature_f INTEGER,
  results_url TEXT,
  athletic_net_url TEXT,
  athletic_net_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meets_date ON meets(meet_date DESC);
CREATE INDEX idx_meets_course ON meets(course_id);
CREATE INDEX idx_meets_season ON meets(season_year DESC);
CREATE INDEX idx_meets_athletic_net_id ON meets(athletic_net_id) WHERE athletic_net_id IS NOT NULL;

-- Races Table
CREATE TABLE races (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meet_id UUID NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  division TEXT,
  distance_meters INTEGER NOT NULL,
  athletic_net_id TEXT,
  start_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meet_id, name, gender)
);

CREATE INDEX idx_races_meet ON races(meet_id);
CREATE INDEX idx_races_gender ON races(gender);

-- Success message
SELECT 'Core tables created successfully!' as status;
