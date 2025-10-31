# Data Quality & Import Verification System

This document describes the complete system for tracking and resolving data quality issues during imports.

## Overview

Three tables track data quality issues for admin review:

1. **`potential_duplicates`** - Athletes with multiple different times in same race
2. **`potential_duplicate_athletes`** - Ambiguous athlete name matches
3. **`import_discrepancies`** - Missing results/athletes after import (TO BE CREATED)

## 1. Potential Duplicate Times (`potential_duplicates`)

**Purpose:** Track when the same athlete has multiple different times recorded for the same race.

**When it's created:**
- During import when a result would violate the old unique constraint
- Post-import verification finds athlete has 2+ times for same race

**Schema:**
```sql
CREATE TABLE potential_duplicates (
    id UUID PRIMARY KEY,
    result_id_1 UUID REFERENCES results(id),
    result_id_2 UUID REFERENCES results(id),
    athlete_id UUID REFERENCES athletes(id),
    meet_id UUID REFERENCES meets(id),
    race_id UUID REFERENCES races(id),
    conflict_type VARCHAR(50) DEFAULT 'different_times_same_athlete_race',
    time_1_cs INTEGER NOT NULL,
    time_2_cs INTEGER NOT NULL,
    time_difference_cs INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    resolution_notes TEXT,
    CHECK (time_1_cs != time_2_cs)
);
```

**Examples:**
1. Ariel Hung (meet 270614): 158420 cs vs 207460 cs (490s difference)
2. Tristan Scott (meet 267582): 123280 cs vs 129810 cs (65s difference)
3. Miguel A. Rodriguez (meet 254332): 117431 cs vs 124551 cs (71s difference)

**Resolution workflow:**
1. Admin reviews both times
2. Determines which time is correct (or if both are valid splits/heats)
3. Updates status to 'resolved' with notes
4. Optionally deletes incorrect result

## 2. Potential Duplicate Athletes (`potential_duplicate_athletes`)

**Purpose:** Track ambiguous athlete name matches during import.

**When it's created:**
- CSV has "Miguel Rodriguez", DB has "Miguel A. Rodriguez" (middle initial difference)
- Same name, different grad years
- Similar names that might be typos vs different people

**Schema:**
```sql
CREATE TABLE potential_duplicate_athletes (
    id UUID PRIMARY KEY,
    athlete_id_1 UUID REFERENCES athletes(id), -- Existing athlete in DB
    athlete_id_2 UUID, -- NULL if CSV athlete not yet imported
    school_id UUID REFERENCES schools(id),
    meet_id UUID REFERENCES meets(id),
    name_1 VARCHAR(255) NOT NULL, -- DB name
    name_2 VARCHAR(255) NOT NULL, -- CSV name
    conflict_type VARCHAR(50) DEFAULT 'name_variation',
    grad_year_1 INTEGER,
    grad_year_2 INTEGER,
    gender_1 VARCHAR(1),
    gender_2 VARCHAR(1),
    csv_data JSONB, -- Full CSV row for import if needed
    status VARCHAR(20) DEFAULT 'pending',
    resolution_notes TEXT
);
```

**Example:**
- **Athlete in DB:** "Miguel A. Rodriguez" (grad 2028)
- **CSV name:** "Miguel Rodriguez" (grad 2028)
- **Question:** Same person with middle initial added, or two different people?

**Resolution workflow:**
1. Admin reviews both athlete records
2. If SAME PERSON: Use existing athlete_id for the result
3. If DIFFERENT: Create new athlete from CSV data, import result
4. Updates status with resolution

## 3. Import Discrepancies (`import_discrepancies`) - TO BE CREATED

**Purpose:** Track when CSV row counts don't match database after import.

**When it's created:**
- Post-import verification script runs
- Compares CSV row count to DB row count
- Flags discrepancies for investigation

