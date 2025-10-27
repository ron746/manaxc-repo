# MANA RUNNING - QUICK REFERENCE CARD

**Last Updated:** October 12, 2025

---

## ⚠️ CRITICAL: TIME STORAGE

**Times are stored in CENTISECONDS, not seconds!**

```typescript
// Database field: time_seconds (misleading name - actually centiseconds)
// 15:30.00 = 93000 centiseconds

// ✅ CORRECT conversion for display
const actualSeconds = time_seconds / 100;
const displayTime = formatTime(actualSeconds);

// Quick conversions
// 1 minute = 6000 centiseconds
// 1 second = 100 centiseconds
// 5:00 (5 minutes) = 30000 centiseconds
// 40:00 (40 minutes) = 240000 centiseconds
```

---

## 🔗 ESSENTIAL LINKS

**Production:** https://mana-running.vercel.app/  
**GitHub:** https://github.com/ron681/mana-running  
**Vercel Dashboard:** https://vercel.com/dashboard  
**Supabase Dashboard:** [Your Supabase URL]/project/_/editor

---

## ⚡ QUICK COMMANDS

```bash
# Development
npm run dev                    # Start local server (http://localhost:3000)
npm run build                  # Test production build
npm run lint                   # Check code quality

# Database
supabase db reset              # Reset local database
supabase db push               # Push migrations to remote
supabase migration new <name>  # Create new migration

# Deployment
git push origin main           # Auto-deploy to production
vercel logs                    # View deployment logs
```

---

## 🗄️ DATABASE QUICK QUERIES

### Check for Duplicates
```sql
SELECT first_name, last_name, current_school_id, graduation_year, COUNT(*)
FROM athletes
GROUP BY first_name, last_name, current_school_id, graduation_year
HAVING COUNT(*) > 1;
-- Should return 0 rows (constraint prevents duplicates)
```

### Top 7 Varsity (Boys 5K) - CENTISECONDS!
```sql
SELECT 
  a.first_name, 
  a.last_name, 
  AVG(r.time_seconds) / 100 as avg_seconds,  -- Divide by 100!
  MIN(r.time_seconds) / 100 as pr_seconds    -- Divide by 100!
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN races ra ON ra.id = r.race_id
WHERE a.current_school_id = '<school-id>' 
  AND ra.distance = '5K' 
  AND ra.gender = 'M'
GROUP BY a.id, a.first_name, a.last_name
ORDER BY avg_seconds ASC
LIMIT 7;
```

### Athlete Race History - CENTISECONDS!
```sql
SELECT 
  r.time_seconds / 100 as actual_seconds,  -- Divide by 100!
  r.place_overall, 
  m.name, 
  m.meet_date, 
  ra.distance
FROM results r
JOIN races ra ON ra.id = r.race_id
JOIN meets m ON m.id = r.meet_id
WHERE r.athlete_id = '<athlete-id>'
ORDER BY m.meet_date DESC;
```

### Find Course PRs - CENTISECONDS!
```sql
SELECT 
  a.first_name, 
  a.last_name, 
  MIN(r.time_seconds) / 100 as pr_seconds  -- Divide by 100!
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN races ra ON ra.id = r.race_id
JOIN courses c ON c.id = ra.course_id
WHERE c.name = 'Crystal Springs'
GROUP BY a.id, a.first_name, a.last_name
ORDER BY pr_seconds ASC
LIMIT 10;
```

### Verify Race Participant Counts
```sql
-- Check races where stored count doesn't match actual results
SELECT 
  r.id,
  r.name,
  r.total_participants as stored_count,
  (SELECT COUNT(*) FROM results WHERE race_id = r.id) as actual_count,
  r.total_participants - (SELECT COUNT(*) FROM results WHERE race_id = r.id) as diff
FROM races r
WHERE r.total_participants IS NOT NULL
  AND r.total_participants != (SELECT COUNT(*) FROM results WHERE race_id = r.id)
ORDER BY ABS(r.total_participants - (SELECT COUNT(*) FROM results WHERE race_id = r.id)) DESC
LIMIT 20;
```

