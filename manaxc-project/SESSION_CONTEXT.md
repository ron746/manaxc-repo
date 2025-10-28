# Session Context - Data Import System Build

**Date:** October 27, 2025
**Status:** Phase 1 Complete (Research & Contracts)
**Next:** Begin Phase 2 (Build Modular Scraper)

---

## What We've Built So Far

### Completed Deliverables:

1. **00-START-HERE.md** - Updated with current project status
2. **DATA_IMPORT_SPRINT_PLAN.md** - 5-7 day implementation plan
3. **RESEARCH.md** - Technical research and decisions (9 areas resolved)
4. **CONTRACTS.md** - Complete technical specifications
5. All committed to GitHub (commit: 2de097d)

---

## Critical Decisions Made

### 1. Two-Stage Import Process
**Stage 1: Scrape → CSV Files**
- Admin enters Athletic.net ID (School/Meet/Race/Athlete)
- System scrapes immediately (blocks UI, shows progress)
- Generates 7 CSV files in `/to-be-processed/{id}_{timestamp}/`

**Stage 2: Review → Import to Database**
- Admin reviews CSV files
- Resolves dialogs (course ratings, fuzzy matches)
- Imports to database
- Moves to `/processed/{timestamp}/`

### 2. School Scraping with Meet Selection
- Admin enters School ID + seasons
- System fetches meet list (quick)
- Admin selects which meets to scrape
- System scrapes only selected meets

### 3. Hybrid Dialog Strategy
**During Scraping (Critical Only):**
- System errors blocking progress
- Missing required data

**During Import Review (Batch):**
- Course difficulty ratings
- Fuzzy athlete matches
- Venue/course ID entry (optional)

### 4. Option D: Smart Venue/Course IDs

**Problem:** Venue/Course IDs not easily extractable from meet pages

**Solution:**
- Admin can optionally provide IDs during import review
- Checkbox to "Schedule for course records scraping"
- Queue system for batch scraping later
- Progressive data enrichment

**Venue/Course URL Pattern:**
```
https://www.athletic.net/CrossCountry/rankings/venue-records/{venue_id}/{gender}/{distance}?course={course_id}
```

Examples:
- `venue-records/2281/m/5000?course=10485` → Venue 2281, Course 10485
- `venue-records/2281/m/5000?course=2281` → Venue 2281, Course 2281

### 5. Data Quality Decisions

**School Filtering:** Hybrid - scrape all, filter on import
**Grad Year:** Calculate from grade: `season_year + (12 - grade)`
**Distance Parsing:** Regex from race names with fallback to 5000m
**Course Difficulty:** Default 5.0, admin rates during import
**Performance:** Batch operations, target 10K results in <5 min

---

## File Structure

```
/to-be-processed/
  /{entityType}_{id}_{timestamp}/
    venues.csv
    courses.csv
    schools.csv
    athletes.csv
    meets.csv
    races.csv
    results.csv
    metadata.json

/processed/
  /{timestamp}/
    /{original_folder}/
      [same files]
```

---

## CSV File Formats (Quick Reference)

### venues.csv
```csv
athletic_net_id,name,city,state,notes
"698","Montgomery Hill Park","San Jose","CA",""
```

### courses.csv
```csv
athletic_net_id,name,venue_name,distance_meters,distance_display,difficulty_rating,needs_review,needs_records_scraping
"10485","Montgomery Hill 2.74 Mile","Montgomery Hill Park",4409,"2.74 Miles",7.0,"false","false"
```

### schools.csv
```csv
athletic_net_id,name,short_name,city,state,league
"1076","Westmont High School","Westmont","Campbell","CA","WCAL"
```

### athletes.csv
```csv
athletic_net_id,name,first_name,last_name,school_athletic_net_id,grad_year,gender,needs_review,fuzzy_match_score
"","Vincent Cheung","Vincent","Cheung","1082",2027,"M","false",
```

### meets.csv
```csv
athletic_net_id,name,meet_date,venue_name,season_year,meet_type
"265306","STAL #1","2025-09-11","Montgomery Hill Park",2025,"invitational"
```

### races.csv
```csv
athletic_net_race_id,meet_athletic_net_id,name,gender,distance_meters,race_type
"1053255","265306","2.74 Miles Varsity","M",4409,"Varsity"
```

### results.csv
```csv
athletic_net_race_id,athlete_name,athlete_first_name,athlete_last_name,athlete_school_id,time_cs,place_overall,grade,needs_review
"1053255","Vincent Cheung","Vincent","Cheung","1082",90530,1,12,"false"
```

---

## Python Functions to Build

### Core Scraping:
```python
get_school_meets(school_id, seasons) → List[MeetListItem]
scrape_by_school(school_id, seasons, selected_meet_ids, progress_callback) → ScrapeResult
scrape_by_meet(meet_id, progress_callback) → ScrapeResult
scrape_by_race(meet_id, race_id, progress_callback) → ScrapeResult
scrape_by_athlete(athlete_id, seasons, progress_callback) → ScrapeResult
```

### Helpers:
```python
parse_distance_from_name(race_name) → int
calculate_grad_year(grade, season_year) → int
parse_athlete_name(full_name) → (first, last)
time_to_centiseconds(time_str) → int
```

