# ADR-002: Data Migration & Validation Strategy

**Date:** October 22, 2025
**Status:** ✅ ACCEPTED
**Decision Maker:** Ron Ernst
**Related:** ADR-001 (Time Storage)

---

## Context

Ron has two data sources:
1. **Old Excel data** - 58 years (1966-2025), Westmont athletes ONLY
2. **New complete data** - Full race results (all schools/athletes)

**Challenge:** Migrate from partial to complete data while:
- Keeping historical records
- Validating new data against old
- Flagging discrepancies for review
- Removing duplicates after confirmation
- Tracking which races still need complete results

---

## Decision

**Implement a phased migration system with validation layer**

### Phase 1: Dual Data Model
Store BOTH old and new data separately until validated:

```
results_legacy (old Excel data - Westmont only)
  - All 58 years of Westmont athlete results
  - Marked as "partial_results = true"
  - Source: "excel_import"

results (new complete data)
  - Full race results (all schools)
  - Marked as "complete_results = true"
  - Source: "athletic_net" or "manual_import"

results_validation (tracking discrepancies)
  - Links old result to new result
  - Flags differences (time, place, etc.)
  - Tracks review status
```

### Phase 2: Validation System
For each new complete result, check if legacy data exists:
- Compare times (should match within 1 centisecond)
- Compare places
- Flag discrepancies for Ron's review
- Track validation status

### Phase 3: Confirmation & Cleanup
After Ron confirms new data is correct:
- Mark legacy result as "replaced_by: new_result_id"
- Soft-delete legacy result (keep for history)
- Use complete result going forward

---

## Database Schema

### Extended Results Table
```sql
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID NOT NULL REFERENCES athletes(id),
  meet_id UUID NOT NULL REFERENCES meets(id),
  race_id UUID REFERENCES races(id), -- NEW: link to specific race

  -- Core data
  time_cs INTEGER NOT NULL CHECK (time_cs > 0),
  place_overall INTEGER,
  place_gender INTEGER,
  place_team INTEGER,

  -- Metadata
  data_source TEXT NOT NULL CHECK (data_source IN ('excel_import', 'athletic_net', 'manual_import')),
  is_complete_results BOOLEAN DEFAULT FALSE, -- Full race results or just Westmont?
  is_legacy_data BOOLEAN DEFAULT FALSE, -- Old Excel data

  -- Validation tracking
  validation_status TEXT CHECK (validation_status IN ('pending', 'confirmed', 'discrepancy', 'replaced')),
  replaced_by UUID REFERENCES results(id), -- Link to newer result
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES auth.users(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  -- Prevent exact duplicates
  UNIQUE(athlete_id, meet_id, race_id, data_source)
);

CREATE INDEX idx_results_validation ON results(validation_status) WHERE validation_status IS NOT NULL;
CREATE INDEX idx_results_legacy ON results(is_legacy_data) WHERE is_legacy_data = true;
CREATE INDEX idx_results_source ON results(data_source);
```

### Validation Tracking Table
```sql
CREATE TABLE result_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  legacy_result_id UUID NOT NULL REFERENCES results(id),
  new_result_id UUID REFERENCES results(id),

  -- Athlete/Meet info for context
  athlete_id UUID NOT NULL REFERENCES athletes(id),
  meet_id UUID NOT NULL REFERENCES meets(id),

  -- Discrepancies
  time_diff_cs INTEGER, -- Difference in centiseconds
  place_diff INTEGER,
  has_discrepancy BOOLEAN DEFAULT FALSE,
  discrepancy_notes TEXT[],

  -- Resolution
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed_match', 'confirmed_change', 'needs_review')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_validations_pending ON result_validations(status) WHERE status = 'pending';
CREATE INDEX idx_validations_athlete ON result_validations(athlete_id);
```

### Migration Progress Tracking
```sql
CREATE TABLE migration_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Meet tracking
  meet_id UUID NOT NULL REFERENCES meets(id),
  season_year INTEGER NOT NULL,

  -- Status
  has_legacy_data BOOLEAN DEFAULT FALSE,
  has_complete_data BOOLEAN DEFAULT FALSE,
  validation_status TEXT DEFAULT 'not_started' CHECK (
    validation_status IN ('not_started', 'in_progress', 'needs_review', 'completed')
  ),

  -- Counts
  legacy_results_count INTEGER DEFAULT 0,
  complete_results_count INTEGER DEFAULT 0,
  validated_count INTEGER DEFAULT 0,
  discrepancy_count INTEGER DEFAULT 0,

  -- Progress
  completion_percentage DECIMAL(5,2),
  last_validated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(meet_id, season_year)
);

CREATE INDEX idx_migration_status ON migration_progress(validation_status);
CREATE INDEX idx_migration_season ON migration_progress(season_year);
```

