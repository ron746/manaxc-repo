# Athletic.net Import Strategy

## Issues Identified

1. **School Misidentification**: Athletes from multiple schools were all assigned to one school
2. **Graduation Year**: All athletes defaulting to same grad_year
3. **Course Difficulty**: Default 5.0 not accurate
4. **PR Calculation**: Season PRs not being calculated
5. **Performance**: Large imports (15K+ results) timeout or fail

## Root Causes

### 1. School Misidentification
- **Problem**: Scraper gets results from ALL schools at a meet, not just the target school
- **Example**: STAL #1 meet has Westmont, Silver Creek, Andrew Hill, etc. all mixed together
- **Fix Needed**: Filter results by school AFTER scraping, or scrape only target school's athletes

### 2. Graduation Year Calculation
- **Problem**: Using `datetime.now().year + 1` as default
- **Have**: Grade level from scraped data (9, 10, 11, 12)
- **Need**: Calculate `grad_year = season_year + (12 - grade)`
- **Example**: Grade 10 in 2025 season → grad_year = 2025 + (12-10) = 2027

### 3. Course Difficulty & Distance
- **Problem**: All courses default to 5.0 difficulty, 5000m
- **Have**: Race distance in race name ("2.74 Miles", "2.95 Miles")
- **Need**: Parse distance from race name, estimate difficulty from course name

### 4. PR Calculation
- **Problem**: Not setting `is_pr` flag or calculating `standardized_mile_cs`
- **Need**: After importing, calculate PRs per athlete per season

## Proposed Phased Approach

### Phase 1: Manual Table-by-Table Import (THIS SESSION)
Build separate scripts for each table to understand the data flow:

1. **schools_import.py** - Import schools one at a time
2. **athletes_import.py** - Import athletes for ONE school
3. **venues_courses_import.py** - Import venues and courses from meet data
4. **meets_import.py** - Import meets with proper dates
5. **races_import.py** - Import races for ONE meet
6. **results_import.py** - Import results for ONE race

**Benefits**:
- Test each step independently
- Verify data quality at each stage
- Easy to debug issues
- Build up knowledge of data relationships

### Phase 2: Filtered School Import
Enhance scraper to:
- Filter results to ONLY athletes from target school
- Or: Accept school name as parameter to filter post-scrape

### Phase 3: Data Quality Enhancements
- Parse distances from race names
- Calculate grad_year from grade
- Estimate course difficulty from historical data
- Calculate PRs after import

### Phase 4: Optimized Batch Import
- True bulk operations (not one-by-one checks)
- Chunk processing for large datasets
- Progress tracking
- Resume capability

## Implementation Plan

See `DATA_IMPORT_SPRINT_PLAN.md` for comprehensive 5-7 day implementation plan.

### Phase 1: Modular Scraping Functions (Days 1-2)
Create targeted scraping functions:
- `scrape_school_info(school_id)` - Get school metadata
- `scrape_school_season(school_id, season, filter)` - Full season with filtering
- `scrape_meet_info(meet_id)` - Meet metadata
- `scrape_meet_races(meet_id)` - All races at meet
- `scrape_race_results(race_id, filter)` - Single race results
- `parse_distance_from_name(race_name)` - Extract distance in meters
- `calculate_grad_year(grade, season)` - Calculate from grade level

### Phase 2: Enhanced Import Pipeline (Days 2-3)
Update import scripts with:
- School filtering validation
- Grad year calculation from grade
- Course distance parsing from race names
- Performance improvements (batching, retry logic)
- Comprehensive validation before insert
- Preview functionality

### Phase 3: Web Import Interface (Days 3-5)
Build `/admin/import` page:
- Import by School Season, Meet, or Race
- Preview before importing
- Real-time progress tracking
- Validation warnings
- Colorblind-friendly UI

### Phase 4: Testing & Validation (Days 5-6)
Test all import paths:
- Single race (filtered)
- Single meet (filtered)
- Full school season
- Multi-school meet (no filter)
- Error handling

### Phase 5: Documentation (Days 6-7)
Complete user documentation so Ron can import independently

## Data Validation Checklist

After each import, verify:
- [ ] Athletes belong to correct school
- [ ] Grad years range from 2026-2029 for current season
- [ ] Times are reasonable (60000-180000 cs = 10:00-30:00)
- [ ] Meet dates are valid
- [ ] Course distances match race names
- [ ] No duplicate results

## Questions to Answer Before Full Import

1. Should we filter scraped data to target school only, or keep all schools?
2. How to handle athletes that run for multiple schools?
3. Should course difficulty be manual or calculated?
4. Do we want to import ALL races or just varsity?
5. How to handle missing/incomplete data (no date, no grade, etc)?

---

**DECISION**: Start with small, controlled import of ONE meet, ONE race, ONE school to validate the entire data flow before attempting larger imports.
