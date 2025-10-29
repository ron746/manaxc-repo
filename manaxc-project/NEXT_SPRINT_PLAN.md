# Next Sprint Plan - Data Quality & Enhanced Analytics

**Planned Start:** October 29, 2025 (Morning)
**Estimated Duration:** 3-4 hours
**Priority Level:** High
**Sprint Theme:** Data Quality Improvements & Performance Analytics

---

## Sprint Context

### Recently Completed (October 28, 2025 Evening)

✅ **Filter Enhancement Sprint**
- Athletic calendar grade calculation fix
- Checkbox-driven multi-select filters
- CIF metadata integration
- Optimized database queries
- Comprehensive filtering across all pages

### Current System Status

🟢 **OPERATIONAL**
- All grade calculations accurate
- All filtering features working
- Vercel deployment configured for auto-deploy
- Production site: https://manaxc.vercel.app/
- Custom domain: https://manaxc.com

---

## Next Sprint Goals

### Primary Goal
**Enhance data quality and add performance analytics pages to help coaches and athletes gain insights from existing data.**

### Success Criteria
1. ✅ Course performances page created and deployed
2. ✅ Data quality issues identified and documented
3. ✅ At least 2 new analytics features implemented
4. ✅ All builds passing, no regressions
5. ✅ Documentation updated

---

## Recommended Sprint Tasks

### HIGH PRIORITY - Data Quality

#### 1. Review & Fix CIF Metadata Gaps 🔴 CRITICAL
**Estimated Time:** 30 minutes

**Problem:** Many schools have null CIF Section, Division, League, or Subleague values

**Tasks:**
1. Run query to count schools with null metadata
2. Identify which schools need data
3. Determine source for missing data (Athletic.net? CCS website?)
4. Update database with missing values
5. Verify filters work correctly with updated data

**SQL Query to Start:**
```sql
SELECT
  COUNT(*) as total_schools,
  COUNT(cif_section) as has_section,
  COUNT(cif_division) as has_division,
  COUNT(league) as has_league,
  COUNT(subleague) as has_subleague
FROM schools;
```

**Deliverable:** Database updated with accurate CIF metadata

---

### HIGH PRIORITY - Analytics Features

#### 2. Create Course Performances Page 🟡 NEW FEATURE
**Estimated Time:** 60 minutes

**Goal:** Add comprehensive top performances view for each course

**Location:** `/app/courses/[id]/performances/page.tsx`

**Features to Implement:**
- Top 50 or 100 all-time performances on the course
- Separate tabs/sections for Boys and Girls
- Filterable by grade level, school, season year
- Show athlete name, school, time, date, grade
- Link to athlete profile and meet results
- Pagination if showing more than 50 results

**Data Source:** `course_records` table (already optimized)

**UI Reference:** Copy pattern from School Records Performances page

**Query Example:**
```typescript
const { data: performancesData } = await supabase
  .from('course_records')
  .select('*')
  .eq('course_id', courseId)
  .eq('gender', selectedGender)
  .order('rank', { ascending: true })
  .limit(100)
```

**Deliverable:** `/courses/[id]/performances` page showing top times

---

#### 3. Add Team Performance Rankings Page 🟡 NEW FEATURE
**Estimated Time:** 90 minutes

**Goal:** Show best team performances across all courses

**Location:** `/app/teams/performances/page.tsx` (NEW)

**Features:**
- Best team scores (sum of top 5) on each course
- Separate rankings for Boys and Girls
- Filter by course, season year, CIF division
- Show school name, score, team time, date, meet
- Clickable links to meet results
- Top 25 teams displayed per course

**Data Approach:**
- Query results table grouped by meet_id + school_id
- Filter to races with >= 5 runners from same school
- Calculate team score (sum of top 5 places)
- Rank by lowest score

**Deliverable:** New team performances page with rankings

---

### MEDIUM PRIORITY - Page Enhancements

#### 4. Enhance Course Detail Page with Statistics 🟢 ENHANCEMENT
**Estimated Time:** 45 minutes

**Current State:** Course detail page shows records and recent meets

**Enhancements to Add:**
1. **Performance Distribution Chart** (optional, if time allows)
   - Histogram showing time distribution
   - Uses Chart.js or Recharts

2. **Course Statistics Card**
   - Total races run on course
   - Total unique athletes
   - Total unique schools
   - Average winning time (boys/girls)
   - Fastest pace per mile

3. **Seasonal Trends** (if time allows)
   - Average times by season year
   - Shows course is getting faster/slower over time

