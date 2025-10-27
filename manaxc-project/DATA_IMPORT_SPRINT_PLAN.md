# Data Import Sprint Plan - ManaXC

**Sprint Goal:** Build a robust, web-based data import system that allows controlled importing of Athletic.net data with full validation and quality checks.

**Sprint Duration:** 5-7 days
**Last Updated:** October 27, 2025

---

## Sprint Overview

### Why This Sprint Matters

The previous import attempts revealed critical issues:
1. ALL schools at a meet were imported (not just target school)
2. Graduation years not calculated from grade level
3. Course metadata all defaulting instead of being parsed
4. Large imports timeout
5. No web interface for controlled imports

**This sprint solves these problems by building a modular, tested, web-based import system.**

---

## Sprint Phases

### Phase 1: Modular Scraping Functions (Days 1-2)

**Goal:** Break down monolithic scraper into targeted, testable functions

#### 1.1 School-Level Scraping

**File:** `code/importers/athletic_net_scraper_modular.py`

```python
def scrape_school_info(school_id):
    """
    Scrape basic school information from Athletic.net

    Args:
        school_id (str): Athletic.net school ID

    Returns:
        dict: {
            'athletic_net_id': str,
            'name': str,
            'city': str,
            'state': str,
            'league': str (if available)
        }
    """
    pass

def scrape_school_season(school_id, season_year, target_school_name=None):
    """
    Scrape full season results for a school, FILTERED to that school's athletes only

    Args:
        school_id (str): Athletic.net school ID
        season_year (int): Season year (e.g., 2025)
        target_school_name (str): School name to filter by (e.g., "Westmont")

    Returns:
        dict: {
            'school_id': str,
            'season_year': int,
            'meets_count': int,
            'meets': [meet_data, ...],
            'total_results': int,
            'filtered_results': int  # Only target school athletes
        }

    Filtering Strategy:
        - After scraping each meet, filter results to only include athletes
          where result['school_name'] == target_school_name
        - Log how many results were filtered out
    """
    pass
```

#### 1.2 Meet-Level Scraping

```python
def scrape_meet_info(meet_id):
    """
    Scrape meet metadata (name, date, location)

    Args:
        meet_id (str): Athletic.net meet ID

    Returns:
        dict: {
            'athletic_net_id': str,
            'name': str,
            'date': str (ISO format YYYY-MM-DD),
            'venue_name': str,
            'location': str,
            'num_races': int
        }
    """
    pass

def scrape_meet_races(meet_id):
    """
    Get list of all races at a meet

    Args:
        meet_id (str): Athletic.net meet ID

    Returns:
        list: [{
            'race_id': str,
            'race_name': str,  # e.g., "2.74 Miles Varsity"
            'gender': str,     # 'M' or 'F'
            'distance_text': str,  # "2.74 Miles", "5K", etc.
            'distance_meters': int,  # calculated
            'race_type': str   # "Varsity", "JV", etc.
        }, ...]
    """
    pass

def scrape_meet_all_results(meet_id, school_filter=None):
    """
    Scrape all races at a meet, optionally filtered to one school

    Args:
        meet_id (str): Athletic.net meet ID
        school_filter (str): Optional school name to filter by

    Returns:
        dict: {
            'meet_id': str,
            'races': [{
                'race_id': str,
                'results': [result_data, ...]
            }, ...]
        }
    """
    pass
```

#### 1.3 Race-Level Scraping

```python
def scrape_race_results(race_id, school_filter=None):
    """
    Scrape results for a single race

    Args:
        race_id (str): Athletic.net race ID (from meet results page)
        school_filter (str): Optional school name to filter by

    Returns:
        dict: {
            'race_id': str,
            'race_name': str,
            'gender': str,
            'results': [{
                'place': int,
                'grade': int,
                'athlete_name': str,
                'time_str': str,
                'time_cs': int,
                'school_name': str
            }, ...]
        }
    """
    pass
```

#### 1.4 Helper Functions

