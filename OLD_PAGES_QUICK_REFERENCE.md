# Quick Reference: Old Pages & Features

## Page Structure at a Glance

| Section | Route | Key Features |
|---------|-------|--------------|
| **HOME** | `/` | Stats dashboard, recent meets, navigation cards |
| **SCHOOLS** | `/schools` | List all schools, search, pagination |
| **School Detail** | `/schools/[id]` | Roster with sorting/filtering, tabs for Records/Seasons/Results |
| **School Records** | `/schools/[id]/records` | XC records, course records, grade breakdown |
| **School Seasons** | `/schools/[id]/seasons` | Season summaries, athlete/race counts |
| **School Season Year** | `/schools/[id]/seasons/[year]` | Season detail, team records |
| **School Results** | `/schools/[id]/results` | Complete results history |
| **COURSES** | `/courses` | List courses, difficulty ratings, advanced sorting |
| **Course Detail** | `/courses/[id]` | Distance, ratings, team performances, meets list |
| **Course Records** | `/courses/[id]/records` | Gender/grade records, record holders |
| **Course Performances** | `/courses/[id]/performances` | Top 50 times ranked, filters by grade/school |
| **MEETS** | `/meets` | List meets, search, filtering |
| **Meet Detail** | `/meets/[meetId]` | Race grid by category, runners count |
| **Race Results** | `/meets/[meetId]/races/[raceId]` | Individual race results sorted |
| **Combined Results** | `/meets/[meetId]/combined` | All races combined, team scoring |
| **ATHLETES** | `/athletes` | List athletes, search/filter/sort |
| **Athlete Profile** | `/athletes/[id]` | Course PRs, season stats, progression, full history |
| **SEARCH** | `/search` | Global search with filters |
| **ADMIN** | `/admin` | Admin tools dashboard |
| **Import Wizard** | `/admin/import` | 5-step CSV import process |
| **Batch Import** | `/admin/mass-import` | Import existing CSV/JSON files |
| **Course Import** | `/courses/import-courses` | Course linking tool |
| **Auth Login** | `/auth/login` | User login |
| **Auth Signup** | `/auth/signup` | User registration |

---

## Data Entities & Relationships

```
SCHOOLS
├── Athletes (current_school_id)
├── Team Records (aggregated from athletes)
└── Seasons (grouped by year)

ATHLETES
├── Results (as individual performers)
├── Courses (has PRs on various courses)
└── School (current_school_id)

COURSES
├── Races (course_id in races table)
├── Results (through races)
├── Difficulty Ratings (mile_difficulty, xc_time_rating)
└── Course Records (best times by grade/gender)

MEETS
├── Races (multiple per meet)
└── Date & Type

RACES
├── Results (multiple per race)
├── Course (course_id)
├── Gender & Category (Varsity, JV, etc)
└── Meet (meet_id)

RESULTS
├── Time (in centiseconds)
├── Athlete
├── Race
└── School (denormalized from athlete)
```

---

## Key Features by Category

### School Pages
- Full roster display with multi-column sort
- Advanced filters: name search, gender, graduation year
- 4-tab navigation structure (Athletes, Records, Seasons, Results)
- Season summaries with breakdown by year
- Season-specific pages with team data

### Course Pages
- Difficulty rating system (mile_difficulty vs 1-mile track)
- XC Time Rating (Crystal Springs 2.95-mile equivalent)
- Course records by gender and grade level
- Top 50 performances ranked list
- Course-specific team performance rankings
- Meets list filtered to this course

### Meet/Race Pages
- Meet overview with race grid
- Races grouped by category (Varsity, JV, Reserves, etc)
- Combined results view for entire meet
- Individual race results with place/time

### Athlete Pages
- Course PRs sidebar showing best time on each course
- Season statistics (races, best time, avg, improvement)
- Season progression card with race-by-race breakdown
- Comprehensive sortable results table with:
  - Date, Meet, Course, Distance
  - Time, Pace, Mile Equivalent
  - XC Time (normalized), Place, Season
- PR badges and improvement indicators

### Admin Tools
- 5-step CSV import wizard
- Column auto-mapping
- Race grouping by category/gender
- Course import/linking
- Data validation before import

---

## Filtering & Sorting Capabilities

### Schools Page
- Search by name
- Pagination (20 per page)

### School Roster
- Search by first/last name
- Filter by gender (Boys/Girls)
- Filter by graduation year
- Sort by name, class, or gender
- Advanced pagination (-10, -5, Prev, Next, +5, +10)