### Find Races by Course
```sql
SELECT 
  r.id, 
  r.name, 
  r.gender, 
  r.category, 
  m.name as meet_name, 
  m.meet_date
FROM races r
JOIN meets m ON m.id = r.meet_id
WHERE r.course_id = '<course-id>'
ORDER BY m.meet_date DESC;
```

---

## 🚨 CRITICAL CODE SNIPPETS

### Prevent Duplicate Athletes (Use Before Every Insert)
```typescript
// ALWAYS check before creating athlete
const { data: existing } = await supabase
  .from('athletes')
  .select('id')
  .eq('first_name', firstName)
  .eq('last_name', lastName)
  .eq('current_school_id', schoolId)
  .eq('graduation_year', gradYear)
  .single();

if (existing) {
  return existing.id; // Use existing
}
// Only create if not found
const { data: newAthlete } = await supabase
  .from('athletes')
  .insert({
    first_name: firstName,
    last_name: lastName,
    current_school_id: schoolId,
    graduation_year: gradYear
  })
  .select()
  .single();

return newAthlete.id;
```

### Validate Input Data (Remember: CENTISECONDS!)
```typescript
// Graduation year: 2024-2030
if (gradYear < 2024 || gradYear > 2030) {
  throw new Error('Invalid graduation year');
}

// 5K time: 5:00 to 40:00 (in CENTISECONDS!)
// 5:00 = 30000 centiseconds
// 40:00 = 240000 centiseconds
if (finishTime < 30000 || finishTime > 240000) {
  throw new Error('Invalid finish time');
}

// Meet date validation
if (meetDate > new Date()) {
  throw new Error('Meet date cannot be in future');
}
```

### Time Conversion Utilities
```typescript
// Convert centiseconds to display format
function formatTime(centiseconds: number): string {
  const totalSeconds = centiseconds / 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
}

// Convert display format to centiseconds
function parseTime(timeStr: string): number {
  const [minutes, seconds] = timeStr.split(':').map(Number);
  return (minutes * 60 * 100) + (seconds * 100);
}

// Quick conversions
const minutesToCentiseconds = (minutes: number) => minutes * 6000;
const secondsToCentiseconds = (seconds: number) => seconds * 100;
const centisecondsToSeconds = (centiseconds: number) => centiseconds / 100;
```

---

## 🛠 TROUBLESHOOTING

### Duplicates Appearing?
1. Check constraint exists:
   ```sql
   SELECT constraint_name FROM information_schema.table_constraints
   WHERE table_name = 'athletes' AND constraint_name = 'athletes_unique_person';
   ```
2. Verify duplicate check in code (see above snippet)
3. Check import scripts

### Slow Queries?
1. Check indexes exist:
   ```sql
   SELECT indexname, tablename FROM pg_indexes 
   WHERE schemaname = 'public' ORDER BY tablename;
   ```
