# Schema Comparison: Current Project vs. Old Mana-XC

## Overview
Comparing the database schema between:
- **Current Project** (`manaxc-project`): Simplified importer-focused schema
- **Old Mana-XC** (`OLD_Projects/mana-xc`): Full production web app schema

---

## Table Structure Comparison

### Current Project Tables (Simple)
```
schools
  └── athletes
courses (with difficulty_rating)
  └── meets
      └── races
          └── results
```

### Old Mana-XC Tables (Complex)
```
venues (renamed from courses)
  └── courses (venue + distance + layout version)
      └── races
          └── results (with audit trail)
              └── result_disputes
              └── result_corrections

schools
  └── athletes (with seasonal PRs)
      └── athlete_seasonal_prs
      └── pr_recalc_queue

admin_log
maturation_curves
course_rating_defaults
difficulty_presets (NEW - what we just proposed!)
```

---

## Detailed Field Comparison

### 1. SCHOOLS Table

| Field | Current Project | Old Mana-XC | Notes |
|-------|----------------|-------------|-------|
| id | UUID | INTEGER | Current uses UUID |
| name | ✓ | ✓ | Same |
| short_name | ✓ | ✓ | Same |
| city | ✓ | ✓ | Same |
| state | ✓ | ✓ | Same |
| ath_net_id | ✓ | ✓ (renamed athletic_net_id) | Both track Athletic.net ID |
| cif_division | ✗ | ✓ | Old has CIF division tracking |
| competitive_level_id | ✗ | ✓ | Old has league hierarchy |
| created_at | ✓ | ✓ | Same |
| updated_at | ✓ | ✓ | Same |

**Old Mana-XC Additions:**
- `cif_division` - Track school division (D1, D2, etc.)
- `competitive_level_id` - Link to leagues/conferences

---

### 2. ATHLETES Table

| Field | Current Project | Old Mana-XC | Notes |
|-------|----------------|-------------|-------|
| id | UUID | INTEGER | Current uses UUID |
| name | ✓ | ✗ | Current has combined name |
| first_name | ✓ | ✓ | Both have |
| last_name | ✓ | ✓ | Both have |
| full_name | ✗ | ✓ | Old has denormalized full name |
| grad_year | ✓ | ✓ (graduation_year) | Both have |
| gender | BOOLEAN | BOOLEAN | Same (but should be string!) |
| school_id | ✓ | ✓ (current_school_id) | Both have |
| ath_net_id | ✓ | ✓ | Both track Athletic.net ID |
| **xc_time_pr_cs** | ✗ | ✓ | **Old denormalizes PR** |
| **xc_time_pr_race_id** | ✗ | ✓ | **Old tracks where PR occurred** |
| name_verified | ✗ | ✓ | Old has verification flag |
| created_at | ✓ | ✓ | Same |
| updated_at | ✓ | ✓ | Same |

**Key Difference:** Old Mana-XC denormalizes PRs for performance!

---

### 3. COURSES/VENUES Table

#### Current Project: COURSES table
```sql
courses (
  id UUID,
  name TEXT,  -- "Crystal Springs | 2.95 Miles"
  location TEXT,
  venue TEXT,
  distance_meters INTEGER,
  difficulty_rating NUMERIC,  -- XC time rating
  elevation_gain_meters INTEGER,
  surface_type TEXT,
  created_at, updated_at
)
```

#### Old Mana-XC: Split into VENUES + COURSES
```sql
venues (  -- Renamed from "courses"
  id INTEGER,
  name TEXT,  -- "Crystal Springs"
  location TEXT,
  city TEXT,
  state TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  surface_type TEXT,
  terrain_description TEXT,
  created_at, updated_at
)

courses (  -- NEW table in old schema
  id INTEGER,
  venue_id INTEGER,  -- FK to venues
  distance_meters INTEGER,

  -- Course versioning
  layout_version TEXT,  -- 'standard', '2024_revised', etc.
  layout_description TEXT,
  active_from DATE,
  active_to DATE,

  -- Characteristics
  elevation_gain_meters INTEGER,
  surface_type TEXT,
  xc_time_rating NUMERIC,  -- Moved from races!

  -- Course records (denormalized)
  boys_course_record_cs INTEGER,
  boys_record_holder_id INTEGER,
  boys_record_date DATE,
  girls_course_record_cs INTEGER,
  girls_record_holder_id INTEGER,
  girls_record_date DATE,

  UNIQUE(venue_id, distance_meters, layout_version)
)
```

**Major Insight:** Old Mana-XC separates venue (physical location) from course (specific distance/layout)!

This is EXACTLY what we just proposed! ✅

---

### 4. MEETS Table

