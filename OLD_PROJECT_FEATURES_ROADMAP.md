# Mana XC Old Project - Complete Feature Roadmap

## Overview
This document catalogs all features, pages, and functionality discovered in the OLD_Projects/mana-xc/oldwebsite/mana-running project that should be considered for implementation in the current manaxc-project/website.

---

## 1. CORE PAGES & NAVIGATION

### 1.1 Home Page (/)
**Route:** `/`
**Status in New Project:** Partially exists
**Functionality:**
- Dashboard with system statistics (Schools, Athletes, Courses, Results counts)
- Recent meets carousel (last 10 days, or 5 most recent if less than 5)
- Navigation cards to main sections (Schools, Courses, Admin)
- Responsive hero section with mission statement
- Real-time data loading with error handling

**Unique Features:**
- "Performance Hub" stats section
- Recent meets display with meet details
- Navigation to main features via prominent cards

**Priority for Roadmap:** HIGH - This is landing page, should match functionality

---

## 2. SCHOOLS FEATURES

### 2.1 Schools Listing Page
**Route:** `/schools`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- Browse all schools with pagination (20 per page)
- Search by school name (client-side filtering)
- Simple table view with school name and action button
- Alphabetically sorted

**Unique Features:**
- Search functionality
- Pagination controls
- Link to individual school page

**Priority for Roadmap:** HIGH - Core navigation page

### 2.2 School Detail Page - Athletes Tab
**Route:** `/schools/[id]`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- Display school name and total athlete count
- Show gender breakdown (Boys/Girls count)
- Search athletes by name
- Filter by gender (All, Boys, Girls)
- Filter by graduation year
- Sort by: name, class year, gender (with visual indicators)
- Advanced pagination (First, -10, -5, Previous, Next, +5, +10, Last)
- Shows athlete count per gender
- Link to athlete profiles

**Unique Features:**
- Multi-column sorting (name, class, gender)
- Advanced pagination with jump buttons (+5, +10, etc)
- Gender count display in header
- Clear Filters button

**Priority for Roadmap:** HIGH - Core athlete browsing

### 2.3 School Records Page - Individual Records
**Route:** `/schools/[id]/records`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- **Overall School Records (XC Time):**
  - Boys and Girls separated
  - Records by grade level (9-12) plus Overall school record
  - Uses XC Time Rating for fair cross-course comparison
  - Shows both XC time and actual time
  - Links to athlete and course profiles
  
- **Top 10 Performances (XC Time):**
  - Top 10 boys and girls by XC Time performance
  - Shows athlete name, class year, course, XC time
  - Ranked numbered list
  
- **Course Selector:**
  - Dropdown to select specific course
  - Loads course-specific records when changed
  - Shows course distance in dropdown
  
- **Course Details Section:**
  - Course name, distance (miles and meters)
  - Difficulty rating (vs track mile)
  - XC Time Rating (Crystal Springs conversion)
  - Course statistics (races held, total results)
  - Difficulty label (Easy, Moderate, Hard, Very Hard)
  
- **School Course Records:**
  - Fastest times by school on specific course
  - By grade level and overall
  - Only shows when course selected with data available
  - Links to athletes and meets

**Unique Features:**
- XC Time normalization for fair record comparisons
- Grade-level records plus overall school records
- Course-specific filtering
- Top 10 performers ranked display
- Course difficulty ratings displayed

**Priority for Roadmap:** CRITICAL - Records are essential feature

### 2.4 School Team Selection Page
**Route:** `/schools/[id]/team-selection`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- Season selector (auto-detects current academic year, July-June)
- Available seasons dropdown with multi-year support
- **Boys Varsity Team Selection:**
  - Ranked by Season PR (best XC time)
  - Displays Season PR, Top 3 average, Last 3 average
  - Race count for each athlete
  - Recent races listed (last 5 with times and dates)
  - Highlights top 7 athletes (5 scorers + 2 alternates)
  - Sortable rankings
  
- **Girls Varsity Team Selection:**
  - Same metrics as boys
  
- **Team Selection Guide:**
  - Explains XC Time performance metrics
  - Explains Varsity vs alternates
  - Notes about course difficulty ratings
  - Educational about Crystal Springs 2.95-mile standard

**Unique Features:**
- Sophisticated ranking system using XC Times
- Multi-year season support
- Top 7 highlighting for team selection
- Recent race history for each athlete
- Helps coaches make data-driven team selection decisions