---

## Implementation Logic

### Step 1: Import Legacy Data (Excel)
```sql
-- Import with legacy flags
INSERT INTO results (
  athlete_id, meet_id, race_id, time_cs, place_overall,
  data_source, is_legacy_data, is_complete_results,
  validation_status
)
SELECT
  athlete_id, meet_id, race_id, time_cs, place_overall,
  'excel_import', TRUE, FALSE, 'pending'
FROM excel_staging_table;

-- Track in migration progress
INSERT INTO migration_progress (meet_id, season_year, has_legacy_data, legacy_results_count)
SELECT meet_id, season_year, TRUE, COUNT(*)
FROM results
WHERE is_legacy_data = TRUE
GROUP BY meet_id, season_year;
```

### Step 2: Import Complete Results (Athletic.net)
```sql
-- Import new complete data
INSERT INTO results (
  athlete_id, meet_id, race_id, time_cs, place_overall,
  data_source, is_legacy_data, is_complete_results,
  validation_status
)
SELECT
  athlete_id, meet_id, race_id, time_cs, place_overall,
  'athletic_net', FALSE, TRUE, 'pending'
FROM athletic_net_staging_table;

-- Update migration progress
UPDATE migration_progress
SET
  has_complete_data = TRUE,
  complete_results_count = (SELECT COUNT(*) FROM results WHERE meet_id = migration_progress.meet_id AND is_complete_results = TRUE),
  validation_status = 'in_progress'
WHERE meet_id IN (SELECT DISTINCT meet_id FROM athletic_net_staging_table);
```

### Step 3: Auto-Validation Function
```sql
CREATE OR REPLACE FUNCTION validate_result_match()
RETURNS TRIGGER AS $$
DECLARE
  legacy_record RECORD;
  time_difference INTEGER;
  has_issues BOOLEAN := FALSE;
  discrepancies TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Only run for new complete results
  IF NEW.is_complete_results = FALSE THEN
    RETURN NEW;
  END IF;

  -- Find matching legacy result for same athlete/meet
  SELECT * INTO legacy_record
  FROM results
  WHERE athlete_id = NEW.athlete_id
    AND meet_id = NEW.meet_id
    AND is_legacy_data = TRUE
    AND validation_status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    -- No legacy data to compare
    NEW.validation_status := 'confirmed';
    RETURN NEW;
  END IF;

  -- Compare times
  time_difference := ABS(NEW.time_cs - legacy_record.time_cs);

  IF time_difference > 1 THEN
    has_issues := TRUE;
    discrepancies := array_append(discrepancies,
      FORMAT('Time diff: %s cs (old: %s, new: %s)',
        time_difference, legacy_record.time_cs, NEW.time_cs)
    );
  END IF;

  -- Compare places (if both exist)
  IF NEW.place_overall IS NOT NULL AND legacy_record.place_overall IS NOT NULL THEN
    IF ABS(NEW.place_overall - legacy_record.place_overall) > 0 THEN
      has_issues := TRUE;
      discrepancies := array_append(discrepancies,
        FORMAT('Place diff: old: %s, new: %s',
          legacy_record.place_overall, NEW.place_overall)
      );
    END IF;
  END IF;

  -- Create validation record
  INSERT INTO result_validations (
    legacy_result_id, new_result_id, athlete_id, meet_id,
    time_diff_cs, has_discrepancy, discrepancy_notes,
    status
  ) VALUES (
    legacy_record.id, NEW.id, NEW.athlete_id, NEW.meet_id,
    time_difference, has_issues, discrepancies,
    CASE WHEN has_issues THEN 'needs_review' ELSE 'confirmed_match' END
  );

  -- Set validation status
  IF has_issues THEN
    NEW.validation_status := 'discrepancy';

    -- Update migration progress
    UPDATE migration_progress
    SET
      validation_status = 'needs_review',
      discrepancy_count = discrepancy_count + 1
    WHERE meet_id = NEW.meet_id;
  ELSE
    NEW.validation_status := 'confirmed';

    -- Mark legacy as replaced
    UPDATE results
    SET
      validation_status = 'replaced',
      replaced_by = NEW.id,
      validated_at = NOW()
    WHERE id = legacy_record.id;

    -- Update migration progress
    UPDATE migration_progress
    SET validated_count = validated_count + 1
    WHERE meet_id = NEW.meet_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_on_insert
BEFORE INSERT ON results
FOR EACH ROW
EXECUTE FUNCTION validate_result_match();
```

---

## Admin UI Features

### 1. Migration Dashboard (`/admin/data-migration`)

