# Old Project Features - Implementation Checklist

## Quick Reference

Use this checklist to track which features from the old project have been implemented in the new project.

---

## SCHOOL FEATURES

### School Browsing & Directory
- [ ] School listing page (`/schools`)
  - [ ] Search by school name
  - [ ] Pagination (20 per page)
  - [ ] Alphabetical sorting
  - [ ] Link to individual school pages

### School Detail - Athletes Tab
- [ ] School detail page (`/schools/[id]`)
  - [ ] Display total athlete count
  - [ ] Show gender breakdown (Boys/Girls counts)
  - [ ] Search athletes by name
  - [ ] Filter by gender
  - [ ] Filter by graduation year
  - [ ] Sort by name, class, gender
  - [ ] Advanced pagination (First, -10, -5, Prev, Next, +5, +10, Last)
  - [ ] "Clear Filters" button
  - [ ] Links to athlete profiles

### School Records - Individual Records
- [ ] School records page (`/schools/[id]/records`)
  - [ ] Overall XC Time records (by grade + overall)
  - [ ] Grade-level records (9-12)
  - [ ] Boys and girls separated
  - [ ] Top 10 performers ranking
  - [ ] Course selector dropdown
  - [ ] Course-specific records
  - [ ] Course details display (distance, difficulty, XC rating)
  - [ ] Course statistics (races, results count)
  - [ ] School course records (fastest times on course)
  - [ ] Links to athlete and course profiles

### School Team Selection
- [ ] Team selection page (`/schools/[id]/team-selection`)
  - [ ] Season selector with auto-detection (July-June)
  - [ ] Available seasons dropdown
  - [ ] Boys varsity rankings
  - [ ] Girls varsity rankings
  - [ ] Athlete ranking by Season PR (XC Time)
  - [ ] Display Season PR metric
  - [ ] Display Top 3 Average metric
  - [ ] Display Last 3 Average metric
  - [ ] Show race count per athlete
  - [ ] Recent races list (last 5)
  - [ ] Highlight top 7 athletes (5 + 2 alternates)
  - [ ] Team selection guide/explanation

### School Seasons
- [ ] School seasons page (`/schools/[id]/seasons`)
  - [ ] List all seasons with data
  - [ ] Show athlete count per season
  - [ ] Show race count per season
  - [ ] Show gender breakdown (boys/girls count)
  - [ ] Sorted newest first
  - [ ] Clickable season links

### School Results
- [ ] School results page (`/schools/[id]/results`)
  - [ ] Display all meet results for school
  - [ ] Tab navigation structure

---

## ATHLETE FEATURES

### Athletes Listing
- [ ] Athletes directory page (`/athletes`)
  - [ ] Browse all athletes
  - [ ] Search by name (first, last, full name)
  - [ ] Search by school
  - [ ] Gender icons (♂️/♀️)
  - [ ] Table with Name, Grad Year, School
  - [ ] Pagination
  - [ ] Links to athlete profiles

### Athlete Detail Page
- [ ] Athlete profile page (`/athletes/[id]`)
  - [ ] Athlete header with name, school, grade, gender
  - [ ] Course PRs section (personal records on each course)
  - [ ] Season stats (races, best, average, improvement)
  - [ ] Uses XC Time normalization
  - [ ] Shows Crystal Springs standard
  - [ ] Season progression timeline
  - [ ] PR badges (yellow)
  - [ ] Improvement badges (green ↗)
  - [ ] All race results table
  - [ ] 10 sortable columns (Date, Meet, Course, Distance, Time, Pace, Mile Equiv, XC Time, Place, Season)
  - [ ] Shows course difficulty multiplier
  - [ ] Highlights PR performances
  - [ ] Links to meets and courses

---

## COURSE FEATURES

### Course Listing
- [ ] Course directory page (`/courses`)
  - [ ] Search by course name
  - [ ] Filter by distance
  - [ ] "Has results only" checkbox
  - [ ] Sort by: Name, Distance, Difficulty, Races, Total Results
  - [ ] Bidirectional sorting (asc/desc)
  - [ ] Show difficulty badge with color
  - [ ] Show difficulty label (Fast/Moderate/Hard/Very Hard)
  - [ ] Show XC Time Rating
  - [ ] Races count display
  - [ ] Total results count display
  - [ ] "Import Courses" button (admin)
  - [ ] Pagination (15 per page)
  - [ ] Rating system explanation box

### Course Detail Page
- [ ] Course detail page (`/courses/[id]`)
  - [ ] Display course name and distance
  - [ ] Show difficulty rating with label
  - [ ] Show XC Time Rating
  - [ ] Display statistics (races, results)
  - [ ] Rating explanation box
  - [ ] Link to Course Records
  - [ ] Link to Top Performances
  - [ ] Top 5 team performances boys
  - [ ] Top 5 team performances girls
  - [ ] Meets on course (paginated list)
  - [ ] Meet table with Date, Name, Type, Actions

### Course Records
- [ ] Course records page (`/courses/[id]/records`)
  - [ ] Course records by grade level
  - [ ] Overall course record
  - [ ] Grade 9-12 records separately
  - [ ] Boys and girls separated
  - [ ] School filter dropdown
  - [ ] "All Schools" option
  - [ ] Display athlete name, school, time, date, meet