**Data Source:** Aggregate queries on `results` and `races` tables

**Deliverable:** Enhanced course detail page with statistics

---

#### 5. Add Athlete Comparison Tool 🟢 ENHANCEMENT
**Estimated Time:** 60 minutes

**Goal:** Allow coaches to compare multiple athletes side-by-side

**Location:** `/app/compare/page.tsx` (NEW)

**Features:**
- Select 2-5 athletes to compare
- Show season-best times for current season
- Show all-time personal best
- Show progression over time (table or chart)
- Compare by course (times on same courses)
- Export comparison to PDF or image

**UI Approach:**
- Dropdown multi-select for athlete selection
- Table with athletes as columns, metrics as rows
- Optional line chart showing progression

**Deliverable:** New athlete comparison page

---

### LOW PRIORITY - Documentation & Cleanup

#### 6. Update CURRENT-STATUS.md 📝 DOCUMENTATION
**Estimated Time:** 20 minutes

**Problem:** File last updated October 26, now very outdated

**Tasks:**
1. Update system status to reflect current state
2. Add all recent sprint accomplishments
3. Update next priorities section
4. Update infrastructure status (Vercel, not Cloudflare Pages)
5. Remove outdated information

**Deliverable:** Current and accurate CURRENT-STATUS.md file

---

#### 7. Code Refactoring - Extract Grade Calculation 🔧 TECH DEBT
**Estimated Time:** 30 minutes

**Problem:** `getGrade()` function duplicated across 3-4 files

**Solution:** Create shared utility

**Tasks:**
1. Create `/lib/utils/grade.ts` file
2. Export `getGrade()` function
3. Export `getGradeLabel()` function
4. Update all pages to import from shared location
5. Test that all pages still work correctly

**Example:**
```typescript
// /lib/utils/grade.ts
export function getGrade(gradYear: number, meetDate: string): number {
  const meetYear = new Date(meetDate).getFullYear()
  const meetMonth = new Date(meetDate).getMonth()
  const seasonYear = meetMonth >= 6 ? meetYear + 1 : meetYear
  return 12 - (gradYear - seasonYear)
}

export function getGradeLabel(grade: number): string {
  const labels: { [key: number]: string } = {
    9: 'Freshman',
    10: 'Sophomore',
    11: 'Junior',
    12: 'Senior'
  }
  return labels[grade] || `Grade ${grade}`
}
```

**Deliverable:** Shared grade utility file, all pages updated

---

## Sprint Order Recommendation

### Phase 1: Data Quality (30-45 min)
1. Review & Fix CIF Metadata Gaps
2. Update CURRENT-STATUS.md

### Phase 2: New Pages (2-2.5 hours)
3. Create Course Performances Page
4. Add Team Performance Rankings Page (if time)

### Phase 3: Enhancements (1-1.5 hours)
5. Enhance Course Detail Page with Statistics
6. Add Athlete Comparison Tool (if time)

### Phase 4: Tech Debt (30 min)
7. Code Refactoring - Extract Grade Calculation

**Total Estimated Time:** 3-4 hours

---

## Alternative Sprint Focus Options

If the user wants to focus on different priorities, here are alternatives:

### Option A: Import System Enhancement
**Focus:** Improve data import capabilities
**Tasks:**
- Build batch import UI for multiple meets
- Add import progress indicators
- Add data validation preview before import
- Create import history/audit log

### Option B: User Experience Features
**Focus:** Make site more user-friendly
**Tasks:**
- Add search functionality (global search)
- Add favorite athletes/schools bookmarking
- Add recent viewed pages tracking
- Add keyboard shortcuts for navigation

### Option C: Mobile Optimization
**Focus:** Improve mobile experience
**Tasks:**
- Test all pages on actual mobile devices
- Optimize filter sidebar for mobile (collapsible)
- Add mobile-specific layouts
- Improve touch targets and spacing

### Option D: Performance Optimization
**Focus:** Make site even faster
**Tasks:**
- Add caching layer
- Optimize images
- Add lazy loading for tables
- Profile and optimize slow queries

---

## Known Issues to Monitor

### From Previous Sprints

1. **Willow Glen Data Accuracy** (from Evening Sprint Oct 28)
   - User reported faster times not showing
   - Debug logging added but not yet reviewed
   - Need to check browser console on specific course page

2. **Venue/Distance Extraction** (from earlier sprints)
   - Some meets have venue extraction issues
   - Baylands course has incorrect distance
   - May need manual fixes or scraper improvements