**Overview Panel:**
```
┌─────────────────────────────────────────────┐
│ Data Migration Progress                     │
├─────────────────────────────────────────────┤
│ Total Meets: 65                             │
│ ├─ Legacy Only: 12 (needs complete data)    │
│ ├─ Complete Only: 8 (no legacy to compare)  │
│ ├─ Both (validated): 40 ✅                   │
│ └─ Both (needs review): 5 ⚠️                 │
│                                             │
│ Progress: 85% [████████░░]                  │
└─────────────────────────────────────────────┘
```

**Meets Needing Review:**
```
Meet                     | Legacy | Complete | Discrepancies | Action
------------------------|--------|----------|---------------|--------
WCAL Championships 2024 |   15   |    142   |      3        | [Review]
CCS Finals 2023         |   12   |    98    |      1        | [Review]
```

### 2. Validation Review Page (`/admin/validate/:meetId`)

**For each discrepancy:**
```
┌─────────────────────────────────────────────────────────┐
│ Athlete: Sarah Johnson (Westmont, 2025)                 │
│ Meet: WCAL Championships 2024                           │
├─────────────────────────────────────────────────────────┤
│ LEGACY DATA (Excel):                                    │
│   Time: 19:30.45 (117045 cs)                           │
│   Place: 12th overall                                   │
│                                                         │
│ NEW COMPLETE DATA (Athletic.net):                      │
│   Time: 19:30.32 (117032 cs)  ⚠️ -13 cs difference     │
│   Place: 12th overall ✅                                │
│                                                         │
│ Possible Reasons:                                      │
│ • Rounding in old data                                 │
│ • Timing system correction                             │
│ • Data entry error in Excel                            │
│                                                         │
│ Actions:                                               │
│ [✅ Accept New Time] [❌ Keep Legacy] [📝 Investigate] │
└─────────────────────────────────────────────────────────┘
```

### 3. Completion Tracker (`/admin/races-to-upload`)

**Shows which races still need complete results:**
```
Season | Meet                    | Date       | Legacy Results | Status
-------|-------------------------|------------|----------------|------------------
2024   | WCAL Championships      | Nov 2      | 15 Westmont    | ⏳ Needs upload
2024   | Baylands Invitational   | Oct 15     | 12 Westmont    | ⏳ Needs upload
2023   | Crystal Springs Classic | Sep 20     | 18 Westmont    | ⏳ Needs upload

[Upload Complete Results] [Bulk Import]
```

---

## Queries & Views

### View: Validation Summary by Meet
```sql
CREATE VIEW validation_summary AS
SELECT
  m.id as meet_id,
  m.name as meet_name,
  m.meet_date,
  m.season_year,
  COUNT(DISTINCT CASE WHEN r.is_legacy_data THEN r.id END) as legacy_count,
  COUNT(DISTINCT CASE WHEN r.is_complete_results THEN r.id END) as complete_count,
  COUNT(DISTINCT CASE WHEN rv.status = 'needs_review' THEN rv.id END) as discrepancy_count,
  COUNT(DISTINCT CASE WHEN rv.status = 'confirmed_match' THEN rv.id END) as validated_count,
  mp.validation_status
FROM meets m
LEFT JOIN results r ON r.meet_id = m.id
LEFT JOIN result_validations rv ON rv.meet_id = m.id
LEFT JOIN migration_progress mp ON mp.meet_id = m.id
WHERE m.season_year >= 2022 -- Focus on recent years first
GROUP BY m.id, m.name, m.meet_date, m.season_year, mp.validation_status
ORDER BY m.meet_date DESC;
```

### Query: Find Discrepancies Needing Review
```sql
SELECT
  a.name as athlete_name,
  m.name as meet_name,
  m.meet_date,
  r_legacy.time_cs as legacy_time_cs,
  r_new.time_cs as new_time_cs,
  rv.time_diff_cs,
  rv.discrepancy_notes
FROM result_validations rv
JOIN results r_legacy ON r_legacy.id = rv.legacy_result_id
JOIN results r_new ON r_new.id = rv.new_result_id
JOIN athletes a ON a.id = rv.athlete_id
JOIN meets m ON m.id = rv.meet_id
WHERE rv.status = 'needs_review'
ORDER BY m.meet_date DESC, a.name;
```

### Query: Races Still Needing Complete Results
```sql
SELECT
  m.season_year,
  m.name as meet_name,
  m.meet_date,
  COUNT(r.id) as westmont_results_count,
  mp.has_complete_data
FROM meets m
JOIN results r ON r.meet_id = m.id
JOIN athletes a ON a.id = r.athlete_id
LEFT JOIN migration_progress mp ON mp.meet_id = m.id
WHERE r.is_legacy_data = TRUE
  AND (mp.has_complete_data = FALSE OR mp.has_complete_data IS NULL)
  AND a.school_id = (SELECT id FROM schools WHERE name = 'Westmont High School')
GROUP BY m.id, m.season_year, m.name, m.meet_date, mp.has_complete_data
ORDER BY m.season_year DESC, m.meet_date DESC;
```

