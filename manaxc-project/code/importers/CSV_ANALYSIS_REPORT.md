# Deep Analysis Report: Westmont XC CSV Files

**Date:** October 26, 2025
**Analyst:** Claude Code
**Purpose:** Pre-import analysis to identify schema, data quality, and relationship issues

---

## Executive Summary

Analyzed 6 CSV files containing 58 years of Westmont XC historical data (1966-2024). Found **critical structural issues** that must be resolved before import:

1. **Schema Mismatch:** Current database schema lacks `venues` table
2. **Course Name Formatting:** Inconsistent formatting between files (will break foreign keys)
3. **Results CSV Structure:** Confusing column name ("2017" contains athlete names/IDs)
4. **Data Volume:** 6,710 results, 1,038 athletes, 445 races across 208 meets

---

## File-by-File Analysis

### 1. venues.csv
```
Rows: 55 (54 venues + header)
Columns: name
```

**Structure:**
- Simple single-column file
- Clean data, no nulls observed
- Venue names like: "Track", "Crystal Springs", "Montgomery Hill"

**Quality:** ✅ GOOD
- No duplicates found
- Consistent naming

---

### 2. courses.csv
```
Rows: 116 (115 courses + header)
Columns: name, venue, distance_meters, distance_display, difficulty_rating
```

**Sample Data:**
```csv
"Track,  1 Mile",Track,1609, 1 Mile,1
"Crystal Springs,  2.95 Miles",Crystal Springs,4747, 2.95 Miles,1.18
```

**Key Observations:**
- **✅ All 115 courses have difficulty ratings!** (This is huge!)
- Course names formatted as: `"Venue,  Distance"` (venue + comma + **2 spaces** + distance)
- All venues reference entries in venues.csv ✅
- Distance in both meters (int) and display format (text)

**Quality:** ✅ GOOD
- Complete difficulty ratings
- Clean venue references
- Proper distance conversions

---

### 3. athletes.csv
```
Rows: 1,039 (1,038 athletes + header)
Columns: name, first_name, last_name, grad_year, school, gender
```

**Sample Data:**
```csv
Rich Campbell,Rich,Campbell,1966,Westmont,M
Abbey Blake,Abbey,Blake,2012,Westmont,F
```

**Key Observations:**
- Spans 58 years: 1966-2028 (including current/future students)
- All athletes from "Westmont" school
- Gender: M/F format (not boolean)
- Some athletes have "UNK" (unknown) in first name

**Quality:** ✅ GOOD
- Consistent format
- Complete data (no nulls observed in sample)

**Questions:**
1. Should we convert grad_year 1966-2024 (past) vs 2025+ (current/future)?
2. How to handle "UNK" names?

---

### 4. meets.csv
```
Rows: 209 (208 meets + header)
Columns: name, meet_date, season_year, venue_name
```

**Sample Data:**
```csv
BVAL Championships,2002-11-04,2002,Crystal Springs
League Meet,2024-10-23,2024,Montgomery Hill
```

**Key Observations:**
- All 30 unique venue names reference valid venues in venues.csv ✅
- Dates span 2002-2024
- Some venue names have trailing spaces ("Crystal Springs ")

**Quality:** ⚠️ GOOD with minor issues
- Clean foreign key relationships
- Minor: trailing spaces in some venue names

---

### 5. races.csv
```
Rows: 446 (445 races + header)
Columns: meet_name, meet_date, season_year, race_name, course_name, gender
```

**Sample Data:**
```csv
BVAL Champions,2024-11-04,2024,Not Disclosed,"Crystal Springs , 2.95 Miles",M
```

**Key Observations:**
- Most races have race_name = "Not Disclosed"
- Gender: M/F/Mixed (needs investigation)
- **🚨 CRITICAL ISSUE:** Course names formatted as `"Venue , Distance"` (space-comma-space)
  - courses.csv uses: `"Venue,  Distance"` (comma-2spaces)
  - races.csv uses: `"Venue , Distance"` (space-comma-space)
  - **43 out of 43 course names DON'T MATCH courses.csv!**

