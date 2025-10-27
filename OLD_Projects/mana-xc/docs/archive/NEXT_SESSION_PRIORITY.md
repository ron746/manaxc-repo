# URGENT: Data Quality Issues - Next Session Priority

## 🚨 Critical Issues Found

After reviewing the imported data in Supabase, multiple data quality issues were discovered that must be fixed before analysis can proceed.

---

## Issues Summary

### 1. **Courses Table** ❌
- **Problem**: Course names contain full location string "Crystal Springs, CA  US"
- **Problem**: City field has wrong data
- **Problem**: Missing distance_meters
- **Impact**: Can't filter/group by course properly

### 2. **Races Table** ❌
- **Problem**: Not linked to courses (course_id is NULL)
- **Problem**: Gender stored as boolean (true/false) instead of 'M'/'F'
- **Problem**: total_participants is 0 (not calculated)
- **Impact**: Can't analyze by course, gender queries are confusing

### 3. **Meets Table** ❌
- **Problem**: Missing season_year field
- **Impact**: Can't filter by season

### 4. **Results Table** ❌
- **Problem**: Missing season_year field
- **Impact**: Year-over-year comparisons impossible

### 5. **Athlete Names** ❌
- **Problem**: Some names incorrectly parsed
- **Root Cause**: Complex name splitting logic when CSV already has clean names
- **Impact**: Duplicate athletes, incorrect records

### 6. **Schools Table** ❌
- **Problem**: Missing ath_net_id (Athletic.net school ID)
- **Impact**: Can't track schools across platforms

---

## Root Cause

The batch-import code has several flaws:
1. Uses boolean for gender instead of string
2. Doesn't link races to courses
3. Doesn't calculate season_year
4. Over-complicated name parsing
5. Doesn't set total_participants

---

## Fix Strategy

### IMPORTANT: Read DO_THIS_NEXT.md First!
Before starting, make sure you've followed the startup instructions in `DO_THIS_NEXT.md` to:
- Start Django backend (port 8000)
- Start Next.js frontend (port 3000)
- Open Supabase SQL Editor

---

### Phase 1: Clean Database (15 min)
1. Open Supabase SQL Editor: https://app.supabase.com/project/dvclmjqafooecutprclr/sql/new
2. Copy the entire contents of `FIX_DATA_IMPORT.sql`
3. Paste into SQL Editor and click "Run"
4. This will:
   - Delete all bad data (courses, meets, races, results, athletes, schools)
   - Fix schema (gender boolean → TEXT in races and athletes tables)
   - Add missing columns (season_year, course_id, ath_net_id)

### Phase 2: Fix Import Code (30 min)
Update `app/api/admin/batch-import/route.ts`:

```typescript
// FIX 1: Course parsing
const locationParts = meet.location.split(',').map(s => s.trim());
const courseName = locationParts[0]; // Just "Crystal Springs"
const state = locationParts[1] || 'CA';

// FIX 2: Gender as string
gender: race.gender // Keep as 'M' or 'F', don't convert to boolean

// FIX 3: Link race to course
const { data: newRace } = await supabase
  .from('races')
  .insert({
    meet_id: meetId,
    name: race.raceName,
    gender: race.gender, // 'M' or 'F'
    course_id: courseId, // Link to course!
    distance_meters: distanceMeters,
  })

// FIX 4: Add season_year to meet
const seasonYear = new Date(meetDate).getFullYear();
const { data: newMeet } = await supabase
  .from('meets')
  .insert({
    name: meet.meetName,
    meet_date: meetDate,
    season_year: seasonYear, // Add this!
    athletic_net_id: meet.meetId,
  })

// FIX 5: Add season_year to results
const { error: resultError } = await supabase
  .from('results')
  .insert({
    race_id: newRace.id,
    athlete_id: athleteId,
    time_cs: time_cs,
    place_overall: result.place,
    season_year: seasonYear, // Add this!
  });

// FIX 6: Simple name parsing
const nameParts = result.fullName.trim().split(/\s+/);
const lastName = nameParts[nameParts.length - 1];
const firstName = nameParts.slice(0, -1).join(' ');
```

