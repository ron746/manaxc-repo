# ManaXC Sprint Documentation

## Last Sprint Summary (2025-10-31)

### What Was Accomplished

1. **Combined Race Projections Page - Major Feature Enhancement**
   - Removed Gender filter from sidebar (made redundant by Boys/Girls toggle)
   - Added ALL courses from database to "Project Times to Course" dropdown (not just meet courses)
   - Fixed projection formula to correctly use `normalized_time_cs` from database
   - Changed formula from: `normalized_time_cs / (1 - (difficulty - 5.0) * 0.02)`
   - To correct formula: `normalized_time_cs * difficulty_rating * (distance_meters / 1609.344)`
   - Hidden difficulty ratings from public view (removed from dropdown display)
   - Moved "Project Times to Course" above "Filters" heading for better UX

2. **XC Scoring Tiebreaker Implementation**
   - Added 6th runner place as tiebreaker display for tied team scores
   - Shows tiebreaker in parentheses: e.g., "44 (6)" where 6 is 6th runner's place
   - Only displays when two or more teams have identical scores
   - Applied to both Boys and Girls team score tables
   - Fixed condition check from `&&` to `!== undefined` to show for both tied teams

3. **Combined Race UI/UX Improvements**
   - Removed "Team Projections" tab entirely (no longer needed)
   - Simplified navigation to just Boys/Girls toggle buttons
   - Made Girls table formatting identical to Boys (spacing, fonts, checkbox sizes)
   - Fixed TypeScript errors with `coursesList` references (changed to `allCoursesList`)
   - Added `is_sb` and `is_pr` fields to Result interface

4. **Database Query Enhancement**
   - Updated results query to fetch `normalized_time_cs`, `is_sb`, `is_pr` from database
   - Removed client-side calculation of normalized times
   - Now uses database-calculated values for accurate projections
   - Separated `meetCourses` (used in filters) from `courses` (all courses for projection)

### Files Modified

- `app/meets/[meetId]/combined-race/page.tsx` - Major overhaul of combined race projections
- `END_OF_SESSION_JOBS.md` - **NEW FILE** - End of session best practices template

### Technical Implementation Details

#### Projection Formula (CORRECTED)
```typescript
// CRITICAL: Must match season page logic
const METERS_PER_MILE = 1609.344

const projectedTime = Math.round(
  result.normalized_time_cs *           // Pace per mile at difficulty 1.0
  targetCourse.difficulty_rating *       // Course difficulty multiplier
  (targetCourse.distance_meters / METERS_PER_MILE)  // Distance in miles
)
```

**Key Insight**: `normalized_time_cs` is stored as pace per mile at difficulty 1.0, NOT at difficulty 5.0 baseline.

#### Tiebreaker Display Logic
```typescript
// Check if any other team has the same score
const hasTie = completeTeams.some(t =>
  t.school_id !== team.school_id && t.score === team.score
)

// Display 6th runner place if tie exists and 6th runner participated
{hasTie && team.sixth_runner_place !== undefined && (
  <span className="text-xs ml-1">({team.sixth_runner_place})</span>
)}
```

#### State Management
```typescript
// Separated course lists for different purposes
const [courses, setCourses] = useState<Course[]>([])        // All courses for projection
const [meetCourses, setMeetCourses] = useState<Course[]>([]) // Only courses from this meet
```

### Known Issues

**RESOLVED**:
- ✅ Projection formula was using incorrect calculation
- ✅ Difficulty ratings exposed to public (now hidden)
- ✅ Tiebreaker only showing for first team (now shows for all tied teams)
- ✅ Girls table formatting inconsistent with Boys (now identical)

**NONE REMAINING** - All issues from session resolved

### Next Sprint Priorities

1. **Season Best (SB) Migration Completion**
   - User mentioned there's a `SEASON_BEST_MIGRATION_GUIDE.md` file
   - May need to complete migration of `is_sb` field across all data
   - Check if backfill has been run on all existing results

2. **Homepage Statistics**
   - Need to add SB/PR statistics to homepage stats display
   - Update `getStats()` query in `lib/supabase/queries.ts`
   - Display counts on main landing page

3. **Performance Optimization**
   - Combined race page loads all results - may need pagination/virtualization for large meets
   - Consider caching projected results
   - Optimize re-renders when toggling inclusions

4. **Testing & Validation**
   - Test projection formula with known course times
   - Verify tiebreaker logic with multiple tied teams
   - Test with meets that have incomplete teams

5. **Admin Features** (if applicable)
   - The project has admin authentication set up
   - May want admin-only visibility for difficulty ratings
   - Consider admin tools for data management

### Database Schema Reference

#### Key Tables
- `courses` - XC courses/venues
- `races` - Individual races (links to course and meet)
- `results` - Individual athlete results (links to race and athlete)
- `athletes` - Athlete records (includes grad_year, gender, school_id)
- `schools` - School records
- `meets` - Meet records (links to venue)