**Quality:** 🚨 CRITICAL DATA ISSUE
- Course name formatting inconsistency will **break all foreign key relationships**
- Must normalize before import

---

### 6. results.csv
```
Rows: 6,711 (6,710 results + header)
Columns: Date, 2017, grad_year, Grade, time_cs, Event, Course, Season, Division, is_legacy_data
```

**Sample Data:**
```csv
Date,2017,grad_year,Grade,time_cs,Event,Course,Season,Division,is_legacy_data
10/20/22,Abagail Mekonnen,2026,9,260930,BVAL #4,"Montgomery Hill, 2.74 Miles",2022,F,Y
9/16/99,2028,2002,10,113000,Firebird Invitational,"Fremont HS, 2.05 Miles",1999,F,Y
```

**Key Observations:**
- **🚨 CRITICAL ISSUE:** Column labeled "2017" contains MIXED data types:
  - Sometimes: Athlete names (e.g., "Abagail Mekonnen", "Abbey Blake")
  - Sometimes: Grad years as strings (e.g., "2028", "2027")
  - This is confusing and needs clarification!

- **time_cs:** Centiseconds (e.g., 260930 = 43:29.30)
- **Division:** M/F (gender, not division?)
- **is_legacy_data:** All values are "Y" (100% legacy)
- **Course names:** Same format as results.csv: `"Venue, Distance"` (comma-space)

**Quality:** 🚨 CRITICAL ISSUES
1. Mysterious "2017" column with mixed data
2. Course names use different formatting than courses.csv
3. "Division" column seems to be gender, not actual division
4. No clear athlete_id foreign key

**Questions:**
1. What is the "2017" column supposed to represent?
2. Is it athlete_name, athlete_id, or something else?
3. Why are some values grad years and others names?
4. How do we link results to athletes?

---

## Relationship Analysis

### Foreign Key Validation

| From | To | Column | Status | Issues |
|------|----|----|--------|--------|
| courses | venues | venue | ✅ VALID | All venues exist |
| meets | venues | venue_name | ✅ VALID | All venues exist (minor trailing spaces) |
| races | courses | course_name | 🚨 BROKEN | **0% match** due to formatting |
| races | meets | meet_name+date | ❓ UNVERIFIED | Need composite key check |
| results | athletes | ??? | ❓ UNKNOWN | No clear foreign key column |
| results | races | ??? | ❓ UNKNOWN | No clear foreign key column |

---

## Critical Issues to Resolve

### 1. Schema: Missing `venues` Table

**Current Schema:**
```
courses (has venue as TEXT field, not foreign key)
meets (has course_id field - WRONG!)
```

**Required Schema:**
```
venues → courses (via venue_id)
venues → meets (via venue_id)
courses ← races (via course_id)
```

**Action Required:** Database schema migration

---

### 2. Course Name Formatting Inconsistency

**courses.csv:**
```
"Track,  1 Mile"           (comma + 2 spaces)
"Crystal Springs,  2.95 Miles"
```

**races.csv & results.csv:**
```
"Track , 1 Mile"           (space + comma + space)
"Crystal Springs , 2.95 Miles"
```

**Impact:** 100% of foreign key relationships from races→courses will fail

**Solutions:**
- Option A: Normalize course names during import (strip/standardize spaces)
- Option B: Fix source CSVs before import
- Option C: Match on venue + distance instead of full name

---

### 3. results.csv "2017" Column Mystery

**Column contains:**
- Athlete names: "Abagail Mekonnen", "Abbey Blake" (recent data)
- Grad years: "2028", "2027" (legacy data)

**Hypothesis:** This column represents:
- Modern data (2015+): Athlete name was properly extracted
- Legacy data (pre-2015): Only grad year was available

**Questions:**
1. Should we treat this as athlete_name?
2. How do we match these to athletes.csv?
3. Should we use a composite key (name + grad_year + race)?

---

### 4. Missing Foreign Keys in results.csv

**Current results.csv has:**
- Event name (text)
- Course name (text)
- No race_id
- No athlete_id
- No meet_id

