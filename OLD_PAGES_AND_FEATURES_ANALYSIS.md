# OLD_Projects - Pages and Features Analysis
## Mana-XC Old Website Structure

**Project Location:** `/Users/ron/manaxc/OLD_Projects/mana-xc/oldwebsite/mana-running`

**Technology Stack:** Next.js 13+ (App Router), React, TypeScript, Supabase, Tailwind CSS

---

## 1. MAIN PAGES STRUCTURE

### A. PUBLIC-FACING PAGES

#### 1.1 Home Page (`src/app/page.tsx`)
- **Route:** `/`
- **Features:**
  - Hero section with mission statement
  - Statistics dashboard (Schools, Athletes, Courses, Results counts)
  - Recent meets section (last 5-10 meets)
  - Navigation cards linking to main sections
  - Loading and error states with retry functionality
- **Data Sources:** CRUD operations for schools, courses, athletes, results

#### 1.2 Schools Listing Page (`src/app/schools/page.tsx`)
- **Route:** `/schools`
- **Features:**
  - List of all schools in the database
  - Search/filter by school name
  - Pagination (20 schools per page)
  - Sortable by name
  - Click-through to individual school details
- **Data Sources:** Supabase `schools` table

#### 1.3 School Detail Page (`src/app/schools/[id]/page.tsx`)
- **Route:** `/schools/[id]`
- **Features:**
  - School name and athlete count display
  - **Athletes Tab (Default):**
    - Full roster with sortable columns (Name, Class, Gender)
    - Multi-filter capability:
      - Search by first/last name
      - Filter by gender
      - Filter by graduation year
    - Pagination with advanced controls (-10, -5, Previous, Next, +5, +10)
    - Click to view individual athlete profiles
  - **Navigation Tabs** (using tab navigation):
    - Athletes (current)
    - Records (school records by gender/grade)
    - Seasons (season summaries)
    - All Results (complete results history)

#### 1.4 School Records Page (`src/app/schools/[id]/records/page.tsx`)
- **Route:** `/schools/[id]/records`
- **Features:**
  - Boys/Girls XC records (normalized times)
  - Course-specific records (dropdown to select course)
  - Top 10 performances on select courses
  - Statistics per course
  - Grade-level record tracking

#### 1.5 School Seasons Page (`src/app/schools/[id]/seasons/page.tsx`)
- **Route:** `/schools/[id]/seasons`
- **Features:**
  - Season summary cards showing:
    - Year
    - Athlete count
    - Race count
    - Boys/Girls breakdown
  - Clickable seasons leading to `/schools/[id]/seasons/[year]`

#### 1.6 School Season Detail Page (`src/app/schools/[id]/seasons/[year]/page.tsx`)
- **Route:** `/schools/[id]/seasons/[year]`
- **Features:**
  - Detailed season breakdown
  - Team records and performances for the season
  - Results filtered by season year

#### 1.7 School Results Page (`src/app/schools/[id]/results/page.tsx`)
- **Route:** `/schools/[id]/results`
- **Features:**
  - Complete results history for school
  - All athletes' performances
  - Filtering and sorting options

---

#### 2.1 Courses Listing Page (`src/app/courses/page.tsx`)
- **Route:** `/courses`
- **Features:**
  - All courses with difficulty ratings
  - Search by course name
  - Filter by distance
  - Filter by courses with results only
  - Advanced sorting:
    - By name
    - By distance (miles)
    - By mile difficulty
    - By races count
    - By total results count
  - Pagination (15 courses per page)
  - Course difficulty badges (Fast, Moderate, Hard, Very Hard)
  - Click-through to course details
- **Data Sources:** Supabase `courses` table with rating data

#### 2.2 Course Detail Page (`src/app/courses/[id]/page.tsx`)
- **Route:** `/courses/[id]`
- **Features:**
  - Course information:
    - Distance (miles and meters)
    - Difficulty vs track mile (multiplier)
    - XC Time Rating (Crystal Springs 2.95-mile standard)
    - Statistics (races held, total results)
  - Educational info box explaining rating system
  - Quick navigation links to:
    - Course Records
    - Top Performances
  - Top 5 Team Performances:
    - Boys and Girls sections
    - School name, total time, top 5 runners
    - Disclaimer about team scoring methodology
  - Meets on Course section:
    - List of all meets using this course
    - Sortable table with date, type
    - Pagination

