# ADR-003: Future Enhancement - Venue and Course Separation

**Status:** FUTURE (Not implementing now due to time pressure)
**Date:** October 24, 2025
**Context:** Varsity evaluation needed TODAY

## Decision

**NOW (MVP):** Courses table with optional location/surface fields
**FUTURE:** Separate venues and courses for better data modeling

## The Problem
Currently: "Crystal Springs 5K" mixes venue (Crystal Springs) with distance (5K)

Better model:
- **Venue:** Crystal Springs Regional Park (location, surface, elevation profile)
- **Courses:** Multiple courses at same venue (5K course, 3 mile course, etc.)

## Benefits of Future Separation
1. **Reusability:** One venue, many course configurations
2. **Better data:** Venue has weather, elevation, surface once
3. **Historical tracking:** Venue conditions over time
4. **Meet planning:** "What courses are available at Crystal Springs?"

## Example Future Schema
```sql
-- Future structure (v2.0)
CREATE TABLE venues (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  surface_type TEXT,
  elevation_gain_meters INTEGER,
  weather_api_location TEXT
);

CREATE TABLE courses (
  id UUID PRIMARY KEY,
  venue_id UUID REFERENCES venues(id),
  name TEXT NOT NULL,  -- "5K Loop" or "Championship Course"
  distance_meters INTEGER NOT NULL,
  difficulty_rating DECIMAL(12,9),
  start_location POINT,
  route_map_url TEXT
);
```

## Current Workaround (MVP)
```sql
-- Current structure (v1.0 - what we have now)
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,  -- "Crystal Springs 5K"
  distance_meters INTEGER NOT NULL,
  location TEXT,  -- NULLABLE - optional for now
  surface_type TEXT,  -- NULLABLE - optional for now
  difficulty_rating DECIMAL(12,9)
);
```

## Migration Path (When Ready)
1. Keep current courses table working
2. Add venues table
3. Add venue_id to courses (nullable at first)
4. Migrate data: extract venue from course name
5. Make venue_id required
6. Deprecate location field on courses

## Timeline
- **Today:** Use simple courses table
- **After launch:** Consider venue separation (Month 2-3)
- **Estimate:** 4-6 hours to implement properly

## Why Not Now?
Ron needs varsity evaluation TODAY. This refactor can wait until after MVP launch.

---
**Reminder:** This is a FUTURE enhancement. Do not implement now.