### CSV Generation:
```python
write_csv_files(scrape_result, output_folder) → Dict[str, int]
```

---

## API Endpoints to Build

```typescript
GET  /api/admin/scrape/school-meets?schoolId={id}&seasons={years}
POST /api/admin/scrape
     { entityType, entityId, seasons?, selectedMeetIds? }

GET  /api/admin/import/pending
POST /api/admin/import
     { scrapeIds, confirmations, dryRun? }

GET  /api/admin/import/history?limit=50&offset=0
```

---

## UI Components to Build

1. **ScrapeForm** - Input form with entity type selector
2. **MeetSelection** - Checkbox list for school scraping
3. **ProgressBar** - Real-time scraping progress
4. **ImportReview** - Review pending CSV folders
5. **CourseRatingDialog** - Rate new courses (1-10 slider)
6. **FuzzyMatchDialog** - Confirm athlete matches
7. **VenueCourseDialog** - Optional ID entry + schedule scraping
8. **CourseRecordsQueue** - View/manage queued courses

---

## Database Schema Updates Needed

```sql
-- Add to courses table
ALTER TABLE courses ADD COLUMN needs_records_scraping BOOLEAN DEFAULT FALSE;

-- Athletic.net IDs already exist in schema
```

---

## Validation Rules

### Critical (Must Pass):
- Time: 60000-180000 cs (10:00-30:00)
- Grad year: season_year -1 to +4
- Required fields: name, time_cs, place_overall
- No duplicates: (athlete_id, meet_id)

### Warning (Log but Allow):
- Unusual fast: < 80000 cs (sub-13:20)
- Unusual slow: > 150000 cs (25:00+)
- Grade out of range: < 9 or > 12

---

## Next Steps (Phase 2)

1. **Build Python scraper functions**
   - Start with `scrape_by_meet()` (simplest)
   - Add `get_school_meets()` for meet list
   - Then `scrape_by_school()` with meet selection
   - Add helpers (distance parsing, grad year calc, etc.)

2. **Test scraper with real data**
   - STAL #1 meet (265306)
   - Westmont school (1076) for 2025 season
   - Verify CSV output format

3. **Build CSV generation**
   - Write 7 CSV files + metadata.json
   - Create folder structure
   - Validate data before writing

**Gate Checkpoint:**
- Can scrape a single meet and generate valid CSV files
- CSV files match format specification
- All Athletic.net IDs captured
- Distance parsing working
- Grad year calculation correct

---

## Ron's Open Questions to Answer

1. **Course Difficulty Ratings:**
   - Rate courses now or as we go? → **As we go (during import)**
   - Do you have existing ratings? → **To be determined**

2. **Data Scope:**
   - Import all races (Varsity, JV, Frosh)? → **To be determined**
   - All years (2022-2025) or just 2025? → **Start with 2025**

3. **School Expansion:**
   - Just Westmont or multiple WCAL schools? → **Start with Westmont**

4. **Validation Strictness:**
   - Fail entire import on errors or skip bad records? → **To be determined**

---

## Important Context Preservation

### Time Storage (NON-NEGOTIABLE):
- **Centiseconds:** 19:30.45 = 117045 cs
- Field name: `time_cs` (INTEGER)
- Formula: `(min × 60 × 100) + (sec × 100) + cs`

### Athletic.net Data Format:
- Result line: "1. 12 Vincent Cheung 15:05.5 Silver Creek"
- Format: `Place. Grade FirstName LastName Time SchoolName`
- Grade always present (9-12)

### Colorblind Design (Ron's requirement):
- Light theme only (white/gray)
- High contrast text (gray-900)
- Yellow highlights (bg-yellow-50, border-yellow-500)
- Thick borders (2px minimum)
- No red/green color coding

---

## Files to Reference

- `/manaxc-project/00-START-HERE.md` - Project overview
- `/manaxc-project/DATA_IMPORT_SPRINT_PLAN.md` - Detailed 5-7 day plan
- `/manaxc-project/RESEARCH.md` - All technical decisions documented
- `/manaxc-project/CONTRACTS.md` - Complete technical specifications
- `/manaxc-project/code/importers/IMPORT_STRATEGY.md` - Import issues and approach
- `/manaxc-project/code/importers/athletic_net_scraper.py` - Existing scraper (has issues)
- `/manaxc-project/code/importers/import_scraped_data_batch.py` - Existing importer (has issues)

---

## Current Working Directory
```
/Users/ron/manaxc/manaxc-project
```

## Database State
- **EMPTY** - Clean slate ready for controlled imports
- All tables exist with proper schema
- Supabase connection working

## Development Server
- Next.js running at `http://localhost:3000`
- Multiple background bash processes (can be killed if needed)

---

**CRITICAL FOR NEXT SESSION:**
Read this file first, then review CONTRACTS.md and DATA_IMPORT_SPRINT_PLAN.md to understand the complete system design before proceeding with implementation.

---

**Last Updated:** October 27, 2025 - End of Planning Phase
**Next:** Build Phase 2 - Modular Python Scraper
