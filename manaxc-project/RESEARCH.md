# Data Import System - Research & Technical Decisions

**Date:** October 27, 2025
**Purpose:** Document all technical unknowns, research findings, and decisions for the ManaXC data import system.

---

## Research Questions & Findings

### 1. Athletic.net Data Structure

**Question:** What is the exact HTML structure and data format of Athletic.net pages?

**Research Findings:**
- **Meet Results Page Format:** `https://www.athletic.net/CrossCountry/meet/[meet_id]/results/[race_id]`
- **School Page Format:** `https://www.athletic.net/team/[school_id]/cross-country`
- **Result Line Format:** "1. 12 Vincent Cheung 15:05.5 Silver Creek"
  - Format: `Place. Grade FirstName LastName Time SchoolName`
  - Grade is always present (9, 10, 11, 12)
  - Time format: MM:SS.SS (with optional centiseconds)
  - School name can contain spaces

**Decision:** Use existing scraper pattern with Selenium, parse line-by-line with regex
**Rationale:** JavaScript-heavy site requires Selenium, regex proven to work
**Alternatives Considered:** BeautifulSoup (rejected - JS rendering required), Playwright (overkill)

---

### 2. School Filtering Strategy

**Question:** Should we filter during scraping or after scraping?

**Current Problem:** Scraper collects ALL schools at a meet, causing data pollution

**Options Evaluated:**

**A) Filter During Scraping:**
- Scrape only target school's athletes from result tables
- **Pros:** Less data transferred, faster
- **Cons:** More complex scraping logic, might miss edge cases

**B) Filter After Scraping:**
- Scrape all results, filter during import based on school name
- **Pros:** Simpler scraper, can re-import with different filters
- **Cons:** More data stored, slower initial scrape

**C) Hybrid: Scrape All, Store Filtered:**
- Scrape all results to JSON (keep full data)
- Import only filtered results to database
- **Pros:** Maximum flexibility, can audit data quality
- **Cons:** Larger JSON files

**Decision:** Option C (Hybrid)
**Rationale:**
- Preserves full meet data for quality checks
- Allows re-importing with different school filters
- JSON files are already being generated anyway
- Database stays clean with only target school data

**Implementation:**
```python
def filter_results_by_school(results, target_school_name):
    """
    Filter results to only include athletes from target school.
    Case-insensitive match, handles variations like "Westmont" vs "Westmont High"
    """
    filtered = []
    for result in results:
        school = result.get('school_name', '').lower()
        target = target_school_name.lower()
        if target in school or school in target:
            filtered.append(result)
    return filtered
```

---

### 3. Graduation Year Calculation

**Question:** How do we accurately calculate graduation year from grade level?

**Current Problem:** All athletes default to `datetime.now().year + 1`

**Formula:** `grad_year = season_year + (12 - grade)`

**Examples:**
- Grade 9 in 2025 season → 2025 + (12-9) = **2028**
- Grade 10 in 2025 season → 2025 + (12-10) = **2027**
- Grade 11 in 2025 season → 2025 + (12-11) = **2026**
- Grade 12 in 2025 season → 2025 + (12-12) = **2025**

**Edge Cases to Handle:**

1. **Missing Grade Data:**
   - Default to `season_year + 1` (assume senior)
   - Log warning for manual review

2. **Grade < 9 or > 12:**
   - Log error, skip athlete
   - Likely data quality issue

3. **Post-Graduate (Grade 13):**
   - Set to `season_year` (already graduated)
   - Flag as `is_post_grad = true`

**Decision:** Implement calculation with edge case handling
**Rationale:** Grade data is consistently available in Athletic.net results
**Validation:** After import, check grad_year distribution matches expected (e.g., 2025-2028 for 2025 season)

**Implementation:**
```python
def calculate_grad_year(grade, season_year):
    """
    Calculate graduation year from current grade and season.

    Args:
        grade (int): Current grade (9-12)
        season_year (int): Season year (e.g., 2025)

    Returns:
        int: Graduation year

    Raises:
        ValueError: If grade is invalid
    """
    if grade < 9 or grade > 13:
        raise ValueError(f"Invalid grade: {grade}. Must be 9-13.")

    if grade == 13:  # Post-grad
        return season_year

    return season_year + (12 - grade)
```

---

### 4. Distance Parsing from Race Names

**Question:** How do we extract accurate course distances from race names?

**Current Problem:** All courses default to 5000m

**Race Name Formats Found:**
- "2.74 Miles Varsity" → 4409 meters
- "2.95 Miles JV" → 4748 meters
- "3 Mile Varsity" → 4828 meters (exactly 3 miles)
- "5K Varsity" → 5000 meters
- "5000m Varsity" → 5000 meters

**Conversion Constants:**
- 1 mile = 1609.34 meters
- 1 kilometer = 1000 meters

**Decision:** Parse with regex pattern matching
**Rationale:** Limited number of distance formats in high school XC
**Alternatives Considered:** Manual entry (rejected - too time consuming), ML parsing (overkill)

