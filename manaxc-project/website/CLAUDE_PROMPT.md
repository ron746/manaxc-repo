# ManaXC Sprint Documentation

## Last Sprint Summary (2025-10-28)

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

4. **Debug Logging**
   - Added comprehensive console.log debugging to investigate data accuracy issues
   - Tracks total results, Willow Glen results specifically, race groupings, and team compositions
   - Logs help identify missing or filtered-out results

### Files Modified

- `app/courses/[id]/page.tsx` - Main course detail page with records and team performances
- `app/courses/[id]/records/page.tsx` - Old records page (may need to be removed or redirected)
- `app/courses/page.tsx` - Courses listing page
- `app/meets/page.tsx` - Meets listing page
- `components/layout/Header.tsx` - Navigation header
- `lib/supabase/queries.ts` - Database queries

### Technical Implementation Details

#### Grade Calculation
```typescript
const grade = 12 - (result.athlete.grad_year - seasonYear)
```

#### Gender Filtering
```typescript
const boysResults = resultsData?.filter((r: any) => {
  const raceGender = r.race?.gender
  const athleteGender = r.athlete?.gender
  return raceGender === 'M' || raceGender === 'Boys' || athleteGender === 'M'
}) || []
```

#### Team Performance Algorithm
1. Group results by race ID
2. Within each race, group by school ID
3. For each school in each race:
   - Sort by time
   - Take top 5 runners
   - Only count if exactly 5 runners
   - Calculate combined time (sum, not average)
4. Sort all performances by combined time
5. Display top 5

### Known Issues

1. **Data Accuracy Concern**
   - User reported: "Willow Glen ran a much faster team time and had much faster runners on the course than is being listed"
   - Debug logging added but not yet verified
   - Need to check browser console for:
     - Total results fetched
     - Willow Glen results count and times
     - Whether Willow Glen had 5 runners in any single race
     - Race grouping working correctly

2. **Potential Root Causes**
   - Gender filtering may be excluding results
   - Grade calculation may be filtering out certain athletes
   - Race grouping might be splitting teams incorrectly
   - Team composition requirement (exactly 5 runners) may be too strict
   - Data may not be fully imported for certain meets

### Next Sprint Priorities

1. **IMMEDIATE: Investigate Data Accuracy**
   - Visit http://localhost:3000/courses/80cbf969-ceea-4145-9565-c3c68cebe99f
   - Check browser console for debug output
   - Verify Willow Glen results are present in database
   - Check if Willow Glen had complete teams (5 runners) in specific races
   - May need to adjust filtering logic or team composition requirements

2. **Create Course Performances Page**
   - From todo list: "Create course performances page based on old project logic"
   - Should show all individual performances on a course
   - Filterable by gender, grade, school, season
   - Sortable by time, date, athlete name

3. **Clean Up / Remove Old Records Page**
   - Consider removing or redirecting `app/courses/[id]/records/page.tsx`
   - Or repurpose it for a different view

4. **Remove Debug Logging (Once Issues Resolved)**
   - All the console.log statements should be removed for production
   - Or convert to conditional debugging based on environment variable

### Database Schema Reference

#### Key Tables
- `courses` - XC courses/venues
- `races` - Individual races (links to course and meet)
- `results` - Individual athlete results (links to race and athlete)
- `athletes` - Athlete records (includes grad_year, gender, school_id)
- `schools` - School records
- `meets` - Meet records (links to venue)

#### Important Fields
- `results.time_cs` - Time in centiseconds
- `athletes.grad_year` - Graduation year (used to calculate grade)
- `athletes.gender` - 'M' or 'F'
- `races.gender` - May be 'M', 'F', 'Boys', 'Girls', or other values
- `courses.difficulty_rating` - Course difficulty multiplier
- `results.normalized_time_cs` - Normalized time for cross-course comparison

### How to Start Next Sprint

1. **Check Current State**
   ```bash
   cd /Users/ron/manaxc/manaxc-project/website
   npm run dev
   ```

2. **Visit Problematic Page**
   - Go to http://localhost:3000/courses/80cbf969-ceea-4145-9565-c3c68cebe99f
   - Open browser console (Cmd+Option+J)
   - Review debug output

3. **Investigate Based on Console Output**
   - If Willow Glen results are missing: Check database queries
   - If results exist but filtered: Check gender/grade filtering logic
   - If results exist but not enough for team: Adjust team composition logic or check data completeness

4. **Tools Available**
   - Supabase dashboard: Check data directly in database
   - Debug scripts in `/tmp/` (may still be available)
   - Python scripts for data investigation in project root

### Environment Info

- **Tech Stack**: Next.js 16.0.0, React, TypeScript, Tailwind CSS, Supabase
- **Database**: PostgreSQL via Supabase
- **Deployment**: Vercel (production), localhost:3000 (development)
- **Repository**: https://github.com/ron746/manaxc-repo.git
- **Working Directory**: `/Users/ron/manaxc/manaxc-project/website`

### Recent Commits

- Latest: `6f23666` - "Add course records and enhanced team performances to course detail page"
- Previous: `1c66436` - "Fix meets pages: Change course relationship to venue"

### Debug Commands

```bash
# Check git status
git status

# View recent commits
git log --oneline -5

# Check Supabase connection
# (Open browser to Supabase dashboard)

# Check for any stray process
lsof -ti:3000

# Kill dev server if needed
pkill -f "npm run dev"
```

### Contact Points

If you need to reference the old project logic for course performances:
- Look for old implementation in git history
- Check for any backup/reference files in project
- User may have specific requirements based on previous system

---

**Generated**: 2025-10-28
**Status**: Ready for next sprint
**Last Modified By**: Claude Code