**Schema (proposed):**
```sql
CREATE TABLE import_discrepancies (
    id UUID PRIMARY KEY,
    meet_id UUID REFERENCES meets(id),
    import_timestamp TIMESTAMPTZ,

    -- Counts
    csv_results_count INTEGER NOT NULL,
    db_results_count INTEGER NOT NULL,
    missing_count INTEGER NOT NULL,

    -- Sample missing data
    sample_missing_times INTEGER[], -- Array of up to 10 missing time_cs values
    sample_missing_athletes TEXT[], -- Array of athlete names

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Post-import verification script (to be created):**
```python
def verify_import(meet_id, csv_file_path):
    """
    Compare CSV to database and flag discrepancies.
    """
    # Count CSV rows
    csv_count = count_csv_rows(csv_file_path)

    # Count DB results
    db_count = count_db_results(meet_id)

    if csv_count != db_count:
        # Find missing times
        missing = find_missing_results(csv_file_path, meet_id)

        # Create discrepancy record
        create_import_discrepancy(
            meet_id=meet_id,
            csv_count=csv_count,
            db_count=db_count,
            missing_count=len(missing),
            sample_times=missing[:10],
            sample_athletes=get_athlete_names(missing[:10])
        )
```

## Integration Points

### Import Pipeline
```
1. Import foundation (meets, schools, courses, races, athletes)
2. Import results
3. Run verification script:
   - Compare counts
   - Flag duplicate times
   - Flag ambiguous athlete matches
4. Create import_discrepancy record if needed
```

### Admin Page

**Dashboard sections:**
1. **Duplicate Times** (`/admin/duplicates`)
   - List all pending potential_duplicates
   - Show both times, athlete name, meet, race
   - Actions: Mark as resolved, delete one result

2. **Duplicate Athletes** (`/admin/duplicate-athletes`)
   - List all pending potential_duplicate_athletes
   - Show both names, school, grad year, CSV data
   - Actions: Same person (merge), Different people (create new), Ignore

3. **Import Issues** (`/admin/import-issues`)
   - List all import_discrepancies
   - Show meet, missing count, sample data
   - Link to re-run import or manual fix

**API Routes needed:**
```typescript
// Get all pending issues
GET /api/admin/data-quality
Response: {
  duplicate_times: [...],
  duplicate_athletes: [...],
  import_discrepancies: [...]
}

// Resolve duplicate time
POST /api/admin/resolve-duplicate-time
Body: { id, resolution: 'keep_time_1' | 'keep_time_2' | 'keep_both', notes }

// Resolve duplicate athlete
POST /api/admin/resolve-duplicate-athlete
Body: { id, resolution: 'same_person' | 'different', notes, athlete_id? }

// Resolve import discrepancy
POST /api/admin/resolve-import-issue
Body: { id, resolution: 'reimport' | 'manual_fix' | 'ignore', notes }
```

## Workflow Summary

**For duplicate times:**
1. System detects during import or verification
2. Both times stored, flagged in `potential_duplicates`
3. Admin reviews → decides which is correct
4. Delete incorrect result or mark both as valid

**For duplicate athletes:**
1. Name matching ambiguous during import
2. Result skipped, flagged in `potential_duplicate_athletes` with CSV data
3. Admin reviews → same person or different?
4. If same: use existing athlete. If different: create new athlete + import result

**For missing results:**
1. Post-import verification detects count mismatch
2. Creates `import_discrepancies` record
3. Admin investigates → usually duplicate athlete or import error
4. Re-run import or manually fix

## Files Created

1. `/website/supabase/migrations/20251030_add_duplicate_detection.sql` - potential_duplicates table
2. `/website/supabase/migrations/20251030_add_potential_duplicate_athletes.sql` - potential_duplicate_athletes table
3. `/code/importers/DUPLICATE_TIME_WORKFLOW.md` - Process for handling duplicate times
4. `/code/importers/DATA_QUALITY_SYSTEM.md` - This file

## Next Steps

1. ✅ Create `potential_duplicates` table
2. ✅ Create `potential_duplicate_athletes` table
3. ⏳ Create `import_discrepancies` table
4. ⏳ Create post-import verification script
5. ⏳ Build admin UI pages
6. ⏳ Add to import pipeline
