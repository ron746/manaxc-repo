# Mana XC - Fresh Start Context Document
**Last Updated:** October 22, 2025

## 🎯 Mission Statement
Build a comprehensive cross country training and team management platform that solves the course difficulty standardization problem, starting with Westmont High School XC team.

---

## 💰 Business Model Validation (Passed Hormozi Test)

### The Problem We Solve
**Training and team management for high school XC/Track programs.**

Schools and teams struggle with:
- Training plan design and injury management
- Calendar coordination and event planning
- Team transportation logistics
- Centralized communication hub for athletes and parents
- Performance tracking and ranking across different courses

### Why We'll Win
- **Domain Expertise:** 10+ years coaching XC and Track
- **Killer Feature:** Course difficulty standardization system that converts XC times to track mile equivalents
- **Low CAC:** Word-of-mouth in tight-knit running community
- **Defensible Moat:** Deep understanding of running community + technical implementation

### Unit Economics
- **Athletes:** ~$3/month for training plans
- **Teams:** Up to $50/month for full platform
- **Additional Revenue:** Ad revenue on site
- **Target:** $10K/month within reasonable timeline
- **Low Churn:** Price point aligns with value delivered

### Long-Term Vision
- Build toward professional retirement, dedicate time to coaching
- Children can eventually run operations while hiring for core competencies
- No immediate exit strategy - this is a passion project with revenue potential

---

## 🏗️ Tech Stack & Infrastructure

### Current Setup
- **Domains:** 
  - manaxc.com (Cloudflare)
  - manafitness.com (Cloudflare)
- **GitHub:** New dedicated account for Mana XC
- **Old Project:** Preserved locally and in old GitHub account

### Planned Architecture
```
Frontend: Next.js 14 (web interface for coaches/parents)
Mobile: React Native or PWA (primary interface for athletes)
Backend: Python/Django (API and business logic)
Database: PostgreSQL via Supabase
Scrapers: Puppeteer (Athletic.net) + Python name parser
Design: TBD - Claude Code or Gemini for customer-facing aesthetics
```

---

## 📚 Core Principles (Non-Negotiable)

### 1. Single Course Rating System
- **ONE rating per course:** 1-mile track equivalent time
- From this single rating, derive multiple projections:
  - Projected Mile Time
  - Projected XC Time (any course)
  - Projected Crystal Springs Time
  - Projected Montgomery Hill Time
  - Best Race (actual result)
  - Best Race + Mile Conversion
  - Best Race + [Any Course] Projection

### 2. Data Storage Standards
- **Centiseconds (time_cs):** All times stored as integers (e.g., 16:45.32 = 100532)
- **Colorblind Accessibility:** Light theme only, high contrast
- **Course Versioning:** Handle year-to-year course changes

### 3. Efficient Scraping
- Scheduled jobs (nightly/weekly or on-demand)
- Build watchlists for athletes, schools, courses
- Avoid duplicate work
- Respectful rate limiting

---

## ✅ What Worked (Previous Build)

### Database Design
- Centiseconds storage (time_cs)
- Materialized views for performance queries
- Venue hierarchy (venue → multiple courses)

### Import System
- Athletic.net scraper with Puppeteer
- Import wizard UI approach
- Bulk import CSV processing

### Technical Decisions
- PostgreSQL + TimescaleDB for time-series race data
- Clear separation of concerns (venues vs courses)

---

## ❌ What Didn't Work (Lessons Learned)

### Over-Complexity
- **Dual Rating System:** Too complex - simplified to single 1-mile track rating
- **Course vs Venue Confusion:** Fixed with clear hierarchy

### Data Quality Issues
- **Insufficient Duplicate Detection:** Led to database pollution
- **Manual First/Last Name Splitting:** Caused errors and inconsistency
- **Data Quality Errors:** Required full database resets

### Key Takeaway
**Simplicity wins.** Single source of truth. Prevent errors rather than fix them.

---

## 🔬 Research Findings (October 2025)

### MileSplit API
- **Status:** API exists (api.milesplit.com) but heavily restricted
- **Restrictions:** Cannot scrape, store, redistribute, or sell data
- **Alternative:** They accept standardized Google Sheets submissions
- **Decision:** Use Athletic.net as primary; design to accept MileSplit format for manual imports
- **Reference:** Others have scraped successfully with Selenium + respectful rate limits