| Field | Current Project | Old Mana-XC | Notes |
|-------|----------------|-------------|-------|
| id | UUID | INTEGER | Current uses UUID |
| name | ✓ | ✓ | Same |
| meet_date | ✓ | ✓ | Same |
| season_year | ✓ | ✓ | Both denormalize season |
| course_id | ✓ | ✗ | Current links to course |
| athletic_net_id | ✓ | ✓ | Both track Athletic.net ID |
| host_school_id | ✗ | ✗ (REMOVED) | Old removed as "rarely known" |
| created_at | ✓ | ✓ | Same |
| updated_at | ✓ | ✓ | Same |

**Old Mana-XC Change:** Removed `host_school_id` because it was rarely known and not useful.

---

### 5. RACES Table

| Field | Current Project | Old Mana-XC | Notes |
|-------|----------------|-------------|-------|
| id | UUID | INTEGER | Current uses UUID |
| meet_id | ✓ | ✓ | Same |
| course_id | ✓ | ✓ | Both link to course |
| name | ✓ | ✓ | Same (Varsity, JV, etc.) |
| gender | STRING | STRING | Same |
| division | ✓ | ✓ | Same |
| distance_meters | ✓ | ✓ | Same |
| **xc_time_rating** | ✗ | ✗ | **Both moved to courses!** |
| total_participants | ✓ | ✗ | Current denormalizes count |
| athletic_net_id | ✓ | ✓ | Both track Athletic.net ID |
| created_at | ✓ | ✓ | Same |
| updated_at | ✓ | ✓ | Same |

**Key Change:** Old Mana-XC moved `xc_time_rating` from races → courses (more correct!)

---

### 6. RESULTS Table

#### Current Project: Simple
```sql
results (
  id UUID,
  athlete_id UUID,
  race_id UUID,
  time_cs INTEGER,  -- Centiseconds
  place_overall INTEGER,
  season_year INTEGER,  -- Denormalized
  created_at, updated_at
)
```

#### Old Mana-XC: Audit Trail
```sql
results (
  id INTEGER,
  athlete_id INTEGER,
  race_id INTEGER,
  time_cs INTEGER,
  place_overall INTEGER,
  season_year INTEGER,

  -- Verification flags
  official BOOLEAN,
  verified_by_coach BOOLEAN,
  verified_by_timer BOOLEAN,
  disputed BOOLEAN,

  -- Original values (before corrections)
  orig_athlete_id INTEGER,
  orig_time_cs INTEGER,
  orig_place_overall INTEGER,

  -- Audit trail
  modified_by_user_id UUID,
  modification_date TIMESTAMP,
  modification_reason TEXT,
  verified_by_user_id UUID,
  verification_date TIMESTAMP,

  created_at, updated_at
)
```

**Major Difference:** Old Mana-XC tracks corrections and disputes!

---

## Additional Tables in Old Mana-XC (Not in Current)

### 1. **athlete_seasonal_prs** ⭐
```sql
CREATE TABLE athlete_seasonal_prs (
  athlete_id INTEGER,
  season_year INTEGER,
  xc_time_pr_cs INTEGER,
  xc_time_pr_race_id INTEGER,
  updated_at TIMESTAMP,
  UNIQUE(athlete_id, season_year)
);
```
**Purpose:** Track best time per season for rankings and year-over-year comparison

### 2. **pr_recalc_queue**
```sql
CREATE TABLE pr_recalc_queue (
  athlete_id INTEGER PRIMARY KEY,
  queued_at TIMESTAMP
);
```
**Purpose:** Track which athletes need PR recalculation after new results

### 3. **result_disputes**
```sql
CREATE TABLE result_disputes (
  result_id INTEGER,
  dispute_type TEXT,  -- 'wrong_athlete', 'missing_result', etc.
  submitted_by_user_id UUID,
  reason TEXT,
  status TEXT,  -- 'pending', 'approved', 'rejected'
  resolved_at TIMESTAMP,
  ...
);
```
**Purpose:** Allow coaches/athletes to dispute results

### 4. **result_corrections**
```sql
CREATE TABLE result_corrections (
  result_id INTEGER,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  corrected_by_user_id UUID,
  approved_by_user_id UUID,
  ...
);
```
**Purpose:** Track all corrections made to results

### 5. **admin_log**
```sql
CREATE TABLE admin_log (
  admin_user_id UUID,
  action TEXT,
  details JSONB,
  created_at TIMESTAMP
);
```
**Purpose:** Audit trail for admin actions (already in CLAUDE.md)

### 6. **maturation_curves**
```sql
CREATE TABLE maturation_curves (
  gender BOOLEAN,
  grade INTEGER,
  adjustment_factor NUMERIC
);
```
**Purpose:** Age-based prediction adjustments (from CLAUDE.md)