### Courses Page
- Search by course name
- Filter by distance (exact match)
- Filter by "has results" only
- Sort by: name, distance, difficulty, races count, results count
- Pagination (15 per page)

### Course Records
- School filter dropdown
- Shows gender/grade breakdown

### Course Performances
- School filter
- Grade level filter
- Ranked top 50 per gender

### Athletes
- Global search by name
- Filter by school
- Filter by gender
- Filter by graduation year

### Athlete Results Table
- 10-column sortable table
- Click headers to toggle sort direction
- Sorts reset pagination to page 1

---

## Time Storage & Calculations

### Centisecond System
- All times stored as integers (centiseconds)
- Example: 15:30.00 = 93,000 centiseconds
- Maintains precision for calculations

### Calculations
- **Pace:** `time_seconds / distance_miles / 100` → seconds per mile
- **Mile Equivalent:** `pace / mile_difficulty` → adjusted for course
- **XC Time:** `time_seconds * xc_time_rating` → normalized to crystal springs standard

### Display
- Times formatted as MM:SS.CC
- Pace shown as M:SS per mile
- XC equivalents rounded to nearest second

---

## Components Used

### Data Tables
- `IndividualResultsTable` - Athlete results with sorting
- `TeamSelectionTable` - Team/meet selection

### Modals & Dialogs
- `CourseSelectionModal` - Select courses
- `delete-confirmation-dialog` - Deletion confirmations

### Specialized
- `SearchFilters` - Multi-field filtering
- `SimpleCourseImporter` - Course import UI
- `meet-delete-buttons` - Meet deletion
- `race-delete-buttons` - Race deletion

### UI Primitives
- Button, Input, Label, Card, Tabs, Badge, Alert, Skeleton

---

## Color Scheme

| Element | Color |
|---------|-------|
| Primary Actions | Blue (#3B82F6) |
| Schools | Red/Burgundy |
| Courses | Green |
| Boys | Blue badges |
| Girls | Pink badges |
| Status Info | Gray backgrounds |
| Success | Green |
| Warning | Yellow/Orange |
| Error | Red |

---

## Navigation Pattern

```
Home
├── Schools → School [id]
│   ├── Athletes (tab)
│   ├── Records (tab)
│   │   └── Course dropdown
│   ├── Seasons (tab)
│   │   └── Season [year]
│   └── Results (tab)
├── Courses → Course [id]
│   ├── Records (tab)
│   └── Performances (tab)
├── Meets → Meet [meetId]
│   ├── Race Grid
│   ├── Race [raceId]
│   └── Combined Results
├── Athletes → Athlete [id]
│   └── Profile with 4-panel layout
└── Admin
    ├── Import Wizard
    ├── Batch Import
    └── Course Import
```

---

## Database Requirements

### Tables Referenced
- schools
- athletes
- courses
- meets
- races
- results

### Special Views
- `results_with_details` - Enriched results with all related data

### Key Relationships
- athletes.current_school_id → schools.id
- races.course_id → courses.id
- races.meet_id → meets.id
- results.athlete_id → athletes.id
- results.race_id → races.id

---

## Notable Implementation Patterns

### State Management
- Component-level state with React hooks
- useEffect for data loading on mount
- Form state for filters/search

### Data Fetching
- Supabase queries from components
- Promise.all() for parallel loads
- Error handling with user messages

### Pagination
- Track current page in state
- Reset to page 1 on filter/sort
- Calculate start/end indices
- Show "X-Y of Z" format

### Sorting
- Multi-column support
- Toggle direction on same column click
- Visual indicators (↑/↓)
- Generic sort value function by key

### Filtering
- AND logic for multiple filters
- Reset button to clear all
- Filter state in component
- Real-time filtering as state changes

---

## Responsive Breakpoints

- **Mobile:** Single column layouts
- **Tablet:** `md:` breakpoint (768px)
  - 2-column grids become available
- **Desktop:** `lg:` breakpoint (1024px)
  - 3-4 column grids
  - Multi-panel layouts
  - Full tables with horizontal scroll if needed

---

## Performance Considerations

### Pagination
- Schools: 20 per page
- Courses: 15 per page
- Most lists: configurable

### Large Data Sets
- Athletes table uses `useEffect` with pagination
- Course records paginated
- Performances paginated (top 50)
- Course meets paginated

### Query Optimization
- Specific field selection in queries
- Relationship eager loading
- Single vs array normalization