### Name Parsing Solution
- **Library:** `python-nameparser` (https://pypi.org/project/nameparser/)
- **Capabilities:** 
  - Handles complex names (de la, van, O'Connor, Jr., III, etc.)
  - Parses "Last, First" format
  - Extracts title, first, middle, last, suffix, nickname
- **Decision:** Use this library instead of custom regex or manual splitting

```python
from nameparser import HumanName

name = HumanName("Dr. Juan Q. Xavier de la Vega III")
# Returns: first='Juan', middle='Q. Xavier', last='de la Vega', suffix='III', title='Dr.'
```

---

## 🎯 Critical Problems to Solve

### 1. Course Rating Certainty
**Problem:** How do we validate course ratings statistically?

**Approach:**
- Collect historical performance data across courses
- Use AI/ML to identify outliers and validate ratings
- Track athlete progression over time
- Account for age, maturation, weather conditions

### 2. Course Versioning
**Problem:** Same venue, different layouts year-to-year

**Solution:**
- Course table with `version` and `year_used` fields
- Ability to mark course as "changed" and create new version
- Historical data preserved with original course version

### 3. Efficient Scraping Strategy
**Problem:** Avoid re-scraping same data, minimize load on source sites

**Solution:**
- **Watchlist System:** Track specific athletes, schools, courses
- **Scheduled Jobs:** Nightly/weekly scans
- **Smart Caching:** Only fetch new meets/results
- **Rate Limiting:** Respectful delays (3-4 seconds between requests)

### 4. Name Parsing (SOLVED)
**Solution:** Use `nameparser` library for all full name → first/last splitting

### 5. Data Quality Prevention
**Problem:** Prevent errors that require full database resets

**Solutions:**
- Strict validation before database insertion
- Duplicate detection at import time
- Atomic transactions (all-or-nothing imports)
- Import preview/confirmation step
- Comprehensive error logging

---

## 📊 Display Format Examples

### Single Rating, Multiple Projections
Starting from **one** 1-mile track equivalent rating (e.g., 5:45.0), we can derive:

| Display Type | Example |
|-------------|---------|
| Projected Mile Time | 5:45.0 |
| Projected 5K (flat) | 18:35 |
| Projected Crystal Springs | 17:48 |
| Projected Montgomery Hill | 18:22 |
| Best Actual Race | 17:52 (Crystal Springs) |
| Best Race + Mile Conversion | 5:42.3 |

---

## 🗂️ Recommended Directory Structure

```
/Users/ron/manaxc/
├── MANA_XC_FRESH_START_CONTEXT.md    ← This file
├── reference/                          ← All old project files
│   ├── old-project/
│   │   ├── DATABASE_SETUP.md
│   │   ├── ATHLETIC_NET_SCRAPER_GUIDE.md
│   │   ├── DATA_ARCHITECTURE_V2.4.md
│   │   └── [all other old docs]
│   └── old-codebase/
│       ├── app/
│       ├── components/
│       └── [all old code]
├── docs/                               ← New project docs
│   ├── architecture/
│   │   ├── database-schema.md
│   │   ├── course-rating-system.md
│   │   └── scraping-strategy.md
│   ├── decisions/
│   │   └── adr-001-single-rating-system.md
│   └── api/
│       └── data-sources.md
├── project/                            ← Clean slate
│   ├── backend/                        ← Django
│   ├── frontend/                       ← Next.js
│   ├── mobile/                         ← React Native / PWA
│   └── scrapers/                       ← Puppeteer + Python
└── research/                           ← Active research docs
    ├── name-parser-implementation.md
    ├── course-versioning-approaches.md
    └── scraping-efficiency.md
```

---

## 📋 Services & Accounts Registry

*To be filled in as we set up services:*

| Service | Purpose | Account | Status |
|---------|---------|---------|--------|
| Cloudflare | Domain hosting | TBD | Active |
| GitHub | Code repository | New Mana XC account | Active |
| Supabase | PostgreSQL database | TBD | Pending |
| Vercel | Frontend hosting | TBD | Pending |
| Google Drive | Document storage | TBD | Optional |
| Athletic.net | Data source | N/A | Scraping |
| MileSplit | Data source | N/A | Manual import |

---

## 🚀 MVP Scope - Westmont High School Launch

### Phase 1 Features
1. **Team Roster Management**
   - Import current Westmont XC athletes
   - Store athlete profiles (name, grade, PRs)
2. **Race Results Import**
   - Load all current season results
   - Course difficulty ratings for local courses
3. **Performance Projections**
   - Display projected mile times
   - Show course-adjusted comparisons
4. **Mobile-First Design**
   - PWA or React Native app for athletes
   - Web interface for coaches

### Success Metrics
- All Westmont athletes loaded
- Season results imported accurately
- Athletes can view their projected times
- Coaches can access team analytics

---

## 🎯 Next Immediate Steps

1. **Set up clean project structure** in `/Users/ron/manaxc/project/`
2. **Initialize database schema** with course rating system
3. **Implement name parser** using `nameparser` library
4. **Build Athletic.net scraper** with proper rate limiting
5. **Design MVP UI/UX** for Westmont launch
6. **Test with sample data** before production import

---

## 💭 Questions for Future Consideration

- Should we build our own timing software integration?
- Partnership opportunities with Athletic.net or MileSplit?
- College recruiting features (exposure platform)?
- AI-powered training plan generation?
- Social features (team challenges, leaderboards)?

---

## 📝 How to Use This Document

**For Claude/Claude Code:**
1. Read this document at the start of each session
2. Reference specific sections as needed
3. Update this document when making architectural decisions

**For Me (Ron):**
1. This is the single source of truth for the fresh start
2. Update as we make progress
3. Add new sections as needed
4. Keep "Next Immediate Steps" current

---

**End of Context Document**