**Implementation:**
```python
import re

def parse_distance_from_name(race_name):
    """
    Extract distance in meters from race name.

    Examples:
        "2.74 Miles Varsity" → 4409
        "5K JV" → 5000
        "3 Mile Varsity" → 4828

    Args:
        race_name (str): Race name containing distance

    Returns:
        int: Distance in meters, or 5000 if can't parse
    """
    race_name = race_name.lower()

    # Try miles pattern: "2.74 miles", "3 mile"
    miles_match = re.search(r'(\d+\.?\d*)\s*miles?', race_name)
    if miles_match:
        miles = float(miles_match.group(1))
        return int(miles * 1609.34)

    # Try kilometers pattern: "5k", "5000m"
    km_match = re.search(r'(\d+\.?\d*)\s*k(?:m)?', race_name)
    if km_match:
        km = float(km_match.group(1))
        return int(km * 1000)

    meters_match = re.search(r'(\d+)\s*m(?:eters)?', race_name)
    if meters_match:
        return int(meters_match.group(1))

    # Default to 5K if can't parse
    return 5000
```

**Validation:** After parsing, log any race with distance != 5000 for manual review

---

### 5. Course Difficulty Estimation

**Question:** How do we estimate course difficulty without manual ratings?

**Current Problem:** All courses default to 5.0 difficulty

**Options Evaluated:**

**A) Historical Time Analysis:**
- Compare average winning times across courses
- Slower average = harder course
- **Pros:** Data-driven, objective
- **Cons:** Requires multiple seasons of data, affected by athlete quality

**B) Manual Coach Input:**
- Ron rates each course based on experience
- Store in database or config file
- **Pros:** Accurate from expert knowledge
- **Cons:** Manual work, subjective, doesn't scale

**C) Default + Manual Override:**
- Start with default 5.0 for all courses
- Provide UI for Ron to update ratings over time
- **Pros:** Low initial overhead, improves over time
- **Cons:** Takes time to build ratings database

**D) Parse from Athletic.net Course Pages:**
- Athletic.net has course descriptions ("hilly", "fast", "challenging")
- Scrape course metadata if available
- **Pros:** Leverage existing data
- **Cons:** Not all courses have descriptions, still subjective

**Decision:** Option C (Default + Manual Override)
**Rationale:**
- MVP needs to launch quickly
- Course difficulty is "nice to have" not critical
- Ron can refine ratings over time as he sees results
- Can implement Options A or D later

**Implementation Plan:**
1. All courses start with difficulty = 5.0
2. Build admin UI: `/admin/courses/[id]/edit` with difficulty slider (1-10)
3. Track `difficulty_updated_at` timestamp
4. Future: Add "suggested difficulty" based on historical times

---

### 6. Performance & Scalability

**Question:** How do we handle large imports (15K+ results) without timeouts?

**Current Problem:** Silver Creek 2025 (15,496 results) timed out during import

**Root Causes:**
1. **Duplicate checking per record:** O(n²) complexity
2. **Individual database calls:** Network overhead per insert
3. **No connection pooling:** Opening new connections repeatedly
4. **No progress checkpoints:** Can't resume if fails

**Solutions:**

**A) Batch Operations:**
```python
# Instead of:
for athlete in athletes:
    check_if_exists(athlete)
    insert_if_new(athlete)

# Do:
existing = batch_check_exists(athletes)  # Single query
new_athletes = [a for a in athletes if a not in existing]
batch_insert(new_athletes)  # Single query
```

**B) Chunk Processing:**
```python
CHUNK_SIZE = 100  # Process 100 records at a time

for chunk in chunks(results, CHUNK_SIZE):
    process_batch(chunk)
    save_checkpoint(chunk_index)
```

**C) Connection Pooling:**
```python
# Supabase client already pools, but ensure we're reusing
supabase = create_client(url, key)  # Reuse this instance
```

**D) Background Jobs:**
- For imports > 5K results, run as background job
- Return job_id immediately, poll for status
- Store progress in database

**Decision:** Implement A, B, C for Phase 3; D if still have issues
**Rationale:** Most imports will be < 5K results, batching should solve it
**Target Performance:** 10K results in < 5 minutes

---

### 7. Data Validation Rules

**Question:** What validation rules should we enforce before importing?

**Critical Validations (Must Pass):**

1. **Time Range:** 60000 - 180000 cs (10:00 - 30:00 for XC)
2. **Grad Year:** season_year - 1 to season_year + 4 (e.g., 2024-2029 for 2025 season)
3. **School Match:** If filtered, all athletes must match target school
4. **Foreign Keys:** All referenced IDs must exist
5. **Duplicates:** No duplicate (athlete_id, meet_id) pairs
6. **Required Fields:** name, time_cs, place must be present

**Warning Validations (Log but Allow):**