### Phase 3: Re-import Data (10 min)
1. Open browser to: http://localhost:3000/admin/bulk-import
2. For 2024 season:
   - CSV File: `athletic-net-1076-2024.csv`
   - JSON File: `athletic-net-1076-2024.json`
   - Click "Import Data"
   - Wait for success message
3. For 2025 season:
   - CSV File: `athletic-net-1076-2025.csv`
   - JSON File: `athletic-net-1076-2025.json`
   - Click "Import Data"
   - Wait for success message

### Phase 4: Calculate Derived Fields (5 min)
Run in Supabase SQL Editor:
```sql
-- Update total_participants
UPDATE races
SET total_participants = (
  SELECT COUNT(*) FROM results WHERE race_id = races.id
);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW athlete_xc_times_v3;
```

### Phase 5: Verify Data Quality (10 min)
Open Supabase and check each table:

**Courses Table** (https://app.supabase.com/project/dvclmjqafooecutprclr/editor/public/courses):
- [ ] Names are clean (e.g., "Crystal Springs" not "Crystal Springs, CA  US")
- [ ] Have distance_meters set
- [ ] Count: Should have 4+ courses

**Races Table** (https://app.supabase.com/project/dvclmjqafooecutprclr/editor/public/races):
- [ ] course_id is set (not NULL)
- [ ] Gender is 'M' or 'F' (not true/false)
- [ ] total_participants > 0
- [ ] distance_meters is set
- [ ] Count: Should have 67+ races

**Meets Table** (https://app.supabase.com/project/dvclmjqafooecutprclr/editor/public/meets):
- [ ] season_year is set (2024 or 2025)
- [ ] meet_date is valid
- [ ] Count: Should have 8+ meets

**Results Table** (https://app.supabase.com/project/dvclmjqafooecutprclr/editor/public/results):
- [ ] season_year is set
- [ ] time_cs is in centiseconds (e.g., 93000 for 15:30.00)
- [ ] Count: Should have 5,743+ results

**Athletes Table** (https://app.supabase.com/project/dvclmjqafooecutprclr/editor/public/athletes):
- [ ] Names look correct (first_name + last_name parsed properly)
- [ ] Gender is true/false (this table keeps boolean)
- [ ] No duplicate athletes

**Schools Table** (https://app.supabase.com/project/dvclmjqafooecutprclr/editor/public/schools):
- [ ] No duplicate schools
- [ ] ath_net_id is set (if available)

---

## Expected Results After Fix

### Before (Current State):
```
Courses: 4 entries with names like "Crystal Springs, CA  US"
Races: 67 entries, course_id = NULL, gender = true/false
Meets: 8 entries, season_year = NULL
Results: 5,743 entries, season_year = NULL
```

### After (Fixed State):
```
Courses: 4 entries with clean names like "Crystal Springs"
Races: 67 entries, course_id set, gender = 'M'/'F', total_participants set
Meets: 8 entries, season_year = 2024
Results: 5,743 entries, season_year = 2024
```

---

## Files to Use

1. **SQL Cleanup**: `FIX_DATA_IMPORT.sql` - Run this first
2. **Code Fixes**: Update `app/api/admin/batch-import/route.ts`
3. **Documentation**: This file for reference

---

## Time Estimate

Total: **70 minutes** to complete all fixes and re-import

---

## Success Criteria

✅ All courses have clean names
✅ All races linked to courses
✅ Gender stored as 'M' or 'F'
✅ All meets and results have season_year
✅ Total participants calculated
✅ Athlete names correctly parsed
✅ Ready for Westmont analysis

---

## After Fixes Complete

You'll be able to:
1. Query fastest Westmont athletes
2. Compare 2024 vs 2025 performances
3. Analyze by course difficulty
4. Build optimal varsity lineup
5. Track year-over-year improvements

---

**This is the TOP PRIORITY for next session!**
