# Data Import System - Technical Contracts

**Date:** October 27, 2025
**Purpose:** Define all interfaces, data structures, and API contracts for the ManaXC data import system.

---

## User Requirements Summary

### Two-Stage Import Process:

**Stage 1: Scrape Data**
- User enters Athletic.net ID (School, Meet, Race, or Athlete)
- User selects seasons to scrape
- System scrapes data immediately (blocking UI with progress bar)
- System generates 7 CSV files:
  1. `venues.csv`
  2. `courses.csv`
  3. `schools.csv`
  4. `athletes.csv`
  5. `meets.csv`
  6. `races.csv`
  7. `results.csv`
- Files stored in `/to-be-processed/{entityType}_{id}_{timestamp}/`

**Stage 2: Review & Import**
- User reviews pending file folders
- System shows warnings/confirmations needed:
  - New courses → Request difficulty rating dialog
  - Fuzzy matches → Confirm match or create new dialog
  - Conflicts → Resolution dialog
- User can import: specific folder, selected folders, or all pending
- After import, folder moves to `/processed/{timestamp}/`

### Dialog Strategy (Hybrid Approach):

**During Scraping (Critical Only):**
- System errors requiring immediate decision
- Missing required data that blocks scraping
- Authentication/access issues

**During Import Review (Batch Review):**
- Course difficulty ratings for new courses
- Fuzzy match confirmations for athletes
- Data quality warnings and anomalies
- Venue/course matching decisions with optional ID entry
- Option to schedule course records scraping

### Option D: Smart Venue/Course ID Workflow

**Stage 1: Scrape**
- Extract venue name, course name, distance from meet
- Store in CSV (no IDs required)

**Stage 2: Import Review Dialog**
For each new course, admin sees:
1. Course name, venue, distance
2. List of existing similar courses
3. **Optional ID entry fields**:
   - Venue ID (optional)
   - Course ID (optional)
4. Checkbox: "Schedule for course records scraping"
5. Required difficulty rating (1-10)

**Benefits:**
- Quick imports without looking up IDs
- Optional detailed tracking with IDs
- Queue system for batch course records scraping
- Progressive data enrichment

**Course Records Queue:**
- New admin page: `/admin/import/course-records-queue`
- Lists courses marked "needs_records_scraping"
- Bulk action: "Scrape All Course Records"
- System uses Venue ID + Course ID to fetch historical data
- Auto-suggests difficulty ratings based on historical times

### Key Requirements:
- ✅ Scraping blocks UI with progress indicator
- ✅ Always try to capture Athletic.net IDs
- ✅ Validation checks after scraping before import
- ✅ Easy to use without AI chat session
- ✅ Future: AI analysis of course difficulty ratings

---

## File Structure

```
/to-be-processed/
  /school_1076_2025_20251027_143022/
    venues.csv
    courses.csv
    schools.csv
    athletes.csv
    meets.csv
    races.csv
    results.csv
    metadata.json  # Scrape metadata

/processed/
  /20251027_150045/
    /school_1076_2025_20251027_143022/
      [same CSV files]
```

---

## Part 1: Python Scraping Contracts

### 1.1 Core Scraping Functions

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from datetime import date

@dataclass
class ScrapedResult:
    """Single race result from Athletic.net"""
    place: int
    grade: int
    athlete_name: str
    first_name: str
    last_name: str
    time_str: str              # "15:05.3"
    time_cs: int               # 90530 centiseconds
    school_name: str
    gender: str                # 'M' or 'F'
    athletic_net_athlete_id: Optional[str] = None

@dataclass
class ScrapedRace:
    """Single race from Athletic.net"""
    athletic_net_race_id: str
    race_name: str             # "2.74 Miles Varsity"
    race_type: str             # "Varsity", "JV", "Frosh"
    gender: str                # 'M' or 'F'
    distance_text: str         # "2.74 Miles"
    distance_meters: int       # 4409
    results: List[ScrapedResult]

@dataclass
class ScrapedVenue:
    """Venue information extracted from Athletic.net"""
    athletic_net_venue_id: Optional[str] = None  # Extracted via Ron's logic
    name: str
    city: str
    state: str

@dataclass
class ScrapedCourse:
    """Course information extracted from Athletic.net"""
    athletic_net_course_id: Optional[str] = None  # Extracted via Ron's logic
    name: str
    venue_name: str
    distance_meters: int
    distance_display: str
    needs_rating: bool = True