### 7. **course_rating_defaults**
```sql
CREATE TABLE course_rating_defaults (
  venue_id INTEGER,
  distance_meters INTEGER,
  default_rating NUMERIC
);
```
**Purpose:** Starting point ratings for new courses

### 8. **competitive_levels**
```sql
CREATE TABLE competitive_levels (
  id SERIAL PRIMARY KEY,
  name TEXT,
  level_type TEXT,  -- 'CIF Division', 'League', etc.
  parent_id INTEGER
);
```
**Purpose:** CIF/league hierarchy

---

## Key Learnings from Old Mana-XC

### ✅ Good Ideas We Should Adopt

1. **Venue/Course Split**
   - Separate physical location (venue) from specific course (distance + layout)
   - Allows course versioning (layout changes over time)
   - Cleaner data model

2. **xc_time_rating in Courses (not Races)**
   - More correct placement
   - Course difficulty is property of course, not race

3. **Denormalized PRs**
   - `athletes.xc_time_pr_cs` for quick queries
   - `athlete_seasonal_prs` for rankings
   - Huge performance benefit

4. **Audit Trail**
   - `official`, `disputed`, `verified` flags
   - Original values preserved
   - Modification tracking

5. **Course Records**
   - Denormalized in courses table
   - Fast lookups for records

6. **Seasonal PRs Table**
   - Essential for year-over-year comparison
   - Powers "most improved" features

### ⚠️ Things to Reconsider

1. **INTEGER vs UUID IDs**
   - Old uses INTEGER (auto-increment)
   - Current uses UUID
   - **Trade-off:** UUIDs better for distributed systems, INTEGERs smaller/faster

2. **Gender as BOOLEAN**
   - Both use BOOLEAN (true=male, false=female)
   - **Better:** Use STRING ('M', 'F', 'X') for inclusivity

3. **host_school_id**
   - Old removed it as "rarely known"
   - **Maybe keep** if Athletic.net provides it

4. **Complex Dispute System**
   - Full dispute/correction tables
   - **Maybe overkill** for v1.0, add later

---

## Recommended Schema for Current Project

### Phase 1: Core Import (Now)
```sql
venues (physical locations)
  └── courses (venue + distance + difficulty)
      └── races
          └── results

schools
  └── athletes

difficulty_presets (Easy, Moderate, Hard, etc.)
course_rating_history (log all changes)
```

### Phase 2: Performance (After Import Works)
```sql
+ athlete_seasonal_prs (for rankings)
+ materialized view: athlete_xc_times_v3
+ denormalized: athletes.xc_time_pr_cs
+ denormalized: courses.boys_course_record_cs, girls_course_record_cs
```

### Phase 3: Data Quality (After Web Pages Work)
```sql
+ admin_log (audit trail)
+ results: official, disputed, verified flags
+ results: orig_athlete_id, orig_time_cs (track corrections)
```

### Phase 4: Advanced Features (Future)
```sql
+ result_disputes
+ result_corrections
+ pr_recalc_queue
+ maturation_curves
+ competitive_levels
```

---

## Migration Path

### Step 1: Adopt venue/course split (DONE)
- Created `create_venue_table.sql`
- Matches old Mana-XC design ✅

### Step 2: Move difficulty_rating to courses
- Update schema to put rating in courses, not races
- Matches old Mana-XC improvement ✅

### Step 3: Add difficulty_presets (DONE)
- Created presets for Fast/Easy/Moderate/Hard/Slow
- New idea, not in old Mana-XC ✅

### Step 4: Add course_rating_history (DONE)
- Created logging system
- New idea, not in old Mana-XC ✅

### Step 5: Import single race correctly
- Perfect the parsing
- Clean data import

### Step 6: Add seasonal PRs
- Copy from old Mana-XC design
- Essential for rankings

### Step 7: Add denormalized PRs
- Copy from old Mana-XC design
- Performance optimization

---

## Conclusion

**Old Mana-XC had many great ideas:**
1. ✅ Venue/course split (we adopted!)
2. ✅ Difficulty in courses not races (we should adopt)
3. ✅ Seasonal PRs table (adopt in phase 2)
4. ✅ Denormalized PRs (adopt in phase 2)
5. ✅ Course records denormalized (adopt in phase 2)
6. ⚠️ Audit trail (maybe phase 3)
7. ⚠️ Dispute system (maybe phase 4)

**Our new ideas (not in old Mana-XC):**
1. ✅ difficulty_presets table (Easy/Moderate/Hard)
2. ✅ course_rating_history (audit trail for ratings)
3. ✅ Admin-guided import with verification steps

**Best of both worlds:**
- Old Mana-XC: Proven schema for performance
- Current project: Simpler, admin-friendly import
- Combine: Start simple, add complexity as needed