#### 2.3 Course Records Page (`src/app/courses/[id]/records/page.tsx`)
- **Route:** `/courses/[id]/records`
- **Features:**
  - Records by gender (Boys/Girls)
  - Overall course record (single best time)
  - Grade-level breakdown (9-12 + Overall)
  - School filter dropdown
  - Record holder information:
    - Athlete name (clickable to profile)
    - School
    - Time
    - Date and meet name
  - Distinction between grade records and overall records

#### 2.4 Course Performances/Top Times Page (`src/app/courses/[id]/performances/page.tsx`)
- **Route:** `/courses/[id]/performances`
- **Features:**
  - Top 50 performances by gender (Boys/Girls)
  - Ranked list with:
    - Rank number
    - Time
    - Athlete name (clickable)
    - School (clickable)
    - Athlete grade
    - Meet date
  - Filter by school
  - Filter by grade level
  - Handles duplicate performances (same time multiple runs)

---

#### 3.1 Meets Listing Page (`src/app/meets/page.tsx`)
- **Route:** `/meets`
- **Features:**
  - List of all meets
  - Search by meet name
  - Filter options (by type, by date range)
  - Sort by date
  - Pagination
  - Card view showing meet info

#### 3.2 Meet Detail Page (`src/app/meets/[meetId]/page.tsx`)
- **Route:** `/meets/[meetId]`
- **Features:**
  - Meet header with:
    - Name
    - Date
    - Type
    - Total races count
    - Total runners count
  - Quick Action button: "View Combined Results"
  - Race grid showing all races (Varsity, JV, etc.):
    - Race name
    - Course location (if assigned)
    - Runner count
    - Fastest time
    - Click to view individual race results
  - Category sorting (Varsity → JV → Reserves → Frosh-Soph)
  - Gender sorting within categories

#### 3.3 Race Results Page (`src/app/meets/[meetId]/races/[raceId]/page.tsx`)
- **Route:** `/meets/[meetId]/races/[raceId]`
- **Features:**
  - Individual race results (all runners)
  - Sorted by place/time
  - Athlete information
  - School information

#### 3.4 Combined Meet Results Page (`src/app/meets/[meetId]/combined/page.tsx`)
- **Route:** `/meets/[meetId]/combined`
- **Features:**
  - All results from all races at meet combined
  - Team scoring calculations
  - Results broken down by gender
  - Overall results view

---

#### 4.1 Athletes Listing Page (`src/app/athletes/page.tsx`)
- **Route:** `/athletes`
- **Features:**
  - List of all athletes in system
  - Search by name
  - Filter by school
  - Filter by gender
  - Filter by graduation year
  - Pagination
  - Sort options

#### 4.2 Athlete Profile/Detail Page (`src/app/athletes/[id]/page.tsx`)
- **Route:** `/athletes/[id]`
- **Features:**
  - Athlete header:
    - Name
    - School
    - Grade/Class year
    - Gender badge
  - Three-column dashboard:
    - **Course PRs Card:**
      - Personal best on each course
      - Distance and time display
      - Meet where PR was set
    - **Season Stats Card** (2025):
      - Total races run
      - Best XC time (normalized)
      - Average time
      - Improvement from first to last race
      - Note about XC equivalent times
    - **Season Progression Card:**
      - Chronological list of 2025 races
      - Displays:
        - XC equivalent time
        - Original time in parentheses
        - PR badge if personal best
        - Improvement arrow if improved from previous
        - Place and course
        - Course difficulty indicator
  - **Race History Table:**
    - Sortable columns:
      - Date
      - Meet
      - Course
      - Distance
      - Time
      - Pace (per mile)
      - Mile Equivalent (adjusted for difficulty)
      - XC Time (normalized)
      - Place
      - Season
    - PR badges
    - Hover states

---

#### 5.1 Search Page (`src/app/search/page.tsx`)
- **Route:** `/search`
- **Features:**
  - Global search functionality
  - Search filters component
  - Results aggregation across multiple data types

---

#### 6.1 Admin Dashboard Page (`src/app/admin/page.tsx`)
- **Route:** `/admin`
- **Features:**
  - Admin tools overview
  - Links to:
    - Import tools
    - Batch import
    - Duplicate resolution
    - Course ratings management
    - Delete operations
    - Athletic.net scraper (if available)