```python
def parse_distance_from_name(race_name):
    """
    Extract distance in meters from race name

    Examples:
        "2.74 Miles Varsity" → 4409 meters
        "2.95 Miles JV" → 4748 meters
        "5K Varsity" → 5000 meters
        "3 Mile Varsity" → 4828 meters

    Args:
        race_name (str): Race name containing distance

    Returns:
        int: Distance in meters, or 5000 if can't parse
    """
    pass

def calculate_grad_year(grade, season_year):
    """
    Calculate graduation year from current grade and season

    Formula: grad_year = season_year + (12 - grade)

    Examples:
        Grade 9 in 2025 season → 2025 + (12-9) = 2028
        Grade 10 in 2025 season → 2025 + (12-10) = 2027
        Grade 11 in 2025 season → 2025 + (12-11) = 2026
        Grade 12 in 2025 season → 2025 + (12-12) = 2025

    Args:
        grade (int): Current grade (9-12)
        season_year (int): Season year

    Returns:
        int: Graduation year
    """
    if grade < 9 or grade > 12:
        return season_year + 1  # Default for edge cases
    return season_year + (12 - grade)
```

**Testing Checklist:**
- [ ] Scrape Westmont school info (ID 1076)
- [ ] Scrape STAL #1 meet info (ID 265306)
- [ ] Scrape single race results with school filter
- [ ] Verify distance parsing for various formats
- [ ] Verify grad_year calculation for all grades
- [ ] Verify school filtering removes non-target athletes

---

### Phase 2: Import Data Pipeline Enhancement (Days 2-3)

**Goal:** Update import scripts to use corrected data

#### 2.1 Enhanced Batch Importer

**File:** `code/importers/import_scraped_data_v2.py`

**Changes from v1:**
1. **School Filtering Validation**
   - Verify all athletes belong to target school
   - Log any athletes from wrong schools
   - Fail import if school mismatch detected

2. **Graduation Year Calculation**
   - Use `calculate_grad_year(grade, season_year)` instead of default
   - Validate grad_years are reasonable (2025-2029 for 2025 season)

3. **Course Distance Parsing**
   - Use `parse_distance_from_name(race_name)` for distance
   - Store parsed distance in courses table
   - Log if distance couldn't be parsed

4. **Performance Improvements**
   - Batch size of 100 records max
   - Progress checkpoints every 500 records
   - Connection pooling
   - Retry logic for transient failures

5. **Validation Before Insert**
   - Check all required fields present
   - Validate time_cs range (60000-180000 for typical XC times)
   - Validate dates are reasonable
   - Check for duplicates before batch insert

**New Functions:**

```python
def validate_import_data(data, target_school_name):
    """
    Validate scraped data before import

    Checks:
        - All athletes belong to target school
        - Grad years are reasonable
        - Times are in valid range
        - Dates are valid
        - No obvious duplicates

    Returns:
        (bool, list): (is_valid, list_of_errors)
    """
    pass

def preview_import(data):
    """
    Generate preview summary of what will be imported

    Returns:
        dict: {
            'schools': int,
            'athletes': int,
            'venues': int,
            'courses': int,
            'meets': int,
            'races': int,
            'results': int,
            'sample_athletes': [athlete_names...],
            'grad_year_distribution': {2025: 5, 2026: 8, ...},
            'date_range': (earliest_date, latest_date)
        }
    """
    pass
```

**Testing Checklist:**
- [ ] Import Westmont 2025 season (filtered)
- [ ] Verify only Westmont athletes imported
- [ ] Verify grad_years calculated correctly
- [ ] Verify course distances parsed
- [ ] Verify no performance issues with 2K records
- [ ] Test validation catches bad data

---

### Phase 3: Web-Based Import Interface (Days 3-5)

**Goal:** Build admin UI for controlled imports without Claude Code

#### 3.1 API Endpoints

**File:** `website/app/api/admin/import/route.ts`

**Endpoints:**

```typescript
// POST /api/admin/import/school
// Import full season for a school
{
  schoolId: string,
  seasonYear: number,
  targetSchoolName: string,  // For filtering
  preview: boolean  // If true, return preview without importing
}

// POST /api/admin/import/meet
// Import single meet, optionally filtered
{
  meetId: string,
  schoolFilter?: string,  // Optional school name filter
  preview: boolean
}

// POST /api/admin/import/race
// Import single race
{
  raceId: string,
  schoolFilter?: string,
  preview: boolean
}

// GET /api/admin/import/status/:jobId
// Check status of background import job
{
  jobId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  progress: {
    current: number,
    total: number,
    phase: string
  },
  errors: string[]
}
```

#### 3.2 Import UI Pages

