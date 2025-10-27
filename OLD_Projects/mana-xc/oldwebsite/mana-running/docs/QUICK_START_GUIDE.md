# QUICK START GUIDE - PHASE 0 DEVELOPMENT

**Last Updated:** October 13, 2025  
**Purpose:** Get started building Phase 0 features immediately

---

## 🚀 START HERE

### Step 1: Read This Guide (5 minutes)
You're doing it! Keep going.

### Step 2: Review Key Documents (30 minutes)
**Essential reading before coding:**
1. PROJECT_CONTEXT.md - Project overview and technical details
2. IMMEDIATE_ACTION_ITEMS.md - Detailed task breakdown
3. ADMIN_FEATURES.md OR USER_VIEW_ENHANCEMENTS.md - Feature specs

**Quick reading order:**
- PROJECT_CONTEXT.md first (always)
- Pick one spec file based on what you're building
- Reference others as needed

### Step 3: Choose Your First Feature (2 minutes)
**Recommended order:**
1. **Find Duplicate Results** (2h) - Easiest, immediate value
2. **Safe Delete Functions** (3h) - Foundation for cleanup
3. **Merge Athletes** (4h) - Builds on delete functions
4. **Import Meet Results** (6h) - Most impactful
5. **Course Rating Test** (8h) - Advanced, optional

### Step 4: Start Coding (Now!)
Use the detailed checklists in ADMIN_FEATURES.md

---

## 🎯 PHASE 0 AT A GLANCE

### What You're Building
**5 critical admin features:**
1. Import Meet Results (6h) - Bulk upload system
2. Find Duplicate Results (2h) - Data integrity
3. Safe Delete Functions (3h) - Cleanup tools
4. Merge Athletes (4h) - Combine duplicates
5. Course Rating Test (8h) - AI validation

**Total Time:** ~23 hours of focused work

### Why Phase 0 Matters
- Enables rapid data growth (import 500+ results in minutes)
- Maintains data quality (find and fix issues fast)
- Foundation for AI features (need 10,000+ clean results)
- Better user experience (complete, accurate data)

---

## 📋 FEATURE 1: FIND DUPLICATE RESULTS

**Time:** 2 hours  
**Difficulty:** Easy  
**Files to create:** 3

### Quick Implementation
```bash
# 1. Create admin route
touch app/admin/duplicate-results/page.tsx

# 2. Create API endpoint
touch app/api/admin/duplicate-results/route.ts

# 3. Create SQL function in Supabase:
# (See ADMIN_FEATURES.md Section 1 for SQL)

# 4. Test with sample data
```

### Checklist
- [ ] Create admin route with access control
- [ ] Create SQL function `admin_find_duplicate_results()`
- [ ] Build search UI
- [ ] Add preview modal
- [ ] Implement resolution logic (delete duplicate, update race counts)
- [ ] Refresh materialized view after resolution
- [ ] Test with sample duplicates

### Success Criteria
- Can find all duplicate results in database
- Can view details of each duplicate set
- Can resolve duplicates with one click
- Race participant counts update automatically
- XC times recalculate correctly

---

## 📋 FEATURE 2: SAFE DELETE FUNCTIONS

**Time:** 3 hours  
**Difficulty:** Medium  
**Files to create:** 5

### Quick Implementation
```bash
# 1. Create admin route with tabs
touch app/admin/delete/page.tsx

# 2. Create API endpoints
touch app/api/admin/delete/result/route.ts
touch app/api/admin/delete/race/route.ts
touch app/api/admin/delete/meet/route.ts

# 3. Create admin_log table (see schema below)
# 4. Create 3 SQL functions (see ADMIN_FEATURES.md Section 2)
```

### Checklist
- [ ] Create `admin_log` table
- [ ] Create SQL function `admin_delete_result()`
- [ ] Create SQL function `admin_delete_race()`  
- [ ] Create SQL function `admin_delete_meet()`
- [ ] Build 3-tab UI (Result | Race | Meet)
- [ ] Add search/filter capability
- [ ] Implement confirmation modals
- [ ] Show deletion impact preview
- [ ] Test cascade deletes thoroughly