---

## User-Facing Features (manaxc.com)

### All Pages Show BEST Available Data

**Query Logic:**
```sql
-- Always prefer complete, validated results
SELECT * FROM results
WHERE meet_id = $1
  AND (
    (is_complete_results = TRUE AND validation_status IN ('confirmed', 'discrepancy'))
    OR
    (is_legacy_data = TRUE AND validation_status NOT IN ('replaced'))
  )
ORDER BY
  is_complete_results DESC, -- Complete results first
  validation_status = 'confirmed' DESC, -- Confirmed first
  time_cs ASC;
```

### Result Display with Transparency

**On meet results page:**
```
WCAL Championships 2024 - Varsity Boys

Place | Athlete           | School     | Time     | Source
------|-------------------|------------|----------|------------------
1     | John Smith        | Bellarmine | 16:45.32 | ✅ Complete Results
2     | Mike Jones        | St. Francis| 16:52.10 | ✅ Complete Results
...
12    | Sarah Johnson     | Westmont   | 19:30.32 | ⚠️ Legacy Data*

*This race has partial results. Full results being validated.
[View complete results when available]
```

### Course Difficulty Calculation

**Uses ALL validated data:**
```sql
-- For course difficulty algorithm, use:
-- 1. Complete validated results (priority)
-- 2. Legacy results where no complete data exists yet

SELECT * FROM results
WHERE course_id = $1
  AND validation_status IN ('confirmed', 'pending')
  AND (
    is_complete_results = TRUE
    OR
    (is_legacy_data = TRUE AND replaced_by IS NULL)
  );
```

**Benefits:**
- More data points → better difficulty ratings
- Legacy data useful until replaced
- Smooth transition as new data arrives

---

## Migration Workflow

### Week 1-2: Initial Setup
1. Import all Excel data as `is_legacy_data = TRUE`
2. Mark as `validation_status = 'pending'`
3. Create migration_progress records
4. Build admin validation UI

### Week 3-6: Progressive Upload
**For each meet with complete results:**
1. Upload complete results (Athletic.net scrape or manual)
2. Auto-validation trigger runs:
   - Compares with legacy data
   - Flags discrepancies
   - Auto-confirms matches
3. Ron reviews discrepancies
4. Confirms or investigates
5. Legacy data soft-deleted after confirmation

### Week 7-12: Cleanup
1. Review all discrepancies
2. Resolve edge cases
3. Archive legacy data
4. Switch all queries to complete results only

---

## Benefits of This Approach

### 1. Data Integrity ✅
- Never lose historical data
- Track all changes
- Audit trail for every result

### 2. Confidence in Migration ✅
- Ron reviews every discrepancy
- Intentional changes flagged, not errors
- No silent overwrites

### 3. Progress Tracking ✅
- Clear view of what's done
- Know what races need complete results
- Percentage complete for motivation

### 4. Better Course Ratings ✅
- More athletes per race
- Better statistical confidence
- Accurate difficulty calculations

### 5. Public Visibility ✅
- All pages on manaxc.com show best data
- Transparent about data sources
- Smooth user experience during migration

---

## Example Timeline

**Meet: WCAL Championships 2024**

**Stage 1: Legacy Only**
```
Results: 15 (Westmont athletes only)
Status: Partial results available
Display: Show 15 Westmont results
Course Rating: Based on 15 data points
```

**Stage 2: Complete Data Uploaded**
```
Results: 142 (all schools)
Status: Validation in progress
Display: Show all 142 results
Flags: 3 Westmont results have discrepancies
Course Rating: Based on 142 data points ✅ Better!
```

**Stage 3: Validated**
```
Results: 142 (confirmed)
Status: Complete ✅
Display: Show all 142 results
Legacy Data: Soft-deleted
Course Rating: Based on 142 validated data points
```

---

## Technical Implementation Priority

### Day 2-3: Schema Setup
- Create extended results table
- Create validation tracking tables
- Create migration progress table

### Day 4-5: Import Legacy Data
- Import Excel as legacy
- Create migration progress records
- Build basic admin view

### Week 2: Validation System
- Create auto-validation trigger
- Build validation review UI
- Test with one meet

### Week 3-4: Bulk Migration
- Upload complete results for all recent meets
- Review discrepancies
- Confirm and cleanup

### Week 5+: Maintenance
- New meets go straight to complete results
- Legacy data only for historical (pre-2022)

---

## Status

**Decision Status:** ✅ ACCEPTED
**Implementation:** Ready to code (Day 2)
**Priority:** HIGH - Foundation for data quality

---

**END OF ADR-002**