@dataclass
class ScrapedMeet:
    """Single meet from Athletic.net"""
    athletic_net_meet_id: str
    meet_name: str
    meet_date: str             # ISO format "2025-09-11"
    venue: ScrapedVenue
    location: str              # "City, State"
    races: List[ScrapedRace]

@dataclass
class ScrapedSchool:
    """School information from Athletic.net"""
    athletic_net_school_id: str
    name: str
    short_name: str
    city: str
    state: str
    league: Optional[str] = None

@dataclass
class ScrapedAthlete:
    """Athlete information from Athletic.net"""
    athletic_net_athlete_id: str
    name: str
    first_name: str
    last_name: str
    school_id: str
    grad_year: int
    gender: str

@dataclass
class ScrapeResult:
    """Result of a scraping operation"""
    success: bool
    entity_type: str           # "school", "meet", "race", "athlete"
    entity_id: str
    seasons: List[int]
    output_folder: str         # Path to /to-be-processed/{folder}
    schools: List[ScrapedSchool]
    athletes: List[ScrapedAthlete]
    venues: List[str]          # Venue names (no IDs in Athletic.net)
    courses: List[Dict]        # Course info derived from races
    meets: List[ScrapedMeet]
    total_results: int
    errors: List[str]
    warnings: List[str]
    scraped_at: str            # ISO timestamp


def get_school_meets(
    school_id: str,
    seasons: List[int]
) -> List[Dict]:
    """
    Fetch list of meets for a school (without scraping results).
    Used for meet selection UI.

    Args:
        school_id: Athletic.net school ID (e.g., "1076")
        seasons: List of season years (e.g., [2024, 2025])

    Returns:
        List of meet metadata dicts:
        [{
            'athletic_net_meet_id': str,
            'name': str,
            'date': str,
            'venue': str,
            'num_races': int,
            'estimated_results': int
        }, ...]

    Example:
        meets = get_school_meets("1076", [2025])
        # User selects which meets to scrape
        selected_ids = ["265306", "267890"]
        result = scrape_selected_meets(selected_ids)
    """
    pass


def scrape_by_school(
    school_id: str,
    seasons: List[int],
    selected_meet_ids: Optional[List[str]] = None,
    progress_callback: Optional[callable] = None
) -> ScrapeResult:
    """
    Scrape meets for a school across specified seasons.

    Two-step process:
    1. Call get_school_meets() to fetch meet list
    2. User selects which meets to scrape (optional)
    3. Call this function with selected_meet_ids

    Args:
        school_id: Athletic.net school ID (e.g., "1076")
        seasons: List of season years (e.g., [2024, 2025])
        selected_meet_ids: Optional list of meet IDs to scrape
            If None, scrapes ALL meets for the school
        progress_callback: Function to call with progress updates
            Signature: progress_callback(current: int, total: int, message: str)

    Returns:
        ScrapeResult with all scraped data

    Example:
        # Step 1: Get meet list
        meets = get_school_meets("1076", [2025])

        # Step 2: User selects meets (in UI)
        selected = ["265306", "267890"]

        # Step 3: Scrape selected meets
        result = scrape_by_school("1076", [2025], selected, my_progress_fn)
        print(f"Scraped {result.total_results} results from {len(selected)} meets")
    """
    pass


def scrape_by_meet(
    meet_id: str,
    progress_callback: Optional[callable] = None
) -> ScrapeResult:
    """
    Scrape all races and results from a single meet.

    Args:
        meet_id: Athletic.net meet ID (e.g., "265306")
        progress_callback: Progress update function

    Returns:
        ScrapeResult with meet data
    """
    pass


def scrape_by_race(
    meet_id: str,
    race_id: str,
    progress_callback: Optional[callable] = None
) -> ScrapeResult:
    """
    Scrape results from a single race.

    Args:
        meet_id: Athletic.net meet ID
        race_id: Race ID from meet results page
        progress_callback: Progress update function

    Returns:
        ScrapeResult with single race data
    """
    pass


def scrape_by_athlete(
    athlete_id: str,
    seasons: List[int],
    progress_callback: Optional[callable] = None
) -> ScrapeResult:
    """
    Scrape all results for a single athlete across seasons.

    Args:
        athlete_id: Athletic.net athlete ID (e.g., "21887534")
        seasons: List of season years
        progress_callback: Progress update function

    Returns:
        ScrapeResult with athlete's results
    """
    pass