### Course Performances
- [ ] Course performances page (`/courses/[id]/performances`)
  - [ ] Top 50 boys performances
  - [ ] Top 50 girls performances
  - [ ] Separated by gender
  - [ ] Show ranking, athlete, school, time, date

---

## MEET FEATURES

### Meet Listing
- [ ] Meets directory page (`/meets`)
  - [ ] Browse all meets
  - [ ] Sort by Date, Name, Type, Venue
  - [ ] Bidirectional sorting
  - [ ] Default sort: Date (descending)
  - [ ] Pagination (50 per page)
  - [ ] Show race count
  - [ ] Show venue/course name
  - [ ] Links to meet detail

### Meet Detail Page
- [ ] Meet detail page (`/meets/[meetId]`)
  - [ ] Display meet details
  - [ ] Race listings
  - [ ] Combined results view

### Race Detail Page
- [ ] Race detail page (`/meets/[meetId]/races/[raceId]`)
  - [ ] Individual race results

---

## CORE SYSTEMS & CALCULATIONS

### XC Time Rating System
- [ ] Understand XC Time formula (time_seconds * xc_time_rating)
- [ ] Implement in athlete rankings
- [ ] Use in team selection
- [ ] Apply in school records
- [ ] Show in performance comparisons
- [ ] Reference Crystal Springs 2.95-mile standard

### Mile Difficulty Rating
- [ ] Implement difficulty multiplier
- [ ] Color coding (Green < 1.05, Yellow 1.05-1.15, Orange 1.15-1.20, Red >= 1.20)
- [ ] Display difficulty label (Fast/Moderate/Hard/Very Hard)
- [ ] Use in pace calculations
- [ ] Show on course pages

### Grade Level Calculation
- [ ] Implement academic year logic (July 1 - June 30)
- [ ] Calculate grade from graduation_year and race date
- [ ] Use for record categorization
- [ ] Apply in team selection

### Season Stats Aggregation
- [ ] Calculate Season PR (fastest XC time)
- [ ] Calculate Top 3 Average
- [ ] Calculate Last 3 Average
- [ ] Calculate Improvement (first to last)
- [ ] Show in athlete stats

---

## UI/UX FEATURES

### Advanced Sorting & Pagination
- [ ] Multi-column sorting with indicators (↑/↓)
- [ ] Advanced pagination controls
  - [ ] First button
  - [ ] -10 button
  - [ ] -5 button
  - [ ] Previous button
  - [ ] Next button
  - [ ] +5 button
  - [ ] +10 button
  - [ ] Last button
- [ ] Result count updates dynamically

### Visual Enhancements
- [ ] Season progression badges (PR, improvement)
- [ ] Color-coded difficulty ratings
- [ ] Gender icons (♂️/♀️)
- [ ] Sortable column headers
- [ ] Hover effects on links
- [ ] Loading states
- [ ] Error messages

### Explanatory Content
- [ ] Rating system explanation boxes
- [ ] Team selection guide
- [ ] XC Time methodology explanation
- [ ] Difficulty rating explanation
- [ ] Crystal Springs standard reference

---

## ADMIN FEATURES

### Admin Dashboard
- [ ] Admin dashboard page (`/admin`)
  - [ ] System overview stats cards
  - [ ] Quick action links
  - [ ] Data import link
  - [ ] Advanced search link
  - [ ] System health check (if applicable)
  - [ ] Bulk athlete edit form

### Bulk Operations
- [ ] Bulk athlete editing
  - [ ] Select athlete
  - [ ] Edit first name
  - [ ] Edit last name
  - [ ] Edit graduation year
  - [ ] Edit gender
  - [ ] Update button with loading state

### Advanced Search
- [ ] Advanced search page (`/search`)
  - [ ] Search and filtering capabilities
  - [ ] Analytics view

---

## HOME PAGE / DASHBOARD

### Home Page
- [ ] Home page (`/`)
  - [ ] System statistics cards (Schools, Athletes, Courses, Results)
  - [ ] Recent meets carousel
  - [ ] 10-day recent meets logic
  - [ ] Fallback to 5 most recent
  - [ ] Navigation cards to main sections
  - [ ] Hero section
  - [ ] Mission statement
  - [ ] Real-time data loading
  - [ ] Error handling

---

## PRIORITY IMPLEMENTATION ORDER

### Critical (Must Do)
1. [ ] Athlete detail page - with all features
2. [ ] School roster page
3. [ ] School records page
4. [ ] Team selection page
5. [ ] Course records page

### High Priority (Should Do)
6. [ ] Athletes listing page
7. [ ] Schools listing page
8. [ ] Courses listing page
9. [ ] Course detail page
10. [ ] Meets listing page

### Medium Priority (Nice to Have)
11. [ ] School seasons page
12. [ ] Advanced pagination controls
13. [ ] Season progression badges
14. [ ] Course performances page
15. [ ] Meet detail page

### Lower Priority (Polish)
16. [ ] Advanced search
17. [ ] Admin bulk operations
18. [ ] Admin dashboard enhancements

---

## NOTES

- XC Time system is CRITICAL - it appears throughout the old project
- Records pages are heavily used by coaches - prioritize these
- Team selection tool is unique value-add for coaches
- Advanced pagination is UX polish but improves usability significantly
- Badges (PR, improvements) add visual appeal to athlete pages

---

Last Updated: 2025-10-28
Source: /Users/ron/manaxc/OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/
