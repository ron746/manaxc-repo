# MANA RUNNING - IMMEDIATE ACTION ITEMS

**Last Updated:** October 13, 2025

---

## âœ… RECENTLY COMPLETED (October 2025)

### XC Time Calculation Fixed (Oct 13)
- [x] Implemented proper XC Time calculation across all pages
- [x] Fixed school roster to show best XC times
- [x] Removed hardcoded 1000-row limits

### 1000-Row Limit Resolution (Oct 13)
- [x] Identified Supabase default 1000-row limit
- [x] Implemented pagination loops
- [x] Created SQL functions for efficient retrieval

### UI Enhancements (Oct 12)
- [x] Added clickable athlete names across all pages
- [x] Added clickable school names across all pages
- [x] ResultsTable component with client-side sorting
- [x] Podium medals on top 3 finishers

### Database Cleanup (Oct 2025)
- [x] Removed 1,328 duplicate athletes
- [x] Added unique constraint
- [x] Updated all foreign key references

### Supabase Auth Migration (Oct 9)
- [x] Migrated to @supabase/ssr
- [x] Updated all configurations
- [x] Eliminated cookie parsing errors

### School Records Pages (Oct 10-11)
- [x] Individual Records Page deployed
- [x] SQL functions created
- [x] 58x performance improvement

---

## 🔴 PHASE 1: ADMIN TOOLS (CRITICAL)

**All admin features must be:**
- Hidden from normal users (role-based access)
- Safe (confirmation prompts)
- Auditable (log all actions)

### 1. Find Duplicate Results âš ï¸ CRITICAL
**Priority:** 🔴 CRITICAL  
**Time:** 2 hours  
**Status:** Not started

**Purpose:** Identify athletes with multiple results in same race (data error)

**Implementation:**
- Create `/app/admin/duplicate-results/page.tsx`
- SQL function: `admin_find_duplicate_results()`
- Search/filter UI
- Preview + resolve duplicate results
- Update race participant counts
- Refresh materialized view

**See:** ADMIN_FEATURES.md Section 1 for complete specification

**Checklist:**
- [ ] Create admin route with access control
- [ ] Create SQL function
- [ ] Build search UI
- [ ] Add preview modal
- [ ] Implement resolution logic
- [ ] Test with sample duplicates

---

### 2. Safe Delete Functions âš ï¸ CRITICAL
**Priority:** 🔴 CRITICAL  
**Time:** 3 hours  
**Status:** Not started

**Purpose:** Properly delete results/races/meets with cascade handling

**Implementation:**
- Create `/app/admin/delete/page.tsx` (3 tabs)
- SQL functions:
  - `admin_delete_result()`
  - `admin_delete_race()`
  - `admin_delete_meet()`
- Create `admin_log` table
- Confirmation modals
- Impact preview

**See:** ADMIN_FEATURES.md Section 2 for complete specification

**Checklist:**
- [ ] Create admin_log table
- [ ] Create 3 SQL delete functions
- [ ] Build 3-tab UI
- [ ] Add search/filter capability
- [ ] Implement confirmation modals
- [ ] Show deletion impact
- [ ] Test all cascade scenarios

---

### 3. Merge Athletes
**Priority:** 🔴 HIGH  
**Time:** 4 hours  
**Status:** Not started

**Purpose:** Combine duplicate athlete records (transfers, name variations)

**Implementation:**
- Create `/app/admin/merge-athletes/page.tsx`
- SQL functions:
  - `admin_find_similar_athletes()`
  - `admin_merge_athletes()`
- Preview merge impact
- Create school transfer records
- Update all foreign keys

**See:** ADMIN_FEATURES.md Section 3 for complete specification

**Checklist:**
- [ ] Create SQL find similar function
- [ ] Create SQL merge function
- [ ] Build search UI
- [ ] Add preview modal
- [ ] Implement merge logic
- [ ] Test with sample duplicates

---

### 4. Test Course Rating Accuracy
**Priority:** 🟡 MEDIUM  
**Time:** 8 hours  
**Status:** Not started

**Purpose:** AI analysis to flag incorrect course difficulty ratings

**Implementation:**
- Create `/app/admin/course-ratings/page.tsx`
- SQL function: `admin_analyze_course_rating()`
- Algorithm: Compare athletes who ran multiple courses
- Flag courses where expected vs actual differs >5%
- Optional: Claude API integration

**See:** ADMIN_FEATURES.md Section 4 for complete specification