**Priority for Roadmap:** CRITICAL - Core coach tool for team selection

### 2.5 School Seasons Page
**Route:** `/schools/[id]/seasons`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- List all seasons with data for school
- Shows: Season year, athlete count, race count, boys/girls breakdown
- Clickable links to season details
- Sorted newest first
- Displays counts: "2024-2025 Season: 45 athletes, 12 races, 28 boys, 17 girls"

**Unique Features:**
- Season history browsing
- Gender-specific athlete counts
- Entry point to seasonal analysis

**Priority for Roadmap:** MEDIUM - Historical tracking

### 2.6 School Results Page
**Route:** `/schools/[id]/results`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- Displays all meet results for school's athletes
- Tab navigation (Athletes, Records, Seasons, All Results)
- Likely shows detailed race-by-race results

**Unique Features:**
- Tab-based navigation structure

**Priority for Roadmap:** MEDIUM - Results browsing

---

## 3. ATHLETES FEATURES

### 3.1 Athletes Listing Page
**Route:** `/athletes`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- Browse all athletes directory
- Search by name (first, last, or full name)
- Search by school
- Gender icons (♂️ for boys, ♀️ for girls)
- Table with: Name, Graduation Year, School
- Sortable by: last name, first name, graduation year, school
- Shows result count per athlete
- Pagination built-in

**Unique Features:**
- Gender icons for visual identification
- Multi-field search capability
- Comprehensive athlete directory

**Priority for Roadmap:** MEDIUM - User discovery

### 3.2 Athlete Detail Page
**Route:** `/athletes/[id]`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- **Athlete Header:**
  - Name, school, grade/class, gender badge
  - Graduation year
  
- **Course PRs (Personal Records):**
  - Best time on each course
  - Shows distance, meet name, date
  - Personal best for each unique course
  
- **Season Stats (XC Equivalent Times):**
  - Number of races in season
  - Season best (fastest XC time)
  - Average XC time across season
  - Improvement (first race vs last race XC time)
  - Uses Crystal Springs 2.95-mile standard
  
- **Season Progression:**
  - Timeline of performances in current season
  - Shows XC time equivalent with actual time in parentheses
  - Marks PRs with yellow badge
  - Marks improvements with green ↗ badge
  - Shows place, date, course, difficulty
  
- **All Race Results Table:**
  - Comprehensive race history
  - Sortable columns: Date, Meet, Course, Distance, Time, Pace, Mile Equiv, XC Time, Place, Season
  - Shows course difficulty multiplier
  - Highlights PR performances
  - Detailed time analysis including:
    - Mile Equivalent pace (vs track mile)
    - XC Time conversion

**Unique Features:**
- Course-specific PR tracking
- Season progression visualization with badges
- XC Time normalization for all results
- Advanced pace calculations (pace, mile equivalents)
- Comprehensive sorting across 10 different columns
- Season vs career stats separation

**Priority for Roadmap:** CRITICAL - Core athlete view

---

## 4. COURSES FEATURES

### 4.1 Courses Listing Page
**Route:** `/courses`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- Browse all courses with pagination (15 per page)
- **Search/Filter:**
  - Search by course name
  - Filter by distance (dropdown)
  - Filter "Has results only" checkbox
  - Clear Filters button
  
- **Sort Columns:**
  - Course Name
  - Distance (miles)
  - Difficulty (mile_difficulty)
  - Races count
  - Total Results count
  - Bidirectional sort (asc/desc)
  
- **Course Info Display:**
  - Name (linked to detail page)
  - Distance (miles and meters)
  - Difficulty badge with color (Green/Yellow/Orange/Red)
  - Difficulty label (Fast/Moderate/Hard/Very Hard)
  - XC Time Rating (if available)
  - Races held on course
  - Total results count
  - "Import Courses" button (admin)
  
- **Difficulty Color Coding:**
  - < 1.05: Green (Fast)
  - 1.05-1.15: Yellow (Moderate)
  - 1.15-1.20: Orange (Hard)
  - >= 1.20: Red (Very Hard)
  
- **Rating System Explanation:**
  - Difficulty vs track mile multiplier
  - XC Time conversion explanation

**Unique Features:**
- Multi-field filtering and sorting
- Visual difficulty ratings
- XC Time and difficulty ratings displayed
- Course import functionality