#### Important Fields
- `results.time_cs` - Actual time in centiseconds
- `results.normalized_time_cs` - **Pace per mile at difficulty 1.0** (in centiseconds)
- `results.is_sb` - Boolean flag for season best
- `results.is_pr` - Boolean flag for personal record
- `athletes.grad_year` - Graduation year (used to calculate grade)
- `courses.difficulty_rating` - Course difficulty multiplier (1.0 = easy, higher = harder)
- `courses.distance_meters` - Course distance in meters

#### Projection Formula Explained
The `normalized_time_cs` field stores an athlete's pace per mile at a difficulty of 1.0. To project to a different course:

1. Start with `normalized_time_cs` (pace per mile at diff 1.0)
2. Multiply by target difficulty to adjust for course hardness
3. Multiply by distance in miles to scale to course length

Example:
- Athlete's `normalized_time_cs` = 30000 (5:00/mile pace at diff 1.0)
- Target course: Crystal Springs, 2.95 miles, difficulty 6.5
- Projected time = 30000 * 6.5 * 2.95 = 575,250 cs = 95:52.50

### How to Start Next Sprint

1. **Check Current State**
   ```bash
   cd /Users/ron/manaxc/manaxc-project/website
   git pull
   npm run dev
   ```

2. **Visit Updated Page**
   - Go to any meet's combined race page
   - Test projection dropdown (should show all courses now)
   - Test Boys/Girls toggle
   - Look for tied team scores to verify tiebreaker display

3. **Check for Season Best Migration**
   ```bash
   # Look for migration guide
   find /Users/ron/manaxc -name "SEASON_BEST_MIGRATION_GUIDE.md"

   # Check if is_sb field is populated
   # Via Supabase dashboard or query
   ```

4. **Review END_OF_SESSION_JOBS.md**
   - New file created with session close checklist
   - Use at end of every session for consistency

### Environment Info

- **Tech Stack**: Next.js 16.0.0, React, TypeScript, Tailwind CSS, Supabase
- **Database**: PostgreSQL via Supabase
- **Deployment**: Vercel (production), localhost:3000 (development)
- **Repository**: https://github.com/ron746/manaxc-repo.git
- **Working Directory**: `/Users/ron/manaxc/manaxc-project/website`

### Recent Commits

- **Pending**: Combined race projections enhancement with course selection and tiebreaker
- Latest: See `git log --oneline -5` for current state

### Debug Commands

```bash
# Check git status
git status

# View recent commits
git log --oneline -5

# Check for running dev server
lsof -i :3000

# Check Supabase connection
# (Open browser to Supabase dashboard)

# View all markdown docs
find . -name "*.md" -not -path "*/node_modules/*"
```

### Critical Code Locations

**Projection Logic**:
- File: `app/meets/[meetId]/combined-race/page.tsx`
- Function: `projectedResults` useMemo (lines ~313-335)
- Formula: `normalized_time_cs * difficulty_rating * (distance_meters / 1609.344)`

**Tiebreaker Display**:
- File: `app/meets/[meetId]/combined-race/page.tsx`
- Boys Team Scores: lines ~997-1020
- Girls Team Scores: lines ~1044-1067
- Logic: Checks if any other team has same score, displays 6th runner place

**Course Selection**:
- All courses query: lines ~137-141
- Meet courses extraction: lines ~192-205
- Dropdown uses `courses` state (all courses)
- Filter checkboxes use `meetCourses` state (only meet courses)

### Contact Points

**User Preferences**:
- Keep difficulty ratings hidden from public
- Show tiebreaker for tied scores
- Project times to any course in database (not just meet courses)
- Identical formatting between Boys and Girls sections

**Key Decisions Made**:
- Formula matches season page (user confirmed this was correct)
- 6th runner tiebreaker only shows when scores are actually tied
- Projection dropdown above filters (not a filter itself)
- Gender filter removed from sidebar (redundant with top toggle)

---

## Previous Sprint Summary (2025-10-28)

### What Was Accomplished

1. **Course Records Implementation**
   - Moved course records from separate `/courses/[id]/records` page to main course detail page
   - Added overall course records (fastest time ever) for boys and girls
   - Added grade-level records (9th-12th grade) for boys and girls
   - Color-coded UI: blue cards for boys, pink cards for girls
   - Records link to races, athletes, schools, and meets

2. **Team Performance Calculation Overhaul**
   - Changed from "average of top 7 runners across all races" to "combined time of top 5 runners in a single race"
   - Only teams with exactly 5 runners count as valid team scores
   - Groups results by race first, then by school within each race
   - Shows top 5 team performances overall
   - Reordered sections: Course Records → Team Performances → Meets

3. **UI/UX Improvements**
   - Removed stats cards that were showing 0 (Total Meets, Total Results, Boys Results, Girls Results)
   - Removed "View Course Records" link from Quick Links (since records are now on main page)
   - Fixed 400 error on meets query by removing nested order clause
   - Enhanced visual design with consistent color scheme

---

**Generated**: 2025-10-31
**Status**: Ready for next sprint
**Last Modified By**: Claude Code