```

### 1.2 Helper Functions

```python
def parse_distance_from_name(race_name: str) -> int:
    """
    Extract distance in meters from race name.

    Examples:
        "2.74 Miles Varsity" → 4409
        "5K JV" → 5000
        "3 Mile Varsity" → 4828

    Args:
        race_name: Race name containing distance

    Returns:
        Distance in meters (defaults to 5000 if can't parse)
    """
    pass


def calculate_grad_year(grade: int, season_year: int) -> int:
    """
    Calculate graduation year from current grade and season.

    Formula: grad_year = season_year + (12 - grade)

    Args:
        grade: Current grade (9-12)
        season_year: Season year (e.g., 2025)

    Returns:
        Graduation year

    Raises:
        ValueError: If grade is invalid
    """
    pass


def extract_venue_id(meet_page_html: str) -> Optional[str]:
    """
    Extract Athletic.net venue ID from meet page.

    TODO: Ron to provide logic for identifying venue IDs.

    Args:
        meet_page_html: HTML content of meet page

    Returns:
        Venue ID if found, None otherwise
    """
    pass


def extract_course_id(meet_page_html: str, race_name: str) -> Optional[str]:
    """
    Extract Athletic.net course ID from meet page.

    TODO: Ron to provide logic for identifying course IDs.

    Args:
        meet_page_html: HTML content of meet page
        race_name: Name of the race to find course ID for

    Returns:
        Course ID if found, None otherwise
    """
    pass


def parse_athlete_name(full_name: str) -> Tuple[str, str]:
    """
    Split full name into first and last name.

    Examples:
        "John Smith" → ("John", "Smith")
        "Mary Jane Watson" → ("Mary Jane", "Watson")
        "O'Connor" → ("O'Connor", "")

    Args:
        full_name: Full name to parse

    Returns:
        Tuple of (first_name, last_name)
    """
    pass


def time_to_centiseconds(time_str: str) -> int:
    """
    Convert time string to centiseconds.

    Examples:
        "15:05.3" → 90530
        "19:30" → 117000
        "21:45.89" → 130589

    Args:
        time_str: Time in format MM:SS or MM:SS.SS

    Returns:
        Time in centiseconds
    """
    pass
```

### 1.3 CSV Generation Functions

```python
def write_csv_files(
    scrape_result: ScrapeResult,
    output_folder: str
) -> Dict[str, int]:
    """
    Write 7 CSV files from scrape result.

    Files generated:
        - venues.csv
        - courses.csv
        - schools.csv
        - athletes.csv
        - meets.csv
        - races.csv
        - results.csv
        - metadata.json

    Args:
        scrape_result: Data from scraping operation
        output_folder: Path to output folder

    Returns:
        Dict with row counts per file
        Example: {"venues": 3, "courses": 5, ...}
    """
    pass