**Location:** `website/app/admin/import/page.tsx`

**Features:**

1. **Import Type Selector**
   - Radio buttons: School Season / Single Meet / Single Race
   - Shows different form fields based on selection

2. **School Season Import Form**
   - Input: Athletic.net School ID
   - Input: Season Year (dropdown: 2022-2025)
   - Input: School Name (for filtering)
   - Button: "Preview Import"
   - Shows preview panel with stats
   - Button: "Confirm Import" (only after preview)

3. **Meet Import Form**
   - Input: Athletic.net Meet ID
   - Input: School Filter (optional)
   - Checkbox: "Import all schools at meet"
   - Button: "Preview Import"
   - Shows preview panel
   - Button: "Confirm Import"

4. **Race Import Form**
   - Input: Athletic.net Race ID
   - Input: School Filter (optional)
   - Button: "Preview Import"
   - Shows preview panel
   - Button: "Confirm Import"

5. **Preview Panel**
   - Summary stats (athletes, meets, races, results)
   - Sample data table (first 10 athletes)
   - Grad year distribution chart
   - Validation warnings (if any)
   - Estimated import time

6. **Progress Display**
   - Progress bar with percentage
   - Current phase indicator
   - Estimated time remaining
   - Real-time log of actions

7. **Results Panel**
   - Success message with stats
   - Links to imported data (athletes page, meets page)
   - Error log (if any issues)
   - Button: "Import Another"