#### 6.2 Import Wizard Page (`src/app/admin/import/page.tsx` or `/app/admin/mass-import/page.tsx`)
- **Route:** `/admin/import` or `/admin/mass-import`
- **Features:**
  - 5-step CSV import process
  - Step 1: Meet information (name, date, course)
  - Step 2: CSV file upload with drag-and-drop
  - Step 3: Column mapping (auto-detection + manual)
  - Step 4: Race configuration (grouping by category/gender)
  - Step 5: Validation and import confirmation
  - Success/error handling

#### 6.3 Course Import Page (`src/app/courses/import-courses/page.tsx`)
- **Route:** `/courses/import-courses`
- **Features:**
  - Simple course importer component
  - Course selection modal for linking races to courses

---

#### 7.1 Authentication Pages
- **Login Page:** `/app/auth/login/page.tsx`
- **Signup Page:** `/app/auth/signup/page.tsx`
- Basic auth flows (Supabase integration)

---

## 2. KEY COMPONENTS

### Data Display Components
- `IndividualResultsTable.tsx` - Sortable results table for athletes
- `TeamSelectionTable.tsx` - Team selection for school/meet operations
- `SearchFilters.tsx` - Multi-field filtering component

### UI Components (in `/components/ui/`)
- `button.tsx` - Reusable button component
- `input.tsx` - Input field component
- `label.tsx` - Form labels
- `card.tsx` - Card container
- `tabs.tsx` - Tab navigation
- `badge.tsx` - Status badges
- `alert.tsx` / `alert-dialog.tsx` - Alert dialogs
- `skeleton.tsx` - Loading skeleton
- `progress.tsx` - Progress bars

### Data/Admin Components
- `CourseSelectionModal.tsx` - Modal for selecting courses
- `SimpleCourseImporter.tsx` - Course import interface
- `delete-confirmation-dialog.tsx` - Confirmation for deletions
- `meet-delete-buttons.tsx` - Meet deletion controls
- `race-delete-buttons.tsx` - Race deletion controls

---

## 3. FEATURES IMPLEMENTED

### A. DATA DISPLAY FEATURES
1. **School Management:**
   - Full roster view with filtering
   - Multi-column sorting (Name, Class, Gender)
   - Search by name
   - Filter by graduation year and gender
   - Advanced pagination

2. **Course Management:**
   - Course listing with difficulty ratings
   - Course detail pages with statistics
   - Course records by gender and grade
   - Top performances with ranking
   - Course-specific team performances

3. **Meet/Race Results:**
   - Meet listing and details
   - Race results with sorting
   - Combined results view
   - Team scoring integration
   - Results by category (Varsity, JV, etc.)

4. **Athlete Profiles:**
   - Comprehensive athlete details
   - Personal records by course
   - Season statistics and progression
   - Race history with advanced sorting
   - Pace calculations and mile equivalents
   - XC time normalization (Crystal Springs standard)

### B. ANALYTICAL FEATURES
1. **Course Difficulty Metrics:**
   - Mile difficulty (vs 1-mile track standard)
   - XC time rating for normalization
   - Rating confidence scores

2. **Performance Normalization:**
   - XC time conversion using course rating
   - Pace calculations
   - Mile equivalent calculations
   - Season statistics with improvement tracking

3. **Record Tracking:**
   - School records (XC and course-specific)
   - Course records by gender and grade
   - Personal bests by course
   - All-time performances

4. **Season Analysis:**
   - Season summaries for schools
   - Athlete season progression
   - Gender/grade breakdowns
   - Team statistics

### C. DATA MANAGEMENT FEATURES
1. **Import Tools:**
   - 5-step CSV import wizard
   - Column auto-detection and mapping
   - Race grouping by category/gender
   - Validation before import

2. **Admin Operations:**
   - Delete operations (with confirmation)
   - Course import
   - Batch operations
   - Data validation

3. **Search & Filter:**
   - Global search across athletes
   - Course listings with filters
   - Meet/race filtering
   - School roster filtering
   - School filtering by location

### D. DISPLAY ENHANCEMENTS
1. **Sorting:**
   - Multi-column table sorting
   - Click-header to toggle direction
   - Sort indicators (↑/↓)
   - Pagination-aware sorting

2. **Filtering:**
   - Name search (text input)
   - Categorical filters (gender, graduation year, school)
   - Distance filters
   - Results-only toggle