```

---

## Part 2: CSV File Formats

### 2.1 venues.csv

```csv
athletic_net_id,name,city,state,notes
"698","Montgomery Hill Park","San Jose","CA",""
"","Crystal Springs Golf Course","Belmont","CA","ID not found"
"","Toro Regional Park","Salinas","CA","ID not found"
```

**Columns:**
- `athletic_net_id` (STRING, OPTIONAL): Athletic.net venue ID (if extractable)
- `name` (STRING, REQUIRED): Venue name
- `city` (STRING, REQUIRED): City
- `state` (STRING, REQUIRED): State abbreviation
- `notes` (STRING, OPTIONAL): Additional info

### 2.2 courses.csv

```csv
athletic_net_id,name,venue_name,distance_meters,distance_display,difficulty_rating,elevation_gain_meters,surface_type,terrain_description,needs_review
"4409","Montgomery Hill 2.74 Mile","Montgomery Hill Park",4409,"2.74 Miles",0,75,"dirt","","true"
"","Crystal Springs 5K","Crystal Springs Golf Course",5000,"5K",0,150,"grass","Hilly course","true"
```

**Columns:**
- `athletic_net_id` (STRING, OPTIONAL): Athletic.net course ID (if extractable via Ron's logic)
- `name` (STRING, REQUIRED): Course name
- `venue_name` (STRING, REQUIRED): References venue
- `distance_meters` (INTEGER, REQUIRED): Distance in meters
- `distance_display` (STRING, REQUIRED): Human-readable distance
- `difficulty_rating` (DECIMAL, OPTIONAL): 1.0-10.0 (0 = needs rating)
- `elevation_gain_meters` (INTEGER, OPTIONAL): Elevation gain
- `surface_type` (STRING, OPTIONAL): grass/dirt/mixed/trail
- `terrain_description` (STRING, OPTIONAL): Free text description
- `needs_review` (BOOLEAN): "true" if difficulty rating needed

### 2.3 schools.csv

```csv
athletic_net_id,name,short_name,city,state,league
"1076","Westmont High School","Westmont","Campbell","CA","WCAL"
"1082","Silver Creek High School","Silver Creek","San Jose","CA","BVAL"
```

**Columns:**
- `athletic_net_id` (STRING, REQUIRED): Athletic.net school ID
- `name` (STRING, REQUIRED): Full school name
- `short_name` (STRING, REQUIRED): Short name
- `city` (STRING, REQUIRED): City
- `state` (STRING, REQUIRED): State abbreviation
- `league` (STRING, OPTIONAL): League name

### 2.4 athletes.csv

```csv
athletic_net_id,name,first_name,last_name,school_athletic_net_id,grad_year,gender,needs_review,fuzzy_match_score
"","Vincent Cheung","Vincent","Cheung","1082",2027,"M","false",
"21887534","Sarah Johnson","Sarah","Johnson","1076",2026,"F","false",
"","Mike O'Brien","Mike","O'Brien","1076",2026,"M","true","0.85"
```

**Columns:**
- `athletic_net_id` (STRING, OPTIONAL): Athletic.net athlete ID if found
- `name` (STRING, REQUIRED): Full name
- `first_name` (STRING, REQUIRED): First name
- `last_name` (STRING, REQUIRED): Last name
- `school_athletic_net_id` (STRING, REQUIRED): School's Athletic.net ID
- `grad_year` (INTEGER, REQUIRED): Graduation year (calculated from grade)
- `gender` (STRING, REQUIRED): M or F
- `needs_review` (BOOLEAN): "true" if fuzzy match needs confirmation
- `fuzzy_match_score` (DECIMAL, OPTIONAL): 0.0-1.0 similarity score

### 2.5 meets.csv

```csv
athletic_net_id,name,meet_date,venue_name,season_year,meet_type
"265306","STAL #1","2025-09-11","Montgomery Hill Park",2025,"invitational"
"267890","WCAL Championships","2025-11-02","Crystal Springs Golf Course",2025,"championship"
```

**Columns:**
- `athletic_net_id` (STRING, REQUIRED): Athletic.net meet ID
- `name` (STRING, REQUIRED): Meet name
- `meet_date` (DATE, REQUIRED): ISO format YYYY-MM-DD
- `venue_name` (STRING, REQUIRED): References venue
- `season_year` (INTEGER, REQUIRED): Season year
- `meet_type` (STRING, OPTIONAL): invitational/dual/league/championship

### 2.6 races.csv

```csv
athletic_net_race_id,meet_athletic_net_id,name,gender,distance_meters,race_type
"1053255","265306","2.74 Miles Varsity","M",4409,"Varsity"
"1053256","265306","2.74 Miles Varsity","F",4409,"Varsity"
"1053257","265306","2.74 Miles JV","M",4409,"JV"
```

**Columns:**
- `athletic_net_race_id` (STRING, REQUIRED): Race ID from Athletic.net
- `meet_athletic_net_id` (STRING, REQUIRED): Meet's Athletic.net ID
- `name` (STRING, REQUIRED): Race name
- `gender` (STRING, REQUIRED): M or F
- `distance_meters` (INTEGER, REQUIRED): Distance in meters
- `race_type` (STRING, REQUIRED): Varsity/JV/Frosh/etc

### 2.7 results.csv

```csv
athletic_net_race_id,athlete_name,athlete_first_name,athlete_last_name,athlete_school_id,time_cs,place_overall,grade,needs_review
"1053255","Vincent Cheung","Vincent","Cheung","1082",90530,1,12,"false"
"1053255","John Smith","John","Smith","1076",92145,2,10,"false"
```

**Columns:**
- `athletic_net_race_id` (STRING, REQUIRED): Race ID
- `athlete_name` (STRING, REQUIRED): Full name
- `athlete_first_name` (STRING, REQUIRED): First name
- `athlete_last_name` (STRING, REQUIRED): Last name
- `athlete_school_id` (STRING, REQUIRED): School's Athletic.net ID
- `time_cs` (INTEGER, REQUIRED): Time in centiseconds
- `place_overall` (INTEGER, REQUIRED): Overall place
- `grade` (INTEGER, REQUIRED): Grade level (9-12)
- `needs_review` (BOOLEAN): "true" if anomaly detected

### 2.8 metadata.json

```json
{
  "scrape_id": "school_1076_2025_20251027_143022",
  "entity_type": "school",
  "entity_id": "1076",
  "seasons": [2025],
  "scraped_at": "2025-10-27T14:30:22Z",
  "scraper_version": "2.0.0",
  "total_venues": 3,
  "total_courses": 5,
  "total_schools": 1,
  "total_athletes": 45,
  "total_meets": 5,
  "total_races": 20,
  "total_results": 247,
  "errors": [],
  "warnings": ["Course 'Crystal Springs 5K' needs difficulty rating"],
  "needs_review": {
    "courses_needing_rating": 2,
    "fuzzy_matches": 3,
    "anomalies": 0
  }
}
```

---

## Part 3: API Contracts (Next.js)

### 3.1 Get School Meets Endpoint (for selection)

**Endpoint:** `GET /api/admin/scrape/school-meets?schoolId={id}&seasons={year1,year2}`

**Query Parameters:**
- `schoolId` (string, required): Athletic.net school ID
- `seasons` (string, required): Comma-separated season years (e.g., "2024,2025")

**Response:**
```typescript
interface MeetListItem {
  athletic_net_meet_id: string;
  name: string;
  date: string;              // ISO format
  venue: string;
  num_races: number;
  estimated_results: number; // Rough estimate for progress bar
}