**Priority for Roadmap:** HIGH - Core course browsing

### 4.2 Course Detail Page
**Route:** `/courses/[id]`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- **Course Header:**
  - Course name and distance (miles/meters)
  - Difficulty rating with label
  - XC Time Rating with explanation
  - Statistics: races held, total results
  
- **Rating Explanation Box:**
  - Explains difficulty multiplier
  - Explains XC Time conversion
  - Reference to Crystal Springs standard
  
- **Quick Links:**
  - Link to Course Records
  - Link to Top Performances
  
- **Top 5 Team Performances:**
  - Best boys team scores on course (sum of top 5)
  - Best girls team scores on course
  - Shows rank, school name, total time, meet name/date
  - Lists top 5 runners for each team with individual times
  - Only includes teams with 5+ runners
  
- **Meets on Course:**
  - Paginated list (25 per page)
  - Table: Meet Name, Date, Type, Actions
  - Links to meet detail pages

**Unique Features:**
- Team performance aggregation (top 5 sum)
- Historical meets on course
- Course difficulty and conversion explanations

**Priority for Roadmap:** HIGH - Core course detail view

### 4.3 Course Records Page
**Route:** `/courses/[id]/records`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- **Course Records by Grade Level:**
  - Overall course record
  - Grade 9-12 records separately
  - For boys and girls
  - Shows fastest time, athlete name, school, date
  
- **School Filter:**
  - Dropdown to filter records by school
  - "All Schools (Course Records)" option
  - Dynamically loads schools that have competed on course
  - Displays school-specific records when filtered
  
- **All-Time vs School Records:**
  - Toggle between all-time and school-specific records
  - Same grade-level structure
  
- **Record Display:**
  - Grade level label
  - Time (formatted)
  - Athlete name (linked)
  - School name (linked)
  - Date (formatted)
  - Meet name

**Unique Features:**
- Grade-level record tracking
- School filtering
- Cross-school record comparison

**Priority for Roadmap:** HIGH - Records page

### 4.4 Course Performances Page
**Route:** `/courses/[id]/performances`
**Status in New Project:** Appears to exist in structure
**Functionality:**
- Top 50 boys and girls performances on course
- Shows ranking, athlete, time, school, date
- Separated by gender

**Unique Features:**
- Historical performance leaderboard

**Priority for Roadmap:** MEDIUM - Performance rankings

---

## 5. MEETS FEATURES

### 5.1 Meets Listing Page
**Route:** `/meets`
**Status in New Project:** Doesn't exist yet
**Functionality:**
- Browse all meets
- **Sort Columns:** Date, Name, Type, Venue
- **Sort Direction:** Ascending/Descending (bidirectional)
- **Default Sort:** Date (descending - newest first)
- Pagination (50 per page)

- **Meet Info Display:**
  - Date (formatted)
  - Meet name (linked to detail)
  - Meet type (Invitational, Championship, etc)
  - Venue/Course name
  - Race count
  - View Meet button

**Unique Features:**
- Multi-column sorting
- Venue extraction from first course
- Race count display

**Priority for Roadmap:** MEDIUM - Meet browsing

### 5.2 Meet Detail Page
**Route:** `/meets/[meetId]`
**Status in New Project:** Partially exists
**Functionality:**
- Display meet details
- Race listings (likely by gender)
- May have combined results view

**Unique Features:**
- Detailed meet view

**Priority for Roadmap:** MEDIUM - Meet details

### 5.3 Race Detail Page
**Route:** `/meets/[meetId]/races/[raceId]`
**Status in New Project:** Partially exists
**Functionality:**
- Individual race results

**Priority for Roadmap:** MEDIUM - Race details

### 5.4 Combined Results View
**Route:** `/meets/[meetId]/combined`
**Status in New Project:** Partially exists
**Functionality:**
- Combined results view for meet

**Priority for Roadmap:** LOW - Advanced view

---

## 6. ADMIN/MANAGEMENT FEATURES

### 6.1 Admin Dashboard
**Route:** `/admin`
**Status in New Project:** Different structure in new project
**Functionality:**
- **System Overview:**
  - Stats cards: Schools, Athletes, Courses, Meets, Results
  - Color-coded cards for each entity type
  
- **Quick Actions:**
  - Data Import link
  - Advanced Search link
  - System Health check (Coming Soon)
  