3. **Pagination:**
   - Page-based pagination
   - Configurable items per page
   - Advanced controls (-10, -5, Next, Previous, +5, +10)
   - First/Last page buttons

4. **Time Display:**
   - Time formatting utilities
   - Pace calculations
   - XC equivalent display
   - Centisecond precision

---

## 4. DATABASE INTEGRATION

### Key Tables Used
- `schools` - School information
- `athletes` - Athlete profiles with school association
- `courses` - Course information with difficulty ratings
- `meets` - Meet/race event information
- `races` - Individual races within meets
- `results` - Individual athlete race results

### Special Views/Functions
- `results_with_details` - View combining results with course/meet/athlete data
- Course rating calculations and statistics
- Team performance aggregations

---

## 5. NAVIGATION STRUCTURE

### Main Navigation (from home page)
1. **Meets** - Browse races and results
2. **Schools** - View teams and rosters
3. **Courses** - Explore race venues
4. **Courses** - See course records
5. **Admin/Coach's Corner** - Management tools

### Within School Pages
- Athletes → Records → Seasons → All Results (tab navigation)

### Within Course Pages
- Course Details → Records (tab navigation)
- Course Details → Performances (tab navigation)

### Within Athlete Pages
- Profile with Course PRs, Season Stats, Season Progression, Full Results Table

---

## 6. STYLING & UI PATTERNS

### Color Scheme
- **Primary:** Blue (#3B82F6)
- **Schools:** Red/burgundy
- **Courses:** Green
- **Gender:** Blue (Boys), Pink (Girls)
- **Status Badges:** Various colored backgrounds

### Layout Patterns
- **Cards:** White background with shadows for containment
- **Tables:** Striped rows with hover states
- **Buttons:** Colored buttons with hover/active states
- **Forms:** Clean input fields with labels
- **Modals:** Dialog overlays for confirmations/selections

### Responsive Design
- Mobile-first approach
- Grid layouts with `grid-cols-1 md:grid-cols-X` patterns
- Touch-friendly buttons and spacing
- Collapsible sections on mobile

---

## 7. NOTABLE IMPLEMENTATION DETAILS

### Time/Performance Calculations
- **Centisecond storage:** Times stored as integers (e.g., 15:30.00 = 93000 cs)
- **Pace calculation:** `time_seconds / distance_miles / 100`
- **XC Time conversion:** `time_seconds * xc_time_rating`
- **Mile equivalent:** `pace / mile_difficulty`

### Pagination Strategy
- Pages component state-based
- Reset to page 1 on filter/sort changes
- Shows range (e.g., "1-25 of 180")

### Data Loading
- Client-side component mounting with `useEffect`
- Supabase queries for data fetching
- Error handling with user-friendly messages
- Loading states with spinner/skeleton

### Sorting Implementation
- Tracks `sortColumn` and `sortDirection` in state
- Click-column to toggle/change sort
- Visual indicators (↑ for asc, ↓ for desc)
- Resets pagination on sort change

---

## 8. MISSING/INCOMPLETE FEATURES

### Not Fully Implemented
1. **Team Optimizer** - Mentioned in CLAUDE.md but not visible in pages
2. **Training Log** - Directory exists (`/app/trainnig/log/`) but empty
3. **Top Performances Landing** - Mentioned as default redirect but not found
4. **Athletic.net Scraper UI** - Admin tool referenced but not in page structure
5. **Duplicate Results Dashboard** - Admin tool for duplicate detection

### Potential Enhancement Areas
- Map view for courses
- Workout/training integration
- Prediction/projection tools
- Head-to-head comparisons
- Historical trend graphs
- Export functionality

---

## SUMMARY

The old Mana-XC website was a **comprehensive high school cross-country statistics platform** with:

- **4 main public sections:** Schools, Courses, Meets/Races, Athletes
- **Multiple views per section:** List, detail, records, performances, season breakdowns
- **Advanced filtering/sorting:** Multi-criteria filters, sortable columns, pagination
- **Performance analytics:** Normalized times (XC ratings), pace calculations, record tracking
- **Admin tools:** CSV import wizard, course management, data deletion
- **Responsive design:** Mobile-friendly with card-based layouts
- **Supabase integration:** Real-time data queries with proper error handling

The architecture demonstrates a well-organized Next.js App Router structure with clear separation between public pages, components, utilities, and data operations.