interface SchoolMeetsResponse {
  success: boolean;
  schoolId: string;
  schoolName: string;
  seasons: number[];
  meets: MeetListItem[];
  totalMeets: number;
  errors?: string[];
}
```

### 3.2 Scrape API Endpoint

**Endpoint:** `POST /api/admin/scrape`

**Request:**
```typescript
interface ScrapeRequest {
  entityType: 'school' | 'meet' | 'race' | 'athlete';
  entityId: string;          // Athletic.net ID
  seasons?: number[];        // Required for school/athlete, ignored for meet/race
  selectedMeetIds?: string[]; // Optional: For school scrapes, specific meets to scrape
}

// Examples:
const schoolRequest: ScrapeRequest = {
  entityType: 'school',
  entityId: '1076',
  seasons: [2024, 2025]
};

const meetRequest: ScrapeRequest = {
  entityType: 'meet',
  entityId: '265306'
};
```

**Response:**
```typescript
interface ScrapeResponse {
  success: boolean;
  scrapeId: string;          // e.g., "school_1076_2025_20251027_143022"
  outputFolder: string;      // Path to folder in /to-be-processed/
  summary: {
    venues: number;
    courses: number;
    schools: number;
    athletes: number;
    meets: number;
    races: number;
    results: number;
  };
  needsReview: {
    coursesNeedingRating: number;
    fuzzyMatches: number;
    anomalies: number;
  };
  errors: string[];
  warnings: string[];
  scrapedAt: string;         // ISO timestamp
}
```

**Progress Updates (Server-Sent Events):**
```typescript
// Client subscribes to: /api/admin/scrape/progress?scrapeId={id}

interface ProgressEvent {
  type: 'progress' | 'complete' | 'error';
  current: number;
  total: number;
  percentage: number;
  message: string;           // e.g., "Processing meet 3 of 5..."
  timestamp: string;
}
```

### 3.2 Import API Endpoint

**Endpoint:** `POST /api/admin/import`

**Request:**
```typescript
interface ImportRequest {
  scrapeIds: string[];       // Folder names to import (e.g., ["school_1076_2025_..."])
  confirmations: {
    courseRatings?: Record<string, number>;      // course_name → rating
    fuzzyMatches?: Record<string, 'match' | 'new'>;  // athlete_name → decision
  };
  dryRun?: boolean;          // If true, validate but don't import
}
```

**Response:**
```typescript
interface ImportResponse {
  success: boolean;
  imported: {
    venues: number;
    courses: number;
    schools: number;
    athletes: number;
    meets: number;
    races: number;
    results: number;
  };
  skipped: {
    duplicates: number;
    errors: number;
  };
  processedFolders: string[];  // Paths to /processed/{timestamp}/ folders
  errors: string[];
  warnings: string[];
}
```

### 3.3 Pending Files API

**Endpoint:** `GET /api/admin/import/pending`

**Response:**
```typescript
interface PendingFolder {
  scrapeId: string;
  entityType: string;
  entityId: string;
  scrapedAt: string;
  folder: string;            // Path to folder
  summary: {
    venues: number;
    courses: number;
    schools: number;
    athletes: number;
    meets: number;
    races: number;
    results: number;
  };
  needsReview: {
    coursesNeedingRating: number;
    fuzzyMatches: number;
    anomalies: number;
  };
}