**UI Design (Colorblind-Friendly):**
- Light background (#FFFFFF)
- High contrast text (#1F2937)
- Yellow highlights for warnings (#FEF3C7 background, #F59E0B border)
- Blue for info (#DBEAFE background, #3B82F6 border)
- Thick borders (2px minimum)
- Large, clear buttons
- No red/green color coding

**Example UI Flow:**

```
┌─────────────────────────────────────────────────────┐
│ Admin > Data Import                                  │
├─────────────────────────────────────────────────────┤
│                                                       │
│ Import Type:                                         │
│ ○ School Season  ○ Single Meet  ● Single Race       │
│                                                       │
│ ┌─────────────────────────────────────────────┐    │
│ │ Race Import Form                             │    │
│ │                                              │    │
│ │ Athletic.net Race ID:                        │    │
│ │ [265306_____________________]                │    │
│ │                                              │    │
│ │ School Filter (optional):                    │    │
│ │ [Westmont___________________]                │    │
│ │                                              │    │
│ │ [Preview Import]                             │    │
│ └─────────────────────────────────────────────┘    │
│                                                       │
│ ┌─────────────────────────────────────────────┐    │
│ │ ⚠️  Import Preview                           │    │
│ │                                              │    │
│ │ Will Import:                                 │    │
│ │ • 15 athletes (all from Westmont)            │    │
│ │ • 1 race (Varsity Boys)                      │    │
│ │ • 15 results                                 │    │
│ │                                              │    │
│ │ Grad Year Distribution:                      │    │
│ │ 2025: 3 athletes                             │    │
│ │ 2026: 4 athletes                             │    │
│ │ 2027: 5 athletes                             │    │
│ │ 2028: 3 athletes                             │    │
│ │                                              │    │
│ │ Sample Athletes:                             │    │
│ │ 1. John Smith (Grade 10, 2027)               │    │
│ │ 2. Sarah Johnson (Grade 11, 2026)            │    │
│ │ 3. Mike Chen (Grade 9, 2028)                 │    │
│ │ ...                                          │    │
│ │                                              │    │
│ │ ✓ All validation checks passed               │    │
│ │                                              │    │
│ │ [Confirm Import] [Cancel]                    │    │
│ └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**Testing Checklist:**
- [ ] UI renders correctly
- [ ] Preview works without importing
- [ ] Validation warnings display
- [ ] Import progress updates in real-time
- [ ] Success/error messages clear
- [ ] Can repeat imports without issues
- [ ] Works on mobile (Ron's iPad)

---

### Phase 4: Testing & Validation (Days 5-6)

**Goal:** Test all import paths with real data

#### 4.1 Test Scenarios

**Scenario 1: Single Race Import**
- Race: STAL #1 Varsity Boys
- School Filter: Westmont
- Expected: ~15 athletes, all Westmont
- Validation:
  - [ ] Only Westmont athletes imported
  - [ ] Grad years: 2025-2028
  - [ ] Times: 90000-120000 cs (15:00-20:00)
  - [ ] All athletes linked to Westmont school
  - [ ] Race distance: 4409 meters (2.74 miles)

**Scenario 2: Single Meet Import (Filtered)**
- Meet: STAL #1 (ID 265306)
- School Filter: Westmont
- Expected: ~4 races (Varsity Boys/Girls, JV Boys/Girls), ~60 results
- Validation:
  - [ ] All races created
  - [ ] Only Westmont athletes
  - [ ] Multiple distances parsed correctly
  - [ ] No duplicates

**Scenario 3: School Season Import**
- School: Westmont (ID 1076)
- Season: 2025
- Expected: ~5 meets, ~300 results
- Validation:
  - [ ] All meets from season
  - [ ] Only Westmont athletes
  - [ ] Grad year distribution reasonable
  - [ ] No missing meets
  - [ ] PR flags calculated

**Scenario 4: Multi-School Meet (No Filter)**
- Meet: STAL #1
- School Filter: None
- Expected: ALL schools, ~300 results
- Validation:
  - [ ] Multiple schools imported
  - [ ] Each athlete linked to correct school
  - [ ] No school misattribution
  - [ ] Grad years calculated per athlete

**Scenario 5: Error Handling**
- Invalid school ID
- Invalid meet ID
- Malformed data
- Network timeout
- Expected: Clear error messages, no partial imports

#### 4.2 Data Quality Checklist

After each import, verify:
- [ ] **School Attribution**
  - Query: `SELECT DISTINCT school_id FROM athletes WHERE school_id != [expected]`
  - Should return 0 rows for filtered imports
- [ ] **Graduation Years**
  - Query: `SELECT grad_year, COUNT(*) FROM athletes GROUP BY grad_year`
  - Should show distribution: 2025-2028 for 2025 season
  - No year < 2025 or > 2029
- [ ] **Time Ranges**
  - Query: `SELECT MIN(time_cs), MAX(time_cs) FROM results`
  - Should be 60000-180000 cs (10:00-30:00) for XC
- [ ] **Course Distances**
  - Query: `SELECT DISTINCT distance_meters FROM courses`
  - Should show 4409, 4748, 4828, 5000 (not all 5000)
- [ ] **Duplicates**
  - Query: `SELECT athlete_id, meet_id, COUNT(*) FROM results GROUP BY athlete_id, meet_id HAVING COUNT(*) > 1`
  - Should return 0 rows
- [ ] **Foreign Keys**
  - All athletes have valid school_id
  - All results have valid athlete_id, meet_id, race_id
  - All meets have valid course_id (if set)

---

### Phase 5: Documentation & Handoff (Day 6-7)

**Goal:** Document everything so Ron can use system independently

#### 5.1 Update Documentation

**Files to Update:**
1. `code/importers/README.md` - Add modular scraping docs
2. `IMPORT_STRATEGY.md` - Update with implementation details
3. `website/README.md` - Add admin import interface docs
4. Create `IMPORT_USER_GUIDE.md` - Step-by-step for Ron

**Import User Guide Contents:**
```markdown
# ManaXC Data Import User Guide

## Quick Start

1. Go to http://localhost:3000/admin/import (or manaxc.com/admin/import)
2. Choose import type (School Season / Meet / Race)
3. Enter Athletic.net ID
4. Click "Preview Import"
5. Review preview (check athlete names, grad years, counts)
6. Click "Confirm Import"
7. Wait for completion
8. Verify data on website

## Finding Athletic.net IDs

### School ID
- Go to school's Athletic.net page
- URL: https://www.athletic.net/team/[school_id]/cross-country
- Example: Westmont is 1076

### Meet ID
- Go to meet results page
- URL: https://www.athletic.net/CrossCountry/meet/[meet_id]/results
- Example: STAL #1 2025 is 265306

### Race ID
- On meet results page, click specific race
- URL: https://www.athletic.net/CrossCountry/meet/[meet_id]/results/[race_id]

## Troubleshooting

### Import Taking Too Long
- Large imports (1000+ results) may take 5-10 minutes
- Check progress bar
- Don't close browser tab

### Wrong Athletes Imported
- Make sure you entered school filter correctly
- School name must match exactly (e.g., "Westmont" not "Westmont High")
- Use preview to verify before importing

### Duplicate Results
- System prevents duplicates automatically
- Re-running same import will skip existing records

### Graduation Years Wrong
- Grad years calculated from grade level
- Grade 10 in 2025 season = grad year 2027
- If wrong, may need to manually correct in database
```

#### 5.2 Create Video Walkthrough (Optional)

Record screen capture showing:
1. Finding Athletic.net IDs
2. Using import interface
3. Previewing import
4. Confirming import
5. Verifying imported data on website
6. Troubleshooting common issues

---

## Sprint Success Criteria

### Must Have (Required for Sprint Completion)
- [ ] Modular scraping functions working and tested
- [ ] School filtering working (only target school imported)
- [ ] Grad year calculation working
- [ ] Course distance parsing working
- [ ] Web import interface functional
- [ ] Preview feature working
- [ ] Can import Westmont 2025 season successfully
- [ ] Data quality validation passing
- [ ] Documentation complete
- [ ] Ron can use system without Claude Code

### Nice to Have (Post-Sprint Enhancements)
- [ ] Background job processing for large imports
- [ ] Email notifications when import completes
- [ ] Import history log (who imported what when)
- [ ] Bulk delete function (undo imports)
- [ ] Auto-scrape scheduling (weekly updates)
- [ ] Export to CSV function
- [ ] Data migration tools (move between environments)

---

## Risk Management

### High Priority Risks

**Risk 1: Performance Issues with Large Imports**
- **Mitigation:** Batch processing, progress checkpoints, timeout handling
- **Fallback:** Manual import via Python scripts

**Risk 2: Athletic.net Changes HTML Structure**
- **Mitigation:** Robust parsing with fallbacks, extensive logging
- **Fallback:** Manual data entry for critical meets

**Risk 3: Data Quality Issues Not Caught**
- **Mitigation:** Comprehensive validation, preview before import
- **Fallback:** Manual database cleanup queries

**Risk 4: Ron Can't Use Interface**
- **Mitigation:** User testing, clear documentation, video walkthrough
- **Fallback:** Provide Claude Code access for imports

---

## Daily Standup Template

### Day 1 (Modular Scraping - Part 1)
- **Goal:** Create school and meet scraping functions
- **Deliverables:** `athletic_net_scraper_modular.py` with school/meet functions
- **Tests:** Scrape Westmont school info, STAL #1 meet info

### Day 2 (Modular Scraping - Part 2)
- **Goal:** Create race scraping and helper functions
- **Deliverables:** Race scraping, distance parsing, grad year calculation
- **Tests:** Scrape single race, verify filtering works

### Day 3 (Import Pipeline)
- **Goal:** Update import scripts with data quality fixes
- **Deliverables:** `import_scraped_data_v2.py` with validation
- **Tests:** Import filtered data, verify quality checks

### Day 4 (Web Interface - Backend)
- **Goal:** Build API endpoints for import
- **Deliverables:** `/api/admin/import/*` endpoints
- **Tests:** Test API with Postman/Thunder Client

### Day 5 (Web Interface - Frontend)
- **Goal:** Build admin import UI
- **Deliverables:** `/admin/import` page with preview
- **Tests:** Manual UI testing, verify preview works

### Day 6 (Testing & Validation)
- **Goal:** Test all scenarios, verify data quality
- **Deliverables:** Completed test scenarios, quality validation
- **Tests:** All 5 test scenarios passing

### Day 7 (Documentation & Handoff)
- **Goal:** Complete documentation, train Ron
- **Deliverables:** Updated docs, user guide
- **Tests:** Ron successfully imports data independently

---

## Post-Sprint: Next Steps

### Immediate (Week 2)
1. Import Westmont 2022-2024 historical data
2. Import Silver Creek 2025 season (second school)
3. Refine course difficulty ratings
4. Build athlete profile pages

### Short-Term (Weeks 3-4)
1. Auto-scrape weekly for new results
2. Email notifications for new PRs
3. Implement PR calculation triggers
4. Build standardized time algorithm

### Long-Term (Months 2-3)
1. Expand to all WCAL schools
2. Build team comparison features
3. Add race predictor
4. Mobile app development

---

**Last Updated:** October 27, 2025
**Status:** Ready to Begin
**Owner:** Claude Code + Ron
**Sprint Start:** Today