- **Bulk Edit Operations Tab:**
  - Select athlete and edit:
    - First name
    - Last name
    - Graduation year
    - Gender
  - Update button with loading state
  - Form validation

**Unique Features:**
- Dashboard with system stats
- Bulk athlete editing
- Quick navigation to tools

**Priority for Roadmap:** MEDIUM - Admin tools

### 6.2 Import Tools
**Route:** `/import`
**Status in New Project:** Exists (different implementation)
**Functionality:**
- CSV import wizard (noted in old project)

**Priority for Roadmap:** HIGH - Already exists but review

### 6.3 Advanced Search
**Route:** `/search`
**Status in New Project:** Doesn't exist
**Functionality:**
- Uses SearchFilters component
- Advanced search and analytics

**Unique Features:**
- Dedicated search page

**Priority for Roadmap:** MEDIUM - Discovery tool

---

## 7. AUTHENTICATION FEATURES

### 7.1 Login Page
**Route:** `/auth/login`
**Status in New Project:** Doesn't exist
**Functionality:**
- User login form
- Likely basic auth flow

**Priority for Roadmap:** LOW - May not be needed

### 7.2 Signup Page
**Route:** `/auth/signup`
**Status in New Project:** Doesn't exist
**Functionality:**
- User registration form

**Priority for Roadmap:** LOW - May not be needed

---

## 8. DATA VISUALIZATION & CALCULATIONS

### 8.1 XC Time Rating System
**Concept:** Normalized performance comparison across courses
**Components:**
- `xc_time_rating` field on races
- Formula: `actual_time * xc_time_rating`
- Base standard: Crystal Springs 2.95-mile course
- Allows fair comparison between different courses/distances
- Used in:
  - Season stats
  - Team selection
  - Records comparisons
  - Athlete rankings

**Implementation Status:** Exists in old project
**Priority for Roadmap:** CRITICAL - Core analytics

### 8.2 Mile Difficulty Rating
**Concept:** How hard a course is vs 1-mile track
**Components:**
- `mile_difficulty` multiplier
- Example: 1.125 = 12.5% harder than track mile
- Color-coded categories:
  - < 1.05: Green (Fast)
  - 1.05-1.15: Yellow (Moderate)
  - 1.15-1.20: Orange (Hard)
  - >= 1.20: Red (Very Hard)
- Used in pace calculations

**Implementation Status:** Exists in old project
**Priority for Roadmap:** CRITICAL - Core analytics

### 8.3 Grade Level Calculation
**Concept:** Determine athlete grade from race date and graduation year
**Implementation:**
```
- Academic year: July 1 - June 30
- If race month >= 7: school year ending = race year + 1
- Else: school year ending = race year
- Grade = 12 - (graduation_year - school_year_ending)
```
**Used in:** Records pages, team selection

**Priority for Roadmap:** CRITICAL - Records system

### 8.4 Advanced Sorting/Pagination
**Features Observed:**
- Multi-column sorting (Name, Class, Gender, Distance, etc)
- Bidirectional sort indicators (↑/↓)
- Advanced pagination: First, -10, -5, Prev, Next, +5, +10, Last
- Client-side AND server-side filtering options
- Real-time result count updates

**Priority for Roadmap:** HIGH - UX polish

---

## 9. UNIQUE DATA PRESENTATION FEATURES

### 9.1 Season Progression with Badges
- Visual timeline of athlete season races
- PR badge (yellow) for personal records
- Improvement badge (green ↗) for progressions
- Shows XC time with actual time in parentheses
- Course and place information

**Priority for Roadmap:** MEDIUM - Enhanced UX