### Success Criteria
- Can delete individual results safely
- Can delete entire races with cascade
- Can delete entire meets with cascade
- All deletions logged in `admin_log`
- Materialized view refreshes automatically
- No orphaned foreign keys

---

## 📋 FEATURE 3: MERGE ATHLETES

**Time:** 4 hours  
**Difficulty:** Medium-Hard  
**Files to create:** 4

### Quick Implementation
```bash
# 1. Create admin route
touch app/admin/merge-athletes/page.tsx

# 2. Create API endpoints
touch app/api/admin/merge-athletes/route.ts
touch app/api/admin/find-similar/route.ts

# 3. Create SQL functions (see ADMIN_FEATURES.md Section 3)
```

### Checklist
- [ ] Create SQL function `admin_find_similar_athletes()`
- [ ] Create SQL function `admin_merge_athletes()`
- [ ] Build search UI with similarity scoring
- [ ] Add preview modal showing merge impact
- [ ] Implement merge logic (move results, create transfers)
- [ ] Update all foreign keys
- [ ] Delete secondary athlete
- [ ] Test with various duplicate scenarios

### Success Criteria
- Can find similar athletes automatically
- Can manually select athletes to merge
- Preview shows all affected records
- Merge preserves all results
- School transfers created automatically
- No data loss during merge

---

## 📋 FEATURE 4: IMPORT MEET RESULTS

**Time:** 6 hours  
**Difficulty:** Hard  
**Files to create:** 8+

### Quick Implementation
```bash
# 1. Create multi-step wizard
touch app/admin/import-meet/page.tsx

# 2. Create API endpoint
touch app/api/admin/import-meet/route.ts

# 3. Create utility libraries
touch lib/admin/import-parser.ts
touch lib/admin/import-matcher.ts
touch lib/admin/import-validator.ts

# 4. Create SQL functions (see ADMIN_FEATURES.md Section 6)
```

### Checklist
- [ ] Create 6-step wizard UI
- [ ] Implement CSV parser
- [ ] Implement Athletic.net parser
- [ ] Create SQL function `import_match_or_create_athlete()`
- [ ] Create SQL function `import_meet_results()`
- [ ] Add athlete matching logic (name + school + grade)
- [ ] Add data validation
- [ ] Show preview before import
- [ ] Test with sample meet data

### Success Criteria
- Can import 500+ results in < 5 minutes
- Automatically matches existing athletes (95%+ accuracy)
- Creates new athletes when needed
- Validates data before import
- Shows clear error messages
- No duplicate results created

---

## 📋 FEATURE 5: COURSE RATING TEST

**Time:** 8 hours  
**Difficulty:** Hard  
**Files to create:** 4-5

### Quick Implementation
```bash
# 1. Create admin route
touch app/admin/course-ratings/page.tsx
touch app/admin/course-ratings/[id]/page.tsx

# 2. Create API endpoint
touch app/api/admin/analyze-rating/route.ts

# 3. Create SQL functions (see ADMIN_FEATURES.md Section 4)

# 4. Optional: Claude API integration
touch lib/admin/claude-api.ts
```

### Checklist
- [ ] Create SQL function `admin_analyze_course_rating()`
- [ ] Create SQL function `admin_suggest_course_rating()`
- [ ] Build analysis UI with summary table
- [ ] Add detail view per course
- [ ] Implement comparison algorithm
- [ ] Add confidence scoring
- [ ] (Optional) Add Claude API integration
- [ ] Test with multiple courses

### Success Criteria
- Can analyze all courses automatically
- Identifies courses with rating errors (>5% difference)
- Suggests corrected ratings with confidence scores
- Shows athlete-by-athlete comparison
- Flags low-confidence results
- (Optional) AI provides reasoning for suggestions

---

## 🛠️ DEVELOPMENT SETUP

### Environment Check
```bash
# Verify you're in the right directory
pwd  # Should be /path/to/mana-running

# Check Node.js version
node -v  # Should be v18+

# Check npm packages
npm list next  # Should be 14.2.5
```

