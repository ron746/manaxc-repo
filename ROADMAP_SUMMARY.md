# Old Project Feature Analysis - Executive Summary

## Overview
A comprehensive audit of the OLD_Projects/mana-xc/oldwebsite project has identified all features, pages, and unique functionality that should be considered for the current manaxc-project/website.

## Key Statistics
- **Total Pages Identified:** 15+ unique page templates
- **Unique Features:** 8 major feature categories
- **Critical Missing Pages:** 10 (in new project)
- **Core Calculations:** 4 advanced systems (XC Time, Difficulty Rating, Grade Level, Stats Aggregation)

## Critical Gaps (Must Implement)

### 1. School Records Pages (CRITICAL)
**Why:** Coaches and administrators need to track school performance records across courses and grade levels
- School-wide XC time records (by grade + overall)
- Top 10 performers ranking
- Course-specific records for school
- Course selector with filtering

**Impact:** Coaches use this daily for team management and athlete tracking

### 2. Team Selection Tool (CRITICAL)
**Why:** Core feature for coach decision-making on varsity roster
- Athlete performance ranking by XC Time
- Season PR, Top 3 Average, Last 3 Average metrics
- Multi-year season support
- Top 7 highlighting for team selection
- Recent race history for each athlete

**Impact:** Helps coaches make data-driven team selection decisions

### 3. Athlete Detail Page (CRITICAL)
**Why:** Central hub for tracking individual athlete performance
- Course PRs (personal records)
- Season stats with XC Time normalization
- Season progression with visual badges (PR, improvements)
- 10-column sortable race history
- Advanced pace calculations

**Impact:** High-use page for athletes and parents tracking progress

### 4. School Records - Individual & Team (CRITICAL)
**Why:** Records are the foundation of cross-country data
- XC Time normalization across different courses
- Grade-level record tracking (9-12 grades + overall)
- School-specific vs course-wide records
- Top 10 all-time performances

**Impact:** Historical records motivate athletes and show progression

### 5. Course Records & Performance Lists (CRITICAL)
**Why:** Course-specific information important for planning and preparation
- All-time course records by grade level
- Course-specific team performances (top 5 runners total time)
- School filtering for course records
- Performance leaderboards

**Impact:** Runners need to know course history when training

## High Priority Features (Should Implement)

### 1. School Listing & Browse (HIGH)
- All schools directory with search
- Pagination and filtering

### 2. School Roster Page (HIGH)
- Browse all athletes at a school
- Multi-column sorting (name, class, gender)
- Advanced pagination with jump buttons

### 3. Course Browsing (HIGH)
- Course directory with filters
- Course difficulty ratings (visual color coding)
- Multi-column sorting and pagination

### 4. Course Details Page (HIGH)
- Course information and statistics
- Team performance rankings on course
- Meets held on course with history

### 5. Meets Directory (MEDIUM-HIGH)
- Browse all meets with sorting
- Meet details and results

## Advanced Features (Phase 2+)

### 1. Season Progression Badges
- Yellow badge for PR performances
- Green arrow badge for improvements
- Visual timeline of season races

### 2. Advanced Sorting & Pagination
- Bidirectional sort indicators (↑/↓)
- Jump pagination: First, -10, -5, Prev, Next, +5, +10, Last
- Multi-column sorting capabilities

### 3. Performance Analytics Dashboard
- Season PR (best time)
- Top 3 average (3 best times)
- Last 3 average (3 most recent)
- Improvement tracking (first vs last)

### 4. Team Performance Aggregation
- Top 5 team scores (sum calculation)
- Team ranking by total time
- Only includes complete teams (5+ runners)

## Core Systems (Must Understand)

### 1. XC Time Rating System
```
Formula: actual_time_seconds * xc_time_rating
Purpose: Normalize performances across different courses/distances
Base Standard: Crystal Springs 2.95-mile course
Used In: Rankings, records, team selection, athlete stats
```

**Critical for:** Fair comparison between courses

### 2. Mile Difficulty Rating
```
Multiplier showing % harder than 1-mile track
< 1.05: Green (Fast)
1.05-1.15: Yellow (Moderate)
1.15-1.20: Orange (Hard)
>= 1.20: Red (Very Hard)
```

**Critical for:** Pace calculations and course selection

### 3. Grade Level Calculation
```
Academic Year: July 1 - June 30
Grade = 12 - (graduation_year - school_year_ending)
Used for: Record categorization, team selection
```

### 4. Season Stats Aggregation
- PR: Fastest XC time in season
- Top 3 Average: Best 3 performances
- Last 3 Average: Most recent 3 performances
- Improvement: First to last delta

## Database Fields Required
- `xc_time_rating` - Course normalization multiplier
- `mile_difficulty` - Course difficulty vs track
- `graduation_year` - For grade calculation
- `season_year` - For season filtering
- `place_overall` - Athlete finish place
- `meet_date`, `race_date` - For sorting
- `gender` - Boys/Girls designation
- `meet_type` - Meet classification

## Implementation Phases

### Phase 1 (Weeks 1-3): Foundation
1. Athletes listing page
2. School roster page
3. Athlete detail page (with all race results)
4. Course listings
5. Course details

### Phase 2 (Weeks 4-6): Records & Analytics
1. School records page
2. Course records page
3. Team selection page
4. School seasons overview

### Phase 3 (Weeks 7-8): Polish & Features
1. Meet listings
2. Advanced pagination
3. Season progression badges
4. Performance visualizations
5. Course performances leaderboard

### Phase 4 (Week 9+): Admin & Refinement
1. Advanced search
2. Admin dashboard enhancements
3. Bulk operations
4. Performance optimization

## Success Criteria
1. All CRITICAL features implemented and tested
2. XC Time system working across all pages
3. Records and rankings showing correctly
4. Advanced pagination and sorting functional
5. Coaches report tool is usable for team selection
6. Athlete profiles show complete race history
7. Records pages match old project's completeness

## File Location Reference
Old project path: `/Users/ron/manaxc/OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/`

See `OLD_PROJECT_FEATURES_ROADMAP.md` for detailed feature documentation with routes, functionality, and code references.

## Conclusion
The old project is feature-rich with sophisticated analytics and record-tracking capabilities. The primary focus for the new project should be:

1. **Immediately:** Core browsing pages (schools, athletes, courses)
2. **Priority:** Records system and team selection tool
3. **Enhancement:** Advanced sorting, pagination, and visualization features

These features are essential for coaches, athletes, and parents who need data-driven insights into cross-country performance.