### 9.2 Course Performance Aggregation
- Top 5 team scores (sum of 5 runners' times)
- Team ranking by total time
- Individual runner breakdown
- Only includes complete teams (5+ runners)

**Priority for Roadmap:** MEDIUM - Team analysis

### 9.3 Record Hierarchies
- Overall (all-time) records
- Grade-level records (9, 10, 11, 12)
- School-specific vs course-wide
- XC Time records vs course-specific records
- Multiple record types displayed together

**Priority for Roadmap:** MEDIUM - Records complexity

### 9.4 Performance Metrics Dashboard
- Season PR (best time)
- Top 3 average (3 best times)
- Last 3 average (3 most recent times)
- Race count
- Improvement calculation (first vs last)

**Priority for Roadmap:** MEDIUM - Coach analytics

---

## 10. FEATURES NOT IN NEW PROJECT

### High Priority Gaps
1. **School Records Pages** - Critical for coaches
2. **Team Selection Tool** - Coaches need this
3. **Course Records** - Important record tracking
4. **Course Performances Leaderboard** - Historical rankings
5. **School Seasons Overview** - Historical tracking

### Medium Priority Gaps
1. **Athletes Listing Page** - Directory feature
2. **Advanced Search Page** - Discovery
3. **Meets Listing** - Complete meet browsing
4. **Pagination Advanced Controls** - (+5, +10, etc)
5. **Season Progression Badges** - UX enhancement

### Lower Priority Gaps
1. **Admin Bulk Edit** - Could be in admin area
2. **Auth pages** - May not be needed
3. **Course Import UI** - Backend feature

---

## 11. IMPLEMENTATION RECOMMENDATIONS

### Phase 1 (Critical Foundation)
1. Athletes listing page
2. School detail page with roster
3. School records page
4. Course listings and details
5. Athlete detail page

### Phase 2 (Team/Coach Tools)
1. Team selection page (with rankings)
2. School seasons overview
3. Advanced search

### Phase 3 (Polish & Features)
1. Course records with school filtering
2. Meet listings and filtering
3. Advanced pagination
4. Season progression badges
5. Performance visualizations

### Phase 4 (Admin & Tools)
1. Advanced search/analytics
2. Admin bulk operations
3. Import enhancements

---

## 12. TECHNICAL CONSIDERATIONS

### Database Fields Used
- `xc_time_rating` - Course normalization
- `mile_difficulty` - Course difficulty multiplier
- `graduation_year` - For grade calculation
- `season_year` - For season filtering
- `place_overall` - Meet place/ranking
- `meet_date`, `race_date` - For sorting/filtering
- `gender` - Boy/Girl designation
- `meet_type` - Meet classification

### Key Calculations
1. Grade from graduation year + race date
2. XC Time from time_seconds * xc_time_rating
3. Season stats aggregations (PR, avg, improvement)
4. Team score aggregation (top 5 sum)
5. Record hierarchy (Overall, grade-level, school-level)

### Filtering Patterns
1. Gender-based (Boys/Girls/M/F variants)
2. School-based (current_school_id foreign key)
3. Course-based (course_id in races)
4. Season-based (season_year)
5. Date range (meet_date filtering)

---

## 13. SUMMARY MATRIX

| Feature | Route | Status | Priority | Complexity |
|---------|-------|--------|----------|-----------|
| Athletes List | /athletes | Missing | MEDIUM | Low |
| Athlete Detail | /athletes/[id] | Missing | CRITICAL | High |
| School List | /schools | Missing | HIGH | Low |
| School Roster | /schools/[id] | Missing | HIGH | Medium |
| School Records | /schools/[id]/records | Missing | CRITICAL | High |
| School Seasons | /schools/[id]/seasons | Missing | MEDIUM | Low |
| Team Selection | /schools/[id]/team-selection | Missing | CRITICAL | High |
| Courses List | /courses | Missing | HIGH | Low |
| Course Detail | /courses/[id] | Missing | HIGH | Medium |
| Course Records | /courses/[id]/records | Missing | HIGH | High |
| Course Performances | /courses/[id]/performances | Missing | MEDIUM | Medium |
| Meets List | /meets | Missing | MEDIUM | Low |
| Meet Detail | /meets/[meetId] | Partial | MEDIUM | Medium |
| Advanced Search | /search | Missing | MEDIUM | High |
| Admin Dashboard | /admin | Different | MEDIUM | Medium |

---

## 14. FILE REFERENCES

**Old Project Location:** `/Users/ron/manaxc/OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/`

Key files:
- Home page: `page.tsx`
- Schools: `schools/page.tsx`, `schools/[id]/page.tsx`, `schools/[id]/records/page.tsx`
- Athletes: `athletes/page.tsx`, `athletes/[id]/page.tsx`
- Courses: `courses/page.tsx`, `courses/[id]/page.tsx`, `courses/[id]/records/page.tsx`
- Meets: `meets/page.tsx`, `meets/[meetId]/page.tsx`
- Team Selection: `schools/[id]/team-selection/page.tsx`
- Seasons: `schools/[id]/seasons/page.tsx`
- Admin: `admin/page.tsx`
- Search: `search/page.tsx`