3. **Import Failure** (from earlier sprints - CRITICAL_ISSUES.md)
   - 0/1633 results imported in one test
   - Root cause may be CSV structure vs importer mismatch
   - Should be addressed if planning import sprint

---

## Success Metrics

After completing this sprint, we should have:

✅ **Code Quality**
- All builds passing
- No TypeScript errors
- No console warnings
- Shared utilities for common functions

✅ **Features**
- At least 2 new analytics pages deployed
- Enhanced statistics on existing pages
- Better data quality (CIF metadata filled)

✅ **Documentation**
- CURRENT-STATUS.md up to date
- NEXT_SPRINT_PLAN.md for following sprint
- Code comments where needed

✅ **User Value**
- Coaches can analyze team performances
- Athletes can see course records
- Better insights from existing data

---

## Pre-Sprint Checklist

Before starting tomorrow morning's sprint:

1. ☐ Review this sprint plan
2. ☐ Check Vercel deployment completed successfully
3. ☐ Test a few pages to ensure tonight's deploy works
4. ☐ Read FILTER_ENHANCEMENT_SPRINT_SUMMARY.md for context
5. ☐ Check for any urgent issues or user feedback
6. ☐ Decide which tasks to prioritize
7. ☐ Ensure dev server can start (`npm run dev`)
8. ☐ Ensure database connection works

---

## Post-Sprint Checklist

After completing tomorrow morning's sprint:

1. ☐ Update CLAUDE_PROMPT.md with new sprint section
2. ☐ Create sprint summary document
3. ☐ Commit all changes with descriptive message
4. ☐ Push to GitHub
5. ☐ Verify Vercel deployment
6. ☐ Create next sprint plan
7. ☐ Document any discovered issues
8. ☐ Clean up debug logging if added

---

## Notes for Next Session

### Context to Preserve

**Key Files to Reference:**
- `/CLAUDE_PROMPT.md` - Always read first
- `/FILTER_ENHANCEMENT_SPRINT_SUMMARY.md` - Most recent sprint details
- `/NEXT_SPRINT_PLAN.md` - This file

**Database Tables to Use:**
- `course_records` - Pre-computed top performances per course
- `school_course_records` - Pre-computed school records per grade/course
- `athlete_best_times` - Season and all-time bests per athlete
- `results` - Raw race results (use for aggregations)

**Patterns to Follow:**
- Set-based state management for filters
- useMemo for expensive calculations
- Checkbox filters with Select All and null support
- Athletic calendar grade calculation: `getGrade(gradYear, meetDate)`

**What's Working Well:**
- Optimized database queries
- Consistent UI patterns
- Comprehensive filtering
- Fast page loads

**Areas for Improvement:**
- Code duplication (grade calculations)
- Missing data quality (CIF metadata)
- Could use more analytics features
- Mobile experience needs testing

---

## Questions for User (Morning Session)

At start of tomorrow's session, ask:

1. **Priority Focus**: Which sprint option do you prefer?
   - Data Quality & Analytics (recommended)
   - Import System Enhancement
   - User Experience Features
   - Mobile Optimization
   - Performance Optimization

2. **Time Available**: How much time do you have for tomorrow's sprint?
   - 1-2 hours (choose 1-2 high priority tasks)
   - 3-4 hours (full sprint as planned)
   - 5+ hours (add stretch goals)

3. **Specific Requests**: Any specific features or fixes you want prioritized?

4. **Feedback**: Any issues with tonight's filter enhancement deployment?

---

## Stretch Goals (If Time Permits)

If sprint goes faster than expected:

1. Add export functionality (CSV/PDF)
2. Create print-friendly styles
3. Add loading skeletons instead of "Loading..." text
4. Add error boundaries for better error handling
5. Add tooltips explaining statistical terms
6. Create admin dashboard summary page
7. Add recent activity feed on homepage

---

## Sprint Dependencies

**Required Services:**
- ✅ Supabase (database)
- ✅ Vercel (hosting)
- ✅ GitHub (source control)
- ✅ Node.js + npm (development)

**Required Files:**
- ✅ Environment variables (.env.local)
- ✅ Supabase client configured
- ✅ All dependencies installed

**Optional Tools:**
- Chart.js or Recharts (for charts, if implementing)
- jsPDF (for PDF export, if implementing)

---

**Document Created:** October 28, 2025 (Late Evening)
**For Sprint:** October 29, 2025 (Morning)
**Status:** 📋 READY FOR REVIEW
**Recommended Focus:** Data Quality & Analytics
**Estimated Duration:** 3-4 hours

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