interface PendingFilesResponse {
  folders: PendingFolder[];
  totalFolders: number;
}
```

### 3.4 Import History API

**Endpoint:** `GET /api/admin/import/history`

**Query Parameters:**
- `limit` (number, default 50): Number of records to return
- `offset` (number, default 0): Pagination offset

**Response:**
```typescript
interface ImportHistoryItem {
  timestamp: string;
  scrapeId: string;
  entityType: string;
  entityId: string;
  imported: Record<string, number>;
  folder: string;            // Path to /processed/{timestamp}/ folder
}

interface ImportHistoryResponse {
  history: ImportHistoryItem[];
  total: number;
}
```

---

## Part 4: Validation Rules

### 4.1 Critical Validations (Must Pass)

```typescript
interface ValidationRule {
  name: string;
  check: (value: any) => boolean;
  errorMessage: string;
}

const CRITICAL_VALIDATIONS: ValidationRule[] = [
  {
    name: 'time_range',
    check: (time_cs: number) => time_cs >= 60000 && time_cs <= 180000,
    errorMessage: 'Time must be between 10:00 and 30:00 (60000-180000 cs)'
  },
  {
    name: 'grad_year_range',
    check: (grad_year: number, season_year: number) =>
      grad_year >= (season_year - 1) && grad_year <= (season_year + 4),
    errorMessage: 'Grad year must be within reasonable range of season'
  },
  {
    name: 'required_fields',
    check: (record: any) =>
      record.name && record.time_cs && record.place_overall,
    errorMessage: 'Missing required fields: name, time_cs, or place_overall'
  },
  {
    name: 'no_duplicates',
    check: (athlete_id: string, meet_id: string, existing: Set<string>) =>
      !existing.has(`${athlete_id}_${meet_id}`),
    errorMessage: 'Duplicate result for athlete at this meet'
  }
];
```

### 4.2 Warning Validations (Log but Allow)

```typescript
const WARNING_VALIDATIONS: ValidationRule[] = [
  {
    name: 'unusual_fast_time',
    check: (time_cs: number) => time_cs >= 80000,  // Sub-13:20
    errorMessage: 'Unusually fast time (sub-13:20), please verify'
  },
  {
    name: 'unusual_slow_time',
    check: (time_cs: number) => time_cs <= 150000,  // Over 25:00
    errorMessage: 'Unusually slow time (25:00+), please verify'
  },
  {
    name: 'grade_out_of_range',
    check: (grade: number) => grade >= 9 && grade <= 12,
    errorMessage: 'Grade is outside typical range (9-12)'
  }
];
```

### 4.3 Fuzzy Matching Rules

```typescript
interface FuzzyMatchResult {
  score: number;              // 0.0 - 1.0
  matchType: 'exact' | 'high' | 'medium' | 'low' | 'none';
  needsReview: boolean;
  suggestedMatch?: any;       // Suggested existing record
}

function fuzzyMatchAthlete(
  name: string,
  schoolId: string,
  gradYear: number,
  existingAthletes: any[]
): FuzzyMatchResult {
  /**
   * Match criteria:
   * - Exact: name + school + grad_year match exactly (1.0)
   * - High: name similar + school match + grad_year ±1 (0.85-0.99)
   * - Medium: name similar + school match (0.70-0.84)
   * - Low: name similar only (0.50-0.69)
   * - None: no match (< 0.50)
   *
   * needsReview = true if score >= 0.70 && < 1.0
   */
}
```

---

## Part 5: UI Component Contracts

### 5.1 ScrapeForm Component

```typescript
interface ScrapeFormProps {
  onScrapeStart: (request: ScrapeRequest) => void;
  onScrapeProgress: (progress: ProgressEvent) => void;
  onScrapeComplete: (response: ScrapeResponse) => void;
  onError: (error: string) => void;
}

