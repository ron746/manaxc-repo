# MANA RUNNING - PRODUCT ROADMAP

**Last Updated:** October 12, 2025

---

## ✅ COMPLETED FEATURES (October 2025)

### Database & Architecture
- **Athlete Deduplication** (Oct 2025)
  - Removed 1,328 duplicate records (5,805 → 4,477 athletes)
  - Added unique constraint to prevent future duplicates
  - Updated all foreign key references
  - Zero orphaned records
  
- **Supabase Auth Migration** (Oct 9, 2025)
  - Migrated from deprecated @supabase/auth-helpers-nextjs to @supabase/ssr
  - Updated all client/server configurations
  - Eliminated cookie parsing errors
  
- **Scalable Database Architecture** (Oct 10-11, 2025)
  - Implemented SQL functions for aggregation
  - Eliminated hardcoded query limits
  - Database-level filtering instead of JavaScript
  - System supports 1M+ records with same performance

### School Records Pages (Oct 10-11, 2025)
- **Individual Records Page** ✅ Complete
  - Path: `/schools/[id]/individual-records`
  - SQL functions: `get_school_xc_records`, `get_school_top10_xc`, `get_school_course_records`
  - 58x performance improvement over old approach
  - Overall XC records (by grade)
  - Top 10 performances
  - Course-specific records (by grade)

### UI/UX Improvements
- Clickable athlete names across all pages
- Clickable school names across all pages
- ResultsTable component with client-side sorting
- Podium medals (🥇🥈🥉) on top 3 finishers
- Sort indicators (↑/↓) on sortable columns

### Core Features (Pre-October 2025)
- Individual course records by grade (9-12 + Overall)
- Course difficulty ratings (mile_difficulty, xc_time_rating)
- Meet listing with pagination
- Athlete profile pages
- School profile pages
- Admin panel with delete functionality

---

## 🔴 CRITICAL PRIORITIES (Do Now)

### 1. Race Participant Counts Fix
**Status:** Not started  
**Time:** 45 minutes  
**Priority:** CRITICAL

- Update existing data with correct counts
- Create trigger for auto-maintenance
- Add application-level validation

See IMMEDIATE_ACTION_ITEMS.md #1 for detailed steps.

---

### 2. Duplicate Prevention in Code
**Status:** Not started  
**Time:** 30 minutes  
**Priority:** CRITICAL

Add duplicate check before ALL athlete creation:
- Meet import functions
- Admin athlete creation forms
- CSV upload processors
- API endpoints

---

### 3. Database Indexes
**Status:** Not started  
**Time:** 5 minutes  
**Priority:** HIGH

Add indexes for massive performance boost:
- Athletes (school_id, graduation_year)
- Results (athlete_id, race_id, meet_id)
- Meets (meet_date)
- Races (meet_id, course_id)

---

## 🟡 CURRENT ISSUES / IN PROGRESS

### Team Records Page
**Status:** In progress (blocked)  
**Issue:** SQL function has column naming conflicts

**Needs:**
1. Debug `get_school_top_team_performances` function
2. Add `res_` prefix to all result columns
3. Create page at `/schools/[id]/team-records`
4. Test with actual team data

**Features When Complete:**
- Top 10 team performances (5-person times)
- By course and overall
- Team scoring analysis

---

### Course Page - Top 5 Team Performances
**Status:** In progress (blocked)  
**Code:** Implemented but not displaying data

**Known Problems:**
- May not be finding teams with 5+ runners at same race
- Gender filtering might not match data correctly
- Need diagnostic logging to identify root cause

**Location:** `/app/courses/[id]/page.tsx` (lines 702-815)

---

## 🟢 MEDIUM PRIORITY (Next Month)

### Data Quality & Validation
- [ ] Add data validation on all forms
- [ ] Implement input sanitization
- [ ] Add error handling throughout app

### Performance Optimization
- [ ] Complete database index implementation
- [ ] Review all queries for scalability
- [ ] Implement pagination where needed
- [ ] Set up query performance monitoring

### Code Cleanup
- [ ] Delete old school records page after new pages work
- [ ] Remove any remaining deprecated code
- [ ] Standardize error handling
- [ ] Add comprehensive code comments

---

## 📅 FEATURE BACKLOG

### Team/Coach Features
- [ ] Team selection optimization tool
- [ ] Championship projection calculator
- [ ] Season performance tracking dashboard
- [ ] Varsity lineup optimizer based on recent performance
- [ ] Team comparison tool

### Course Features
- [ ] Course comparison tool
- [ ] Historical trends for course difficulty ratings
- [ ] Course maps integration
- [ ] Weather conditions at races