1. **Unusual Times:** < 80000 cs (sub-13:20) or > 150000 cs (25:00+)
2. **Grade Issues:** grade < 9 or > 12
3. **Missing Data:** gender, school_name empty

**Decision:** Implement validation layer before any database writes
**Rationale:** Prevention better than cleanup; catches scraping bugs early

**Implementation:**
```python
def validate_result(result, season_year, target_school=None):
    """
    Validate a single result before import.

    Returns:
        (bool, list): (is_valid, list_of_errors)
    """
    errors = []
    warnings = []

    # Critical validations
    if not result.get('time_cs'):
        errors.append("Missing time_cs")
    elif result['time_cs'] < 60000 or result['time_cs'] > 180000:
        errors.append(f"Invalid time: {result['time_cs']} cs")

    if target_school:
        if target_school.lower() not in result.get('school_name', '').lower():
            errors.append(f"School mismatch: {result['school_name']} != {target_school}")

    # Warning validations
    if result.get('time_cs', 0) < 80000:
        warnings.append(f"Unusually fast time: {result['time_cs']} cs")

    return len(errors) == 0, errors, warnings
```

---

### 8. Web UI Technology Stack

**Question:** What should we use for the admin import interface?

**Current Stack:**
- Next.js 16 (App Router)
- React 18+
- Tailwind CSS
- TypeScript

**UI Library Options:**

**A) Headless UI + Custom:**
- Headless UI for accessibility
- Custom styling with Tailwind
- **Pros:** Lightweight, full control
- **Cons:** More work to build

**B) shadcn/ui:**
- Pre-built accessible components
- Styled with Tailwind
- Copy/paste, not installed
- **Pros:** Fast to build, consistent
- **Cons:** Need to adapt for colorblind design

**C) Radix UI:**
- Unstyled primitive components
- Add Tailwind styling
- **Pros:** Accessible, flexible
- **Cons:** More styling work

**Decision:** Option B (shadcn/ui)
**Rationale:**
- Already familiar from other projects
- Accessible by default
- Can customize colors for Ron's needs
- Fast development

**Colorblind Adaptations:**
- Replace green/red with yellow/blue
- High contrast: gray-900 text on white
- Thick borders (2px minimum)
- No color-only indicators (add icons/text)

---

### 9. API Design Pattern

**Question:** Should we use REST or GraphQL for import APIs?

**Options:**

**A) REST:**
```typescript
POST /api/admin/import/school
POST /api/admin/import/meet
POST /api/admin/import/race
GET /api/admin/import/status/:jobId
```

**B) GraphQL:**
```graphql
mutation ImportSchool($schoolId: String!, $season: Int!) {
  importSchool(schoolId: $schoolId, season: $season) {
    jobId
    status
  }
}
```

**Decision:** Option A (REST)
**Rationale:**
- Simpler for this use case
- File uploads easier with REST
- Already using Next.js API routes
- Don't need GraphQL's query flexibility here

**API Contract:**

```typescript
// POST /api/admin/import/school
interface ImportSchoolRequest {
  schoolId: string;          // Athletic.net school ID
  seasonYear: number;        // e.g., 2025
  targetSchoolName: string;  // For filtering
  preview: boolean;          // If true, return preview without importing
}

interface ImportResponse {
  success: boolean;
  jobId?: string;            // For background jobs
  preview?: ImportPreview;   // If preview=true
  errors?: string[];
}

interface ImportPreview {
  athletes: number;
  venues: number;
  courses: number;
  meets: number;
  races: number;
  results: number;
  sampleAthletes: Array<{name: string, gradYear: number}>;
  gradYearDistribution: Record<number, number>;
  dateRange: {earliest: string, latest: string};
  warnings: string[];
}
```

---

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| School Filtering | Filter after scraping | Flexibility, data quality checks |
| Grad Year | Calculate from grade | Accurate, data available |
| Distance Parsing | Regex pattern matching | Limited formats, reliable |
| Course Difficulty | Default 5.0 + manual override | Fast launch, improve over time |
| Performance | Batch + chunks + pooling | Handle 10K+ results |
| Validation | Strict rules before import | Prevent bad data |
| UI Library | shadcn/ui + custom colors | Fast, accessible, customizable |
| API Pattern | REST with Next.js routes | Simple, appropriate for use case |

---

## Open Questions for Ron

1. **Course Difficulty Ratings:**
   - Would you prefer to rate courses now or as we use them?
   - Do you have existing ratings we should import?

2. **Data Scope:**
   - Import all races (Varsity, JV, Frosh) or just Varsity?
   - Import all years (2022-2025) or just 2025?

3. **School Expansion:**
   - Just Westmont for now, or plan for multiple WCAL schools?
   - Impact: database indexes, query patterns

4. **Validation Strictness:**
   - Fail entire import on validation errors, or skip bad records?
   - How much logging do you want?

---

**Next Steps:**
1. Review this research doc
2. Answer open questions
3. Move to Phase 1: Define Contracts

**Last Updated:** October 27, 2025