**Checklist:**
- [ ] Create analysis SQL function
- [ ] Build analysis UI
- [ ] Implement comparison algorithm
- [ ] Add confidence scoring
- [ ] Create detail view per course
- [ ] (Optional) Add Claude API integration

---

### 5. Update Course Rating
**Priority:** 🟡 MEDIUM  
**Time:** 1 hour  
**Status:** Not started

**Purpose:** Manual adjustment tool for course ratings

**Implementation:**
- Create `/app/admin/update-course-rating/page.tsx`
- SQL function: `admin_update_course_rating()`
- Show impact preview
- Require reason for change
- Log to admin_log

**See:** ADMIN_FEATURES.md Section 5 for complete specification

**Checklist:**
- [ ] Create SQL update function
- [ ] Build simple form UI
- [ ] Show impact (affected athletes)
- [ ] Require reason field
- [ ] Test rating updates

---

### 6. Import Meet Results âš ï¸ HIGH
**Priority:** 🔴 HIGH  
**Time:** 6 hours  
**Status:** Not started

**Purpose:** Bulk upload from timing systems (CSV, Athletic.net)

**Implementation:**
- Create `/app/admin/import-meet/page.tsx` (multi-step wizard)
- SQL functions:
  - `import_match_or_create_athlete()`
  - `import_meet_results()`
- Support CSV and Athletic.net formats
- Validate and match athletes
- Preview before import
- Create new athletes as needed

**See:** ADMIN_FEATURES.md Section 6 for complete specification

**Checklist:**
- [ ] Create 6-step wizard UI
- [ ] Implement CSV parser
- [ ] Implement Athletic.net parser
- [ ] Create SQL import functions
- [ ] Add athlete matching logic
- [ ] Add validation
- [ ] Test with sample meet data

---

## 🟡 PHASE 2: USER VIEW ENHANCEMENTS

### 1. Top Performances Page (Rename from School Records)
**Priority:** 🟡 HIGH  
**Time:** 2 hours  
**Status:** Not started

**Changes:**
- Rename `/schools/[id]/individual-records` to `/top-performances`
- Remove course selection dropdown
- Show overall best XC times (already normalized)
- Keep gender/grade filtering
- Add season filtering

**See:** USER_VIEW_ENHANCEMENTS.md Section 1

**Checklist:**
- [ ] Create new route
- [ ] Copy existing page logic
- [ ] Remove course filtering
- [ ] Add season filter
- [ ] Update navigation
- [ ] Test with various schools

---

### 2. Course Records Page
**Priority:** 🟡 HIGH  
**Time:** 4 hours  
**Status:** Not started

**Features:**
- Show top time for each course
- 10 categories (5 per gender): Overall, 9th, 10th, 11th, 12th
- Two-column layout (Boys | Girls)
- Course selection dropdown

**See:** USER_VIEW_ENHANCEMENTS.md Section 2

**Checklist:**
- [ ] Create `/courses/[id]/records/page.tsx`
- [ ] Create SQL function `get_course_records()`
- [ ] Build two-column layout
- [ ] Add course dropdown
- [ ] Test with multiple courses

---

### 3. Team Records Page
**Priority:** 🟡 MEDIUM  
**Time:** 3 hours  
**Status:** Not started

**Features:**
- Best varsity time (top 5 athletes, same day)
- Best frosh/soph time (top 5 F/S, same day)
- Show boys and girls separately
- Optional course filtering

**See:** USER_VIEW_ENHANCEMENTS.md Section 3

**Checklist:**
- [ ] Create `/schools/[id]/team-records/page.tsx`
- [ ] Create SQL function `get_best_team_performance()`
- [ ] Create custom type for runner data
- [ ] Build 4-section layout
- [ ] Add optional course filter
- [ ] Test with various schools

---

### 4. Seasons Page
**Priority:** 🟡 MEDIUM  
**Time:** 6 hours  
**Status:** Not started

**Features:**
- List all seasons with summary stats
- Click season to see athlete details
- Show: XC Time PR, Avg of top 3, Last 3 races, Improvement %
- Sortable by all columns
- Filter by gender and grade

**See:** USER_VIEW_ENHANCEMENTS.md Section 4

**Checklist:**
- [ ] Create `/schools/[id]/seasons/page.tsx` (list)
- [ ] Create `/schools/[id]/seasons/[year]/page.tsx` (detail)
- [ ] Create SQL functions for season data
- [ ] Build sortable table
- [ ] Add improvement % calculation
- [ ] Color code improvements (green/red)
- [ ] Test with various schools/years

