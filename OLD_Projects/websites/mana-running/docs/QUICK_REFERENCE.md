# MANA RUNNING - QUICK REFERENCE

**Last Updated:** October 13, 2025

---

## 🚀 DAILY COMMANDS

### Development
```bash
npm run dev          # Start local server (localhost:3000)
npm run build        # Test production build
npm run lint         # Check code quality
```

### Git & Deployment
```bash
git add .
git commit -m "feat: description"
git push origin main  # Auto-deploys to Vercel
```

### Database (Supabase SQL Editor)
```sql
-- Refresh XC times after bulk changes
REFRESH MATERIALIZED VIEW athlete_xc_times;
```

---

## 📊 COMMON SQL QUERIES

### School Roster (with XC Times)
```sql
SELECT 
  a.id,
  a.first_name || ' ' || a.last_name as name,
  a.graduation_year,
  a.gender,
  axt.best_xc_time,
  COUNT(DISTINCT r.id) as total_races
FROM athletes a
LEFT JOIN athlete_xc_times axt ON axt.athlete_id = a.id
LEFT JOIN results r ON r.athlete_id = a.id
WHERE a.current_school_id = '<school_id>'
GROUP BY a.id, a.first_name, a.last_name, a.graduation_year, a.gender, axt.best_xc_time
ORDER BY axt.best_xc_time ASC;
```

### Find Duplicate Results
```sql
SELECT 
  a.first_name || ' ' || a.last_name as athlete,
  m.name as meet,
  r.name as race,
  COUNT(res.id) as count
FROM results res
JOIN athletes a ON a.id = res.athlete_id
JOIN races r ON r.id = res.race_id
JOIN meets m ON m.id = res.meet_id
GROUP BY a.id, a.first_name, a.last_name, r.id, r.name, m.id, m.name
HAVING COUNT(res.id) > 1;
```

### Find Similar Athletes
```sql
SELECT 
  a1.first_name || ' ' || a1.last_name as athlete1,
  s1.name as school1,
  a1.graduation_year as grad1,
  a2.first_name || ' ' || a2.last_name as athlete2,
  s2.name as school2,
  a2.graduation_year as grad2
FROM athletes a1
JOIN athletes a2 ON 
  LOWER(a1.first_name) = LOWER(a2.first_name)
  AND LOWER(a1.last_name) = LOWER(a2.last_name)
  AND a1.id < a2.id
JOIN schools s1 ON s1.id = a1.current_school_id
JOIN schools s2 ON s2.id = a2.current_school_id
WHERE ABS(a1.graduation_year - a2.graduation_year) <= 1
ORDER BY a1.last_name;
```

### Get Meet Results
```sql
SELECT 
  r.place_overall,
  a.first_name || ' ' || a.last_name as athlete,
  s.name as school,
  r.time_seconds,
  (12 - (a.graduation_year - EXTRACT(YEAR FROM m.meet_date)))::INT as grade
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN schools s ON s.id = a.current_school_id
JOIN races ra ON ra.id = r.race_id
JOIN meets m ON m.id = ra.meet_id
WHERE ra.id = '<race_id>'
ORDER BY r.place_overall ASC;
```

### Count Results by School
```sql
SELECT 
  s.name as school,
  COUNT(r.id) as total_results,
  COUNT(DISTINCT a.id) as unique_athletes
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN schools s ON s.id = a.current_school_id
GROUP BY s.name
ORDER BY total_results DESC;
```

### Check Admin Users
```sql
SELECT 
  user_id,
  role,
  email,
  created_at
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

---

## 🔢 TIME CONVERSIONS

### Centiseconds ↔ Display Format

**Remember:** Database stores in CENTISECONDS (not seconds!)
- Field name: `time_seconds` (misleading!)
- 15:30.00 = 93000 centiseconds

**Convert to display:**
```typescript
function formatTime(centiseconds: number): string {
  const totalSeconds = centiseconds / 100
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0')
  return `${minutes}:${seconds}`
}
```

**Convert from MM:SS.CC string:**
```typescript
function parseTime(timeStr: string): number {
  const [minutes, seconds] = timeStr.split(':').map(Number)
  return (minutes * 60 * 100) + (seconds * 100)
}
```

**Examples:**
- 15:30.00 → 93000 centiseconds
- 18:45.25 → 112525 centiseconds
- 14:23.50 → 86350 centiseconds

---

## 📁 IMPORTANT FILE PATHS

### App Routes
```
/app/schools/[id]/page.tsx                   # School roster
/app/schools/[id]/individual-records/        # Individual records ✅
/app/schools/[id]/team-records/              # Team records ⏳
/app/schools/[id]/seasons/                   # Seasons page ⏳
/app/schools/[id]/all-results/               # All results ⏳
/app/schools/[id]/top-performances/          # Top performances ⏳
/app/courses/[id]/records/                   # Course records ⏳
/app/admin/                                  # Admin tools ⏳
```

### Components
```
/components/ResultsTable.tsx                 # Sortable table
/components/ui/                              # shadcn components
```

### Libraries
```
/lib/supabase/client.ts                      # Browser client
/lib/supabase/server.ts                      # Server client
/lib/utils/                                  # Utility functions
```

---

## 🎯 XC TIME CALCULATION

**Formula:**
```
XC Time = time_seconds × course.xc_time_rating
```

**Crystal Springs = Baseline (1.0)**
- Easier courses: rating < 1.0
- Harder courses: rating > 1.0

**Example:**
- 15:30 at Crystal Springs (1.0) → 93000 XC Time
- 15:30 at easier course (0.95) → 88350 XC Time
- 15:30 at harder course (1.05) → 97650 XC Time

**Best XC Time per athlete:**
```sql
SELECT athlete_id, MIN(time_seconds * xc_time_rating)
FROM results r
JOIN races ra ON ra.id = r.race_id
JOIN courses c ON c.id = ra.course_id
GROUP BY athlete_id;
```

**Stored in materialized view:**
```sql
SELECT * FROM athlete_xc_times WHERE athlete_id = '<id>';
```

---

## 🔒 ADMIN ACCESS

### Check User Role
```sql
SELECT role FROM user_profiles WHERE user_id = '<user_id>';
```

### Grant Admin Access
```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Revoke Admin Access
```sql
UPDATE user_profiles 
SET role = 'user' 
WHERE email = 'email@example.com';
```