### Analytics Features
- [ ] Advanced performance metrics
- [ ] Predictive race time modeling
- [ ] Cross-course time conversions
- [ ] Improvement rate tracking

### Data Management
- [ ] Automated meet result scraping
- [ ] Bulk import validation improvements
- [ ] Historical data backfill
- [ ] Data export functionality

---

## 🐛 KNOWN BUGS

### ⚠️ Critical
1. **Race participant counts incorrect** - Data stale, no auto-update trigger
2. **Team performance section not displaying** - Code exists but returns no data

### ⚠️ Minor
1. **Multiple GoTrueClient instances warning** - Non-blocking, documented in tech debt

---

## 🔧 TECHNICAL DEBT

### High Priority
1. **Application-level duplicate prevention** - Database constraint exists, but code doesn't check first
2. **Query scalability audit** - Review all queries for `.limit()` usage
3. **Error handling standardization** - Inconsistent error handling across codebase
4. **Type safety improvements** - Reduce use of `any` types

### Medium Priority
1. **Code organization** - Extract reusable components from large page files
2. **Test coverage** - No automated tests currently
3. **Loading states** - Better loading indicators throughout app
4. **Supabase client consolidation** - Multiple client creation patterns exist

### Low Priority
1. **Documentation** - Add inline code comments
2. **Component library** - Build reusable component library
3. **Accessibility** - Full WCAG 2.1 AA compliance audit

---

## 🎯 FUTURE VISION (6-12 Months)

### Mobile App
- React Native mobile application
- Athlete-focused features
- Push notifications for PR alerts
- Offline access to personal stats

### Advanced Analytics
- Machine learning performance predictions
- Injury risk assessment based on training load
- Optimal training load recommendations
- Weather impact analysis

### Integrations
- Integration with timing systems (direct result import)
- Calendar integrations for meet scheduling
- Email notifications for coaches
- Social media sharing

### Community Features
- Athlete profiles with social features
- Coach collaboration tools
- Training log sharing
- Message boards for teams

---

## 📊 SUCCESS METRICS

### Current (October 2025)
- **Athletes:** 4,477 unique
- **Database Health:** 0 duplicates, 0 orphaned records
- **Performance:** Individual records page 58x faster
- **Code Quality:** Auth migration complete, deprecated code removed

### Target (6 Months)
- **Athletes:** 10,000+
- **Schools:** 100+
- **Page Load:** < 2 seconds
- **Uptime:** 99.9%
- **Active Coaches:** 50+

### Target (12 Months)
- **Athletes:** 50,000+
- **Schools:** 500+
- **Mobile Users:** 1,000+
- **API Integrations:** 5+

---

## 🗓️ QUARTERLY ROADMAP

### Q4 2025 (Oct-Dec)
**Focus:** Data Quality & Performance
- ✅ Database cleanup (COMPLETE)
- ✅ Auth migration (COMPLETE)
- ✅ Individual records page (COMPLETE)
- 🔴 Fix race participant counts (PENDING)
- 🔴 Add database indexes (PENDING)
- 🟡 Complete team records page (IN PROGRESS)

### Q1 2026 (Jan-Mar)
**Focus:** Coach Tools
- Team selection optimizer
- Championship predictor
- Advanced analytics dashboard
- Course comparison tool

### Q2 2026 (Apr-Jun)
**Focus:** Athlete Features
- Athlete dashboard
- Personal PR tracking
- Season progression charts
- Goal setting tools

### Q3 2026 (Jul-Sep)
**Focus:** Mobile & Scale
- Mobile app beta
- Performance optimization at scale
- API for external integrations
- Historical data import

---

## 📋 NOTES

### Team Performance Feature Status
Despite multiple attempts:
- Grouping logic implemented (race-based) ✓
- Gender filtering in place ✓
- UI components properly structured ✓
- Build succeeds with no errors ✓

**Likely causes:**
- Data availability: May not have races with 5+ runners from same school
- Data structure mismatch: Gender field format or race relationships
- Silent failure: No error logging to diagnose issue

**Recommendation:** Add comprehensive logging, then revisit after confirming test data exists.

---

### Development Notes
- **Time Storage:** Database stores times in CENTISECONDS (field misleadingly named `time_seconds`)
- **Environment:** MacBook Air M2, macOS
- **Deployment:** Auto-deploy to Vercel on push to `main`
- **Database:** Supabase PostgreSQL 15.1

---

**Last Review:** October 12, 2025  
**Next Review:** October 19, 2025  
**Status:** Active Development