---

### 5. All Results Page
**Priority:** 🟡 MEDIUM  
**Time:** 3 hours  
**Status:** Not started

**Features:**
- List all athletes with results
- Rank by gender
- Show: Name, Grad Year, Division, Total Races, XC Time PR
- Sortable by all fields
- Filter by gender/grade/season

**See:** USER_VIEW_ENHANCEMENTS.md Section 5

**Checklist:**
- [ ] Create `/schools/[id]/all-results/page.tsx`
- [ ] Create SQL function `get_school_all_results()`
- [ ] Build sortable table
- [ ] Add filters
- [ ] Show separate ranks for Boys/Girls
- [ ] Test with various schools

---

## 🟢 OPTIONAL ENHANCEMENTS (NICE TO HAVE)

### Database Performance
- [ ] Add remaining indexes (if not done)
- [ ] Profile slow queries
- [ ] Optimize materialized view refresh

### Code Quality
- [ ] Extract reusable components (AthleteLink, TimeDisplay, etc.)
- [ ] Add TypeScript interfaces for all data structures
- [ ] Improve error handling across app
- [ ] Add loading skeletons

### Testing
- [ ] Add unit tests for utility functions
- [ ] Add integration tests for SQL functions
- [ ] Test with large datasets (10,000+ athletes)

---

## VERIFICATION CHECKLIST

### After Admin Tools Complete
- [ ] Only admins can access `/admin/*` routes
- [ ] All admin actions logged in `admin_log` table
- [ ] Confirmation prompts prevent accidental deletions
- [ ] Materialized view refreshes after data changes
- [ ] No orphaned foreign keys after merges/deletes

### After User Views Complete
- [ ] All pages load in < 2 seconds
- [ ] Mobile responsive on all views
- [ ] Links work correctly (athlete/school pages)
- [ ] Times display correctly (MM:SS.CC format)
- [ ] Sorting works on all columns
- [ ] Filters work as expected
- [ ] No console errors

---

## IMPLEMENTATION SEQUENCE

### Week 1: Critical Admin Tools
1. Find Duplicate Results (2h)
2. Safe Delete Functions (3h)
3. Merge Athletes (4h)
**Total:** 9 hours

### Week 2: Import & High Priority Views
4. Import Meet Results (6h)
5. Top Performances Page (2h)
6. Course Records Page (4h)
**Total:** 12 hours

### Week 3: Remaining Views
7. All Results Page (3h)
8. Team Records Page (3h)
9. Seasons Page (6h)
**Total:** 12 hours

### Week 4: Optional & Testing
10. Test Course Ratings (8h)
11. Update Course Rating (1h)
12. Code cleanup and testing (3h)
**Total:** 12 hours

**Grand Total:** ~45 hours of development work

---

## QUICK ADMIN QUERIES

### Check Admin Role
```sql
SELECT user_id, role, email
FROM user_profiles
WHERE role = 'admin';
```

### View Recent Admin Actions
```sql
SELECT 
  al.created_at,
  al.action,
  al.details,
  u.email
FROM admin_log al
JOIN auth.users u ON u.id = al.admin_user_id
ORDER BY al.created_at DESC
LIMIT 20;
```

### Count Potential Issues
```sql
-- Duplicate results
SELECT COUNT(*) FROM (
  SELECT athlete_id, race_id
  FROM results
  GROUP BY athlete_id, race_id
  HAVING COUNT(*) > 1
) as dupes;

-- Similar athletes
SELECT COUNT(*) FROM (
  SELECT a1.id, a2.id
  FROM athletes a1
  JOIN athletes a2 ON 
    LOWER(a1.first_name) = LOWER(a2.first_name)
    AND LOWER(a1.last_name) = LOWER(a2.last_name)
    AND a1.id < a2.id
  WHERE ABS(a1.graduation_year - a2.graduation_year) <= 1
) as similar;
```

---

## PRIORITY GUIDE

- 🔴 **CRITICAL** = Do immediately (data integrity, essential tools)
- 🟡 **HIGH** = Do this week (important features, user experience)
- 🟢 **MEDIUM** = Do this month (nice to have, optimization)

---

**Last Updated:** October 13, 2025  
**Next Review:** October 20, 2025  
**Current Phase:** Admin Tools Development
