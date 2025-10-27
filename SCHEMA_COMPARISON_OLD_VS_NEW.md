# Schema Comparison: Old Website vs New Database

## Critical Differences That Require Code Updates

### 1. TIME STORAGE - MAJOR CHANGE ⚠️

**OLD Schema (mana-running):**
- Field: `time_seconds` (INTEGER)
- Format: Seconds only (19:30 = 1170)
- Example: 1170 seconds

**NEW Schema (manaxc):**
- Field: `time_cs` (INTEGER)
- Format: **CENTISECONDS** (19:30.45 = 117045)
- Example: 117045 centiseconds
- Precision: Hundredths of a second (0.01s)

**Impact:** ALL time calculations and displays need updating!
```typescript
// OLD: time_seconds / 60 for minutes
// NEW: time_cs / 6000 for minutes

// OLD: time_seconds % 60 for seconds
// NEW: (time_cs % 6000) / 100 for seconds

// NEW: time_cs % 100 for centiseconds (hundredths)
```

---

### 2. TABLE STRUCTURE CHANGES

#### Athletes Table

| Field | OLD | NEW | Notes |
|-------|-----|-----|-------|
| School relation | `current_school_id` | `school_id` | ✅ Field renamed |
| Graduation year check | >= 2020 | >= 1966 | ✅ Supports historical data |
| Name field | `name` (computed) | `name` + `first_name` + `last_name` | ✅ Same pattern |

#### Results Table - MAJOR CHANGES

| Field | OLD | NEW | Notes |
|-------|-----|-----|-------|
| Time storage | `time_seconds` | `time_cs` | ⚠️ **CRITICAL: Centiseconds!** |
| Standardized time | `standardized_mile_seconds` | `standardized_mile_cs` | ⚠️ Also centiseconds |
| Race relation | Direct `meet_id` | `meet_id` + `race_id` | ✅ NEW: races table |
| **NEW FIELDS** | N/A | `data_source` | ✅ Tracks import source |
| **NEW FIELDS** | N/A | `is_legacy_data` | ✅ Migration flag |
| **NEW FIELDS** | N/A | `is_complete_results` | ✅ Validation flag |
| **NEW FIELDS** | N/A | `validation_status` | ✅ For data quality |

#### Courses Table

| Field | OLD | NEW | Notes |
|-------|-----|-----|-------|
| XC Rating | `xc_time_rating` | NOT IN SCHEMA | ⚠️ Missing normalization field |
| Mile Difficulty | `mile_difficulty` | NOT IN SCHEMA | ⚠️ Missing difficulty multiplier |
| Difficulty | N/A | `difficulty_rating` (1-10) | ✅ NEW: subjective rating |

#### Meets Table

| Field | OLD | NEW | Notes |
|-------|-----|-----|-------|
| Course relation | `course_id` | `course_id` | ✅ Same |
| Season | `season_year` | `season_year` | ✅ Same |

---

### 3. NEW TABLES (Not in Old Schema)

#### `races` Table
**Purpose:** Separate races within meets (e.g., Varsity Boys, Varsity Girls, JV)

```sql
CREATE TABLE races (
  id UUID PRIMARY KEY,
  meet_id UUID REFERENCES meets(id),
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('M', 'F')),
  division TEXT,
  distance_meters INTEGER NOT NULL
);
```

**Impact:** Results now link to `race_id` instead of directly to `meet_id`

#### `result_validations` Table
**Purpose:** Track data quality during migration

```sql
CREATE TABLE result_validations (
  id UUID PRIMARY KEY,
  legacy_result_id UUID REFERENCES results(id),
  new_result_id UUID REFERENCES results(id),
  time_diff_cs INTEGER,
  has_discrepancy BOOLEAN
);
```

#### `migration_progress` Table
**Purpose:** Track which meets have been validated

```sql
CREATE TABLE migration_progress (
  id UUID PRIMARY KEY,
  meet_id UUID REFERENCES meets(id),
  validation_status TEXT,
  completion_percentage DECIMAL(5,2)
);
```

---

### 4. MISSING FEATURES (Old Had, New Doesn't)

#### Views
- ❌ **OLD:** `results_with_details` view (included course difficulty, xc_time_rating)
- ⚠️ **NEW:** No views defined yet

#### RPC Functions
- ❌ **OLD:** `get_school_xc_records(school_id, gender)`
- ❌ **OLD:** `get_school_top10_xc(school_id, gender)`
- ❌ **OLD:** `get_school_course_records(school_id, course_id, gender)`
- ⚠️ **NEW:** No RPC functions defined yet

#### Time Normalization
- ❌ **OLD:** Used `xc_time_rating` and `mile_difficulty` on courses
- ⚠️ **NEW:** Only has `difficulty_rating` (1-10 scale)
- 🤔 **Question:** How do we normalize times across courses?

---

### 5. RELATIONSHIPS MAPPING

#### OLD: Athlete → Results → Meet → Course
```
athletes.id → results.athlete_id
results.meet_id → meets.id
meets.course_id → courses.id
```