interface ScrapeFormState {
  entityType: 'school' | 'meet' | 'race' | 'athlete';
  entityId: string;
  seasons: number[];

  // Meet selection state (for school scrapes)
  showMeetSelection: boolean;
  availableMeets: MeetListItem[];
  selectedMeetIds: string[];

  isLoading: boolean;
  progress: {
    current: number;
    total: number;
    message: string;
  } | null;
}

// UI Flow for School Scraping:
// 1. User enters School ID + seasons
// 2. User clicks "Find Meets"
// 3. System calls GET /api/admin/scrape/school-meets
// 4. Show meet selection checklist
// 5. User selects meets (or "Select All")
// 6. User clicks "Start Scraping"
// 7. System calls POST /api/admin/scrape with selectedMeetIds
```

### 5.1b MeetSelection Component

```typescript
interface MeetSelectionProps {
  meets: MeetListItem[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

// Renders as:
// ┌─────────────────────────────────────────────────┐
// │ Select Meets to Scrape (5 found)                │
// ├─────────────────────────────────────────────────┤
// │ [Select All] [Deselect All]                     │
// │                                                  │
// │ ☑ STAL #1 - Sep 11, 2025                        │
// │   Montgomery Hill Park • ~50 results            │
// │                                                  │
// │ ☑ Clovis Invite - Sep 28, 2025                  │
// │   Woodward Park • ~120 results                  │
// │                                                  │
// │ ☐ WCAL Championships - Nov 2, 2025              │
// │   Crystal Springs • ~200 results                │
// │                                                  │
// │ Total: 2 meets, ~170 results                    │
// │                                                  │
// │ [Start Scraping] [Cancel]                       │
// └─────────────────────────────────────────────────┘
}
```

### 5.2 ImportReview Component

```typescript
interface ImportReviewProps {
  scrapeId: string;
  folder: PendingFolder;
  onConfirm: (confirmations: ImportRequest['confirmations']) => void;
  onCancel: () => void;
}

interface ReviewItem {
  type: 'course_rating' | 'fuzzy_match' | 'anomaly';
  entityName: string;
  data: any;
  status: 'pending' | 'confirmed' | 'skipped';
}
```

### 5.3 ProgressBar Component

```typescript
interface ProgressBarProps {
  current: number;
  total: number;
  message: string;
  variant: 'scraping' | 'importing';
  showPercentage?: boolean;
  showETA?: boolean;          // Show estimated time remaining
}
```

### 5.4 Dialog Components

```typescript
// Course Rating Dialog
interface CourseRatingDialogProps {
  courseName: string;
  venue: string;
  distance: number;
  onSubmit: (rating: number, notes?: string) => void;
  onSkip: () => void;
}

// Fuzzy Match Dialog
interface FuzzyMatchDialogProps {
  athleteName: string;
  newData: {
    gradYear: number;
    school: string;
  };
  suggestedMatch: {
    id: string;
    name: string;
    gradYear: number;
    school: string;
  };
  matchScore: number;
  onMatchExisting: () => void;
  onCreateNew: () => void;
  onCancel: () => void;
}
```

---

## Part 6: File System Operations

### 6.1 Folder Management

```typescript
interface FolderOperations {
  createScrapeFolder(entityType: string, entityId: string): string;
  // Returns: "/to-be-processed/school_1076_2025_20251027_143022/"

  moveFolderToProcessed(scrapeId: string): string;
  // Moves folder to: "/processed/20251027_150045/school_1076_2025_20251027_143022/"
  // Returns: new path

  listPendingFolders(): string[];
  // Returns: Array of folder paths in /to-be-processed/

  getFolderMetadata(scrapeId: string): metadata.json content;
  // Reads and parses metadata.json
}
```

---

## Summary

This contract defines:
- ✅ 4 Python scraping functions (school, meet, race, athlete)
- ✅ 7 CSV file formats with all columns specified
- ✅ 4 API endpoints (scrape, import, pending, history)
- ✅ Validation rules (critical & warning)
- ✅ Fuzzy matching algorithm
- ✅ UI component interfaces
- ✅ File system operations

**Next Steps:**
1. Review this contract
2. Confirm any adjustments needed
3. Begin Phase 2: Implementation with these contracts as the specification

---

**Last Updated:** October 27, 2025