### Start Development Server
```bash
npm run dev
# Opens localhost:3000
```

### Database Access
- Supabase Dashboard: https://supabase.com/dashboard
- Project: mana-running
- Direct SQL: Use Supabase SQL Editor

---

## 📚 KEY DOCUMENTATION FILES

### Must Read
1. **PROJECT_CONTEXT.md** - Start here every time
2. **IMMEDIATE_ACTION_ITEMS.md** - Your task roadmap
3. **ADMIN_FEATURES.md** - Complete admin feature specs

### Reference As Needed
4. **USER_VIEW_ENHANCEMENTS.md** - User view specs
5. **MANA_RUNNING_PROJECT_SUMMARY.md** - Technical deep dive
6. **QUICK_REFERENCE.md** - Daily commands and queries

### Nice To Have
7. **MANA_RUNNING_ROADMAP.md** - Long-term vision
8. **README.md** - GitHub documentation
9. **schema-changelog.md** - Database change history

---

## 🔍 COMMON QUERIES FOR DEVELOPMENT

### Check for Duplicate Results
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
  a2.first_name || ' ' || a2.last_name as athlete2,
  s2.name as school2
FROM athletes a1
JOIN athletes a2 ON 
  LOWER(a1.first_name) = LOWER(a2.first_name)
  AND LOWER(a1.last_name) = LOWER(a2.last_name)
  AND a1.id < a2.id
JOIN schools s1 ON s1.id = a1.current_school_id
JOIN schools s2 ON s2.id = a2.current_school_id
WHERE ABS(a1.graduation_year - a2.graduation_year) <= 1;
```

### Refresh XC Times
```sql
REFRESH MATERIALIZED VIEW athlete_xc_times;
```

---

## 🎯 DAILY WORKFLOW

### Starting Your Day
1. Review IMMEDIATE_ACTION_ITEMS.md
2. Pick next unchecked item
3. Read relevant section in ADMIN_FEATURES.md
4. Code using checklist
5. Test thoroughly
6. Check off item
7. Push to GitHub
8. Deploy to Vercel (automatic)

### Testing Checklist
- [ ] Feature works as designed
- [ ] Error handling works
- [ ] Confirmation prompts prevent accidents
- [ ] Database updates correctly
- [ ] Materialized view refreshes
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Admin-only (role check works)

---

## ❓ TROUBLESHOOTING

### "Can't access /admin routes"
- Check role in `user_profiles` table
- Should be `role = 'admin'`

### "1000 row limit"
- Use pagination loops
- See PROJECT_CONTEXT.md for examples

### "XC Times not updating"
- Run: `REFRESH MATERIALIZED VIEW athlete_xc_times;`
- Check course ratings are correct

### "Import creates duplicates"
- Check athlete matching logic
- Verify unique constraint on athletes table

---

## 🎉 WHEN PHASE 0 IS COMPLETE

**You'll have:**
- ✅ Rapid import system (500+ results in minutes)
- ✅ Data quality tools (find and fix issues fast)
- ✅ Clean, complete database (10,000+ results)
- ✅ Validated course ratings (AI-tested)
- ✅ Solid foundation for Phase 1

**Next Steps:**
1. Celebrate! 🎉
2. Review Phase 1: User View Enhancements
3. Start with Top Performances page (2h)

---

## 💡 PRO TIPS

1. **Read the specs first** - Don't skip ADMIN_FEATURES.md
2. **Use checklists** - Each feature has a detailed checklist
3. **Test with real data** - Import actual meet results
4. **Start simple** - Find Duplicate Results is easiest
5. **Ask for help** - Use Claude with PROJECT_CONTEXT.md loaded

---

**Ready to start?** Begin with Feature #1: Find Duplicate Results

**Questions?** Check PROJECT_CONTEXT.md or ADMIN_FEATURES.md

**Stuck?** Search your Google Drive for "Mana Running Documentation"

🚀 **Let's build Phase 0!**