#### NEW: Athlete → Results → Race → Meet → Course
```
athletes.id → results.athlete_id
results.race_id → races.id
races.meet_id → meets.id
meets.course_id → courses.id
```

**Impact:** Need extra join through `races` table!

---

## Code Migration Checklist

### Time Conversion Functions Needed

```typescript
// Convert centiseconds to MM:SS.CC format
function formatTime(time_cs: number): string {
  const minutes = Math.floor(time_cs / 6000);
  const seconds = Math.floor((time_cs % 6000) / 100);
  const centis = time_cs % 100;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}

// Convert MM:SS or MM:SS.CC to centiseconds
function parseTime(timeStr: string): number {
  const [min, secAndCenti] = timeStr.split(':');
  const [sec, centi = '00'] = secAndCenti.split('.');
  return parseInt(min) * 6000 + parseInt(sec) * 100 + parseInt(centi);
}

// For pace calculations (per mile)
function calculatePace(time_cs: number, distance_meters: number): string {
  const metersPerMile = 1609.34;
  const pace_cs = (time_cs / distance_meters) * metersPerMile;
  return formatTime(Math.round(pace_cs));
}
```

### Database Query Updates

#### OLD Query (Won't Work):
```typescript
const { data } = await supabase
  .from('results')
  .select(`
    time_seconds,
    place_overall,
    meets (
      meet_date,
      courses (
        name,
        mile_difficulty,
        xc_time_rating
      )
    )
  `)
```

#### NEW Query (Correct):
```typescript
const { data } = await supabase
  .from('results')
  .select(`
    time_cs,
    place_overall,
    races (
      name,
      gender,
      meets (
        meet_date,
        name,
        courses (
          name,
          distance_meters,
          difficulty_rating
        )
      )
    )
  `)
```

---

## Pages That Need Updates

### Athlete Detail Page (`/athletes/[id]/page.tsx`)
- ✅ Update time field: `time_seconds` → `time_cs`
- ✅ Update time formatting functions
- ✅ Add `races` join to queries
- ⚠️ Remove XC normalization (no `xc_time_rating` field)
- ⚠️ Handle optional `race_id` (might be NULL for legacy data)

### School Detail Page (`/schools/[id]/page.tsx`)
- ✅ Update relationship: `current_school_id` → `school_id`
- ✅ Same time conversion issues

### School Records Page (`/schools/[id]/records/page.tsx`)
- ❌ Remove RPC calls (don't exist yet)
- ⚠️ Need to build RPC functions OR compute in TypeScript
- ✅ Update time fields

### School Seasons Page (`/schools/[id]/seasons/page.tsx`)
- ✅ Add `races` table awareness
- ✅ Update time calculations

---

## Missing Functionality to Rebuild

### 1. Course Normalization System
**OLD:** Used `xc_time_rating` multiplier
**NEW:** Need to decide approach:
- Option A: Add `xc_time_rating` field to courses table
- Option B: Calculate dynamically based on historical data
- Option C: Use `difficulty_rating` as proxy

### 2. School Records RPC Functions
Need to create:
- `get_school_xc_records(school_id, gender)` - Best times by grade level
- `get_school_top10_xc(school_id, gender)` - Top 10 all-time
- `get_school_course_records(school_id, course_id, gender)` - Course-specific PRs

### 3. Results Detail View
Create view similar to old `results_with_details`:
```sql
CREATE VIEW results_with_details AS
SELECT
  r.*,
  a.first_name,
  a.last_name,
  a.grad_year,
  a.gender,
  s.name as school_name,
  m.meet_date,
  m.name as meet_name,
  c.name as course_name,
  c.distance_meters,
  c.difficulty_rating
FROM results r
JOIN athletes a ON r.athlete_id = a.id
JOIN schools s ON a.school_id = s.id
LEFT JOIN races rc ON r.race_id = rc.id
JOIN meets m ON r.meet_id = m.id
LEFT JOIN courses c ON m.course_id = c.id;
```

---

## Recommended Implementation Order

1. ✅ **Create utility functions** for time conversion (centiseconds)
2. ✅ **Create `results_with_details` view** in Supabase
3. ✅ **Update athlete detail page** with new schema
4. ✅ **Update school roster page** with new schema
5. ⚠️ **Decide on course normalization approach**
6. ⚠️ **Create RPC functions** for school records
7. ✅ **Update school records page** with new logic

---

## Summary for AI Sessions

**When updating ANY page from the old website:**

1. ✅ Replace `time_seconds` with `time_cs` (divide by 100 for seconds)
2. ✅ Replace `current_school_id` with `school_id`
3. ✅ Add `races` table joins where needed
4. ✅ Update time formatting: use centiseconds precision
5. ⚠️ Check if `xc_time_rating` or `mile_difficulty` are used (won't exist)
6. ⚠️ Check for RPC function calls (need to rebuild)
7. ✅ Add `data_source` and `is_legacy_data` awareness

**Key Mantras:**
- "Centiseconds, not seconds!"
- "Join through races table!"
- "school_id, not current_school_id!"
- "No RPC functions yet!"

---

**Created:** October 26, 2025
**Purpose:** Guide for migrating old website code to new schema
**Status:** Ready for implementation