---

## 📚 DOCUMENTATION QUICK ACCESS

**Start here every time:**
- PROJECT_CONTEXT.md

**For development:**
- IMMEDIATE_ACTION_ITEMS.md
- ADMIN_FEATURES.md or USER_VIEW_ENHANCEMENTS.md

**For reference:**
- MANA_RUNNING_PROJECT_SUMMARY.md
- This file (QUICK_REFERENCE.md)

**For planning:**
- MANA_RUNNING_ROADMAP.md
- NEW_STRATEGIC_DIRECTION.md

---

## 🐛 COMMON ISSUES

### Issue: Can't see XC times
**Fix:** Refresh materialized view
```sql
REFRESH MATERIALIZED VIEW athlete_xc_times;
```

### Issue: 1000 row limit
**Fix:** Use pagination loops
```typescript
let allResults = []
let from = 0
const batchSize = 1000

while (true) {
  const { data } = await supabase
    .from('results')
    .select('*')
    .range(from, from + batchSize - 1)
  
  if (!data || data.length === 0) break
  allResults = [...allResults, ...data]
  if (data.length < batchSize) break
  from += batchSize
}
```

### Issue: Times showing wrong
**Fix:** Divide by 100 (stored in centiseconds!)
```typescript
const displayTime = dbTime / 100  // Convert centiseconds to seconds
```

### Issue: Duplicate athletes
**Fix:** Use Find Duplicate Results admin tool
```sql
-- Or manually find them:
SELECT first_name, last_name, COUNT(*)
FROM athletes
GROUP BY first_name, last_name
HAVING COUNT(*) > 1;
```

---

## 🎨 UI CONVENTIONS

### Time Display
- Format: MM:SS.CC
- Font: Monospace
- Example: 15:30.25

### Gender Display
- Boys: Blue badge
- Girls: Pink badge

### Place Display
- 1st place: 🥇 Gold medal
- 2nd place: 🥈 Silver medal
- 3rd place: 🥉 Bronze medal

### Links
- Athlete names: Blue, underlined on hover
- School names: Green, underlined on hover

---

## 📊 DATABASE STATS QUERIES

### Total Counts
```sql
SELECT 
  (SELECT COUNT(*) FROM athletes) as athletes,
  (SELECT COUNT(*) FROM schools) as schools,
  (SELECT COUNT(*) FROM courses) as courses,
  (SELECT COUNT(*) FROM meets) as meets,
  (SELECT COUNT(*) FROM races) as races,
  (SELECT COUNT(*) FROM results) as results;
```

### Results per Season
```sql
SELECT 
  season_year,
  COUNT(*) as results,
  COUNT(DISTINCT athlete_id) as athletes,
  COUNT(DISTINCT meet_id) as meets
FROM results
GROUP BY season_year
ORDER BY season_year DESC;
```

### Top Schools by Results
```sql
SELECT 
  s.name,
  COUNT(r.id) as total_results
FROM schools s
JOIN athletes a ON a.current_school_id = s.id
JOIN results r ON r.athlete_id = a.id
GROUP BY s.name
ORDER BY total_results DESC
LIMIT 10;
```

---

## 🔧 USEFUL TYPESCRIPT SNIPPETS

### Format Time
```typescript
export function formatTime(centiseconds: number): string {
  const totalSeconds = centiseconds / 100
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = (totalSeconds % 60).toFixed(2).padStart(5, '0')
  return `${minutes}:${seconds}`
}
```

### Calculate Grade
```typescript
export function calculateGrade(
  graduationYear: number,
  meetDate: Date
): number {
  const meetYear = meetDate.getFullYear()
  return 12 - (graduationYear - meetYear)
}
```

### Supabase Pagination
```typescript
async function fetchAllResults(schoolId: string) {
  let allResults = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('results')
      .select(`
        *,
        athlete:athletes(*),
        race:races(*)
      `)
      .eq('athlete.current_school_id', schoolId)
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    allResults = [...allResults, ...data]
    if (data.length < pageSize) break
    from += pageSize
  }

  return allResults
}
```

---

## 🌐 ENVIRONMENT VARIABLES

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## ✅ PRE-DEPLOYMENT CHECKLIST

- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] All pages load correctly
- [ ] Times display correctly (MM:SS.CC)
- [ ] Links work
- [ ] Mobile responsive
- [ ] Performance < 2s per page

---

**Last Updated:** October 13, 2025  
**Keep this handy for daily development!**