2. Review query in Supabase → Database → Query Performance
3. Add indexes if missing (see IMMEDIATE_ACTION_ITEMS.md #3)

### Times Displaying Wrong?
**Check time conversion:**
```typescript
// ❌ WRONG - treating centiseconds as seconds
const time = formatTime(result.time_seconds);  // Shows 93000:00.00

// ✅ CORRECT - convert centiseconds to seconds first
const time = formatTime(result.time_seconds / 100);  // Shows 15:30.00
```

**Quick test:**
```sql
-- Should show reasonable times (not 93000+)
SELECT time_seconds / 100 as actual_seconds
FROM results
LIMIT 5;
```

### Race Participant Counts Wrong?
1. Check if trigger exists:
   ```sql
   SELECT trigger_name FROM information_schema.triggers
   WHERE event_object_table = 'results'
     AND trigger_name = 'update_race_participants_trigger';
   ```
2. If missing, create trigger (see IMMEDIATE_ACTION_ITEMS.md #1)
3. Fix existing counts:
   ```sql
   UPDATE races r
   SET total_participants = (
     SELECT COUNT(*) FROM results WHERE race_id = r.id
   );
   ```

### Auth Errors?
1. Check environment variables in Vercel
2. Verify using @supabase/ssr (not deprecated helpers)
3. Check redirect URLs in Supabase Dashboard

### Deployment Failed?
1. Check Vercel deployment logs
2. Verify build passes locally: `npm run build`
3. Check environment variables are set
4. Review error messages in Vercel dashboard

---

## 📊 DATABASE STATS (Current)

**Athletes:** 4,477 unique  
**Constraint:** Active on (first_name, last_name, current_school_id, graduation_year)  
**Last Cleanup:** October 2025 (removed 1,328 duplicates)  
**Auth:** @supabase/ssr 0.5.1 (migrated Oct 9)  
**Records Pages:** Individual records deployed (Oct 11)

---

## 🎯 COACHING QUICK ACCESS

### Team Performance This Season (CENTISECONDS!)
```sql
SELECT 
  a.first_name || ' ' || a.last_name as athlete,
  COUNT(r.id) as races,
  AVG(r.time_seconds) / 100 as avg_seconds,     -- Divide by 100!
  MIN(r.time_seconds) / 100 as pr_seconds,      -- Divide by 100!
  MIN(r.place_overall) as best_place
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN races ra ON ra.id = r.race_id
JOIN meets m ON m.id = r.meet_id
WHERE a.current_school_id = '<your-school-id>'
  AND ra.distance = '5K'
  AND ra.gender = 'M'
  AND m.meet_date >= '2024-08-01'  -- Current season
GROUP BY a.id, a.first_name, a.last_name
ORDER BY avg_seconds ASC;
```

### Compare to Opponent (CENTISECONDS!)
```sql
SELECT 
  s.name as school,
  COUNT(DISTINCT a.id) as runners,
  AVG(r.time_seconds) / 100 as avg_seconds  -- Divide by 100!
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN schools s ON s.id = a.current_school_id
JOIN races ra ON ra.id = r.race_id
WHERE a.current_school_id IN ('<your-school>', '<opponent-school>')
  AND ra.distance = '5K'
  AND ra.gender = 'M'
GROUP BY s.name;
```

---

## 📁 IMPORTANT FILE PATHS

### Recently Updated/Created
```
/app/schools/[id]/individual-records/page.tsx    # ✅ NEW (Oct 11)
/app/schools/[id]/team-records/page.tsx          # 🟡 IN PROGRESS
/components/ResultsTable.tsx                      # ✅ Updated (Oct 2025)
/lib/supabase/client.ts                           # ✅ Updated (Oct 9)
/lib/supabase/server.ts                           # ✅ Updated (Oct 9)
```

### Core Files
```
/app/layout.tsx                    # Root layout
/lib/utils/timeConverter.ts       # ⚠️ CRITICAL: Time conversion
/components/ui/                    # shadcn/ui components
/app/api/                          # API routes
/supabase/migrations/              # Database migrations
```

### Old Files to Delete (After New Pages Work)
```
/app/schools/[id]/records/page.tsx           # ❌ OLD - 1484 lines
/app/schools/[id]/records/                   # ❌ OLD directory
```

---

## 📝 ENVIRONMENT VARIABLES

Required in Vercel:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Check: Vercel Dashboard → Settings → Environment Variables

---

## 📚 DOCUMENTATION

**Quick Start:** `PROJECT_CONTEXT.md` (⭐ read first in new conversations)  
**Full Summary:** `MANA_RUNNING_PROJECT_SUMMARY.md`  
**Action Items:** `IMMEDIATE_ACTION_ITEMS.md`  
**This Card:** `QUICK_REFERENCE.md`  
**Performance:** `DATABASE_SCALABILITY.md`  
**Roadmap:** `MANA_RUNNING_ROADMAP.md`  
**GitHub README:** `README.md`

---

## ⏱️ PERFORMANCE TARGETS

- Page Load: < 2 seconds
- Query Time: < 500ms
- Lighthouse Score: > 90
- Uptime: 99.9%

---

## 📋 QUICK CHECKS

### Before Deploying:
- [ ] Times display correctly (divided by 100)
- [ ] No duplicate athlete creation without check
- [ ] Queries use indexes
- [ ] No hardcoded .limit() in queries
- [ ] `npm run build` passes

### After Deploying:
- [ ] Test time display on results pages
- [ ] Verify race participant counts
- [ ] Check for console errors
- [ ] Test athlete/school links work
- [ ] Mobile responsive

---

**Last Updated:** October 12, 2025  
**Keep this card accessible for daily reference**  
**⚠️ Remember: Times are in CENTISECONDS!**