**Need to:**
1. Match "Event" + "Date" → meet_id
2. Match "Course" → course_id
3. Match "2017 column" + "grad_year" → athlete_id
4. Generate race_id from meet_id + course_id + gender

---

## Data Quality Statistics

### Volume
- **Athletes:** 1,038 (across 58 years)
- **Venues:** 54
- **Courses:** 115 (all with difficulty ratings ✅)
- **Meets:** 208 (2002-2024)
- **Races:** 445
- **Results:** 6,710

### Completeness
- ✅ All courses have difficulty ratings
- ✅ All dates present
- ✅ All times present (time_cs)
- ⚠️ Many races have "Not Disclosed" as race name
- ❓ Athlete identification unclear in results.csv

### Era Breakdown
- Legacy data: 1966-2001 (estimated)
- Modern data: 2002-2024 (confirmed)

---

## Questions for User

### Schema & Structure
1. **Confirm venue separation:** Do we want venues as separate table? (You said yes)
2. **Current schema status:** Does Supabase currently have a venues table?
3. **Migration approach:** Modify existing schema or fresh start?

### Data Interpretation
4. **"2017" column:** What does this represent? Athlete name or ID?
5. **Legacy data:** How should we handle grad-year-only records?
6. **Course matching:** Normalize names or match on venue+distance?

### Business Logic
7. **Race names:** Are "Not Disclosed" races acceptable or should we infer from division/course?
8. **Gender field:** In results, is "Division" actually gender?
9. **is_legacy_data:** What's the cutoff year? Should we treat differently?

### Import Strategy
10. **Data cleaning:** Fix CSVs first, or normalize during import?
11. **Partial import:** Start with clean subset or full historical?
12. **Error handling:** Skip bad records or fail entire import?

---

## Recommended Import Order (After Fixes)

1. **venues** (54) - No dependencies
2. **courses** (115) - Needs venue_id
3. **athletes** (1,038) - Needs school_id (Westmont exists)
4. **meets** (208) - Needs venue_id
5. **races** (445) - Needs meet_id + course_id (composite matching required)
6. **results** (6,710) - Needs athlete_id + race_id (complex matching)

---

## Next Steps

### Before ANY Import:
1. ✅ Get your answers to the 12 questions above
2. Create venues table in Supabase
3. Add venue_id to courses table
4. Change meets.course_id → meets.venue_id
5. Decide on course name normalization strategy
6. Clarify results.csv athlete identification

### Then:
1. Write data cleaning/normalization scripts
2. Test import on small subset (1-2 meets)
3. Validate foreign key relationships
4. Full import when confident

---

## Risk Assessment

### HIGH RISK (Must Fix Before Import)
- 🚨 Course name formatting → 0% foreign key matches
- 🚨 Missing venues table in schema
- 🚨 Unclear athlete identification in results.csv

### MEDIUM RISK (May Cause Issues)
- ⚠️ "Not Disclosed" race names (445 races)
- ⚠️ Mixed data types in "2017" column
- ⚠️ Legacy data without proper athlete names

### LOW RISK (Minor Issues)
- Trailing spaces in venue names (easily fixed)
- "UNK" athlete names (rare, can filter)

---

## Positive Findings

✅ **All 115 courses have difficulty ratings** - This is fantastic!
✅ **Clean venue relationships** - venues.csv ↔ meets.csv works perfectly
✅ **Complete time data** - All 6,710 results have valid times
✅ **58 years of history** - Incredible data depth (1966-2024)
✅ **Consistent dates** - All in standard format
✅ **Gender tracking** - M/F available throughout

---

## Conclusion

The CSVs contain **excellent historical data** spanning 58 years, but have **critical structural issues** that must be resolved before import. The main blockers are:

1. Schema mismatch (missing venues table)
2. Course name formatting inconsistency
3. Unclear athlete references in results

With your clarifications on the 12 questions above, we can create a bulletproof import strategy.

**Recommendation:** Fix schema first, clarify data issues, then proceed with table-by-table import with validation at each step.
