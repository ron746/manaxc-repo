# MVP Specifications - Mana XC

**Target Launch:** December 22, 2025 (60 days from October 22, 2025)
**Launch Team:** Westmont High School Cross Country

---

## MVP Philosophy

**"Information Only, Maximum Value"**

No training plans. No payment processing. No complicated features.

Just: **The best damn way to see how your XC team is performing.**

---

## Core Features (Must Have)

### 1. Course Standardization System ⭐ FLAGSHIP FEATURE

**What It Does:**
Converts any XC race result on any course to a standardized track mile equivalent.

**Why It Matters:**
- Athletes can compare performances across different courses
- Coaches can rank athletes fairly
- College recruiters can evaluate talent across the country
- Predicts performance on new courses

**MVP Requirements:**
- [ ] Database of 50+ California high school XC courses with difficulty ratings
- [ ] Algorithm that converts 5K XC time → equivalent track mile time
- [ ] Display standardized time alongside actual race time on all athlete profiles
- [ ] Course difficulty visualized (1.0-2.0 scale, typical XC: 1.10-1.25, where 1.0 = track mile baseline)

**Example:**
```
Athlete: Sarah Johnson
Race: Crystal Springs 5K (Difficulty: 1.177 - Rolling hills)
Actual Time: 19:30
Standardized Mile: 5:45
```

**Algorithm Inputs:**
1. Actual race time
2. Course distance (3 miles, 5K, etc.)
3. Course difficulty rating (elevation gain, terrain, altitude)
4. Weather conditions (optional for MVP)

**Algorithm Output:**
- Standardized track mile equivalent
- Confidence interval (±5 seconds)

**Data Sources for Course Ratings:**
- Lynbrook Sports historical data
- Athletic.net course descriptions
- Manual coach input (starting with Ron's knowledge)

---

### 2. Westmont Historical Results (2022-2025)

**What It Does:**
Complete database of every Westmont XC athlete's meet results for the past 4 years.

**Why It Matters:**
- Athletes see their career progression
- Coaches identify most improved athletes
- Historical records provide context

**MVP Requirements:**
- [ ] Import all Westmont meets from Athletic.net (2022-2025)
- [ ] ~40-60 meets × 15-20 athletes per meet = ~1,000 results
- [ ] Store: Meet name, date, course, distance, athlete name, time, place

**Data Fields:**
```
Meet:
- Meet name (e.g., "WCAL Championships 2024")
- Date
- Location
- Course (linked to course database)
- Weather conditions (optional)

Result:
- Athlete ID (linked to athlete profile)
- Meet ID
- Time (MM:SS)
- Standardized time
- Place (overall)
- Team place
- Notes (e.g., "PR", "injured", "pacing teammate")
```

---

### 3. Coach Admin Interface (Web)

**Who Uses It:** Ron (and future coaches)

**What It Does:**
Simple dashboard to view team performance, manage roster, see rankings.

**MVP Requirements:**
- [ ] Login with GitHub OAuth (simple, secure, no password management)
- [ ] Dashboard homepage showing:
  - Upcoming meets (manual entry for MVP)
  - Team stats (average time, most improved, recent PRs)
  - Quick links to rankings, roster, records
- [ ] Roster management page:
  - View all current athletes
  - Edit athlete info (name, grade, PRs)
  - Add/remove athletes
- [ ] Team rankings page (see #6 below)
- [ ] Meet results entry form (manual for MVP, auto-scrape later)

**Design Principles:**
- **Brutally simple:** No fancy animations, just tables and charts
- **Fast:** Every page loads in <1 second
- **Mobile-friendly:** Works on iPad in the field

**Tech Stack:**
- Next.js 14 (React)
- Tailwind CSS (utility-first styling)
- Shadcn UI (pre-built accessible components)

---

### 4. Athlete Profile Page (Web + Mobile)

**Who Uses It:** Athletes, parents, college recruiters (public-facing)

**What It Does:**
Every athlete gets a public profile showing their stats, PRs, race history.

**MVP Requirements:**
- [ ] URL structure: `manaxc.com/athlete/[athlete-id]` or `/athlete/[name-slug]`
- [ ] Profile header:
  - Name
  - Grad year
  - Current season PRs (5K, 3 mile)
  - Standardized mile time
  - Photo (optional)
- [ ] Career stats:
  - Total races
  - Average time
  - Improvement percentage (vs. first race)
  - Most improved rank on team
- [ ] Race history table:
  - Date, meet name, course, time, standardized time, place
  - Sortable by date, time, course
- [ ] Personal records section:
  - Fastest 5K (actual + standardized)
  - Fastest 3 mile (actual + standardized)
  - Most difficult course conquered
- [ ] Career progression chart:
  - X-axis: Date (race #1 to present)
  - Y-axis: Standardized mile time
  - Visualize improvement over time

**Example:**
```
===========================================
           SARAH JOHNSON
      Westmont HS | Class of 2026
===========================================

Season PRs:
5K: 19:30 (Crystal Springs) → 5:45 mile
3M: 18:15 (Toro Park) → 5:42 mile

Career Stats:
📊 28 total races
📈 18% improvement since freshman year
🏆 #3 most improved on team

Recent Races:
Date         Meet                Course              Time    Std Mile
10/15/2025   WCAL Championships  Crystal Springs 5K  19:30   5:45
10/08/2025   Lynbrook Invite     Baylands 5K         20:05   5:52
09/28/2025   Clovis Invite       Woodward Park 5K    19:55   5:50
...
```

---

### 5. Team Roster Page

**What It Does:**
Complete list of current Westmont XC team with key stats.

**MVP Requirements:**
- [ ] Table view of all athletes:
  - Name (clickable to profile)
  - Grad year
  - Season PR (5K)
  - Standardized mile time
  - Most improved % (vs. season start)
  - Sortable by any column
- [ ] Filterable by grad year (2025, 2026, 2027, 2028)
- [ ] Search bar (find athlete by name)

---

### 6. Team Rankings Page ⭐ CRITICAL FOR COACHES

**What It Does:**
Shows who's fastest, most improved, on varsity, etc.

**MVP Requirements:**
- [ ] **Varsity Ranking:** Top 7 athletes by standardized mile time
  - Shows who would race in next meet
  - Ties broken by most recent race
- [ ] **Most Improved Ranking:** 
  - % improvement vs. first race of season
  - Shows athletes working hardest
- [ ] **PR Wall:** Recent personal records (last 30 days)
- [ ] **League Comparison (Optional for MVP):**
  - If we have data from other WCAL teams
  - Shows Westmont's top 7 vs. other schools' top 7

---

### 7. Records Pages

**What It Does:**
Immortalizes the fastest athletes in Westmont history.

**MVP Requirements:**
- [ ] **Season Records:** Fastest times this season
  - Top 10 by standardized time
  - Broken down by: Varsity, JV, Freshmen
- [ ] **Course Records:** Fastest Westmont time on each course
  - E.g., "Crystal Springs 5K: Sarah Johnson, 19:30 (2024)"
- [ ] **School All-Time Records:**
  - Top 25 fastest athletes in school history
  - Based on standardized times (fair comparison across years)
  - Separate boys/girls or combined (coach's preference)

---

### 8. Mobile App (React Native)

**Who Uses It:** Athletes and parents (primary use case: checking stats on the go)

**What It Does:**
Simplified version of the web app focused on athlete profiles.

**MVP Requirements:**
- [ ] Home screen: List of Westmont athletes (search + filter)
- [ ] Athlete profile view (same data as web)
- [ ] Personal dashboard (if logged in):
  - My stats
  - My race history
  - Team rankings with my position highlighted
- [ ] Push notifications (optional for MVP):
  - New race results posted
  - Someone beat your PR
  - New personal best

**Design Principles:**
- **Mobile-first:** Thumb-friendly, large buttons
- **Offline-friendly:** Cache data, works with spotty cell signal at meets
- **Fast:** No loading spinners, instant navigation

**Tech Stack:**
- React Native + Expo
- Shared components with Next.js web app
- Supabase real-time subscriptions for live updates

---

### 9. Race Time Predictor (Bonus if Time Allows)

**What It Does:**
Predict how fast an athlete will run on a new course based on past performances.

**MVP Requirements:**
- [ ] Input: Athlete ID + target course
- [ ] Output: Predicted time ± confidence interval
- [ ] Algorithm:
  1. Get athlete's recent standardized times (last 5 races)
  2. Average to get current fitness level
  3. Apply target course difficulty adjustment
  4. Output predicted time

**Example:**
```
Athlete: Sarah Johnson
Target Race: Woodward Park 5K (Difficulty: 1.18)
Recent Standardized Mile: 5:45 (average of last 5 races)

Predicted Time: 19:45 ± 10 seconds
Confidence: 85% (based on 5 data points)
```

---

## Out of Scope (Not in MVP)

**Do NOT build these yet** (tempting but will slow us down):

- ❌ Training plan generation
- ❌ Workout logging
- ❌ Calendar/event management
- ❌ Team communication (chat, messaging)
- ❌ Transportation coordination
- ❌ Injury tracking
- ❌ Payment processing / subscriptions
- ❌ Multi-team support (only Westmont for now)
- ❌ Social features (commenting, likes, following)
- ❌ Advanced analytics (VO2 max estimates, race simulation)
- ❌ Coach-to-athlete messaging
- ❌ Automatic Athletic.net scraping (manual import for MVP)

---

## Success Criteria (How We Know MVP is Done)

### Functional Requirements:
- [ ] 100% of Westmont 2022-2025 results imported
- [ ] All 30+ current athletes have complete profiles
- [ ] Course standardization algorithm produces reasonable results
- [ ] Coach can log in and view team rankings
- [ ] Athletes can view their profiles on mobile app
- [ ] Website loads in <2 seconds on 4G connection

### User Acceptance:
- [ ] Ron (coach) uses the admin dashboard weekly
- [ ] At least 10 athletes download and use the mobile app
- [ ] At least 3 parents visit athlete profile pages
- [ ] Zero major bugs reported in first week

### Business Validation:
- [ ] At least 5 Westmont athletes say "this is actually useful"
- [ ] At least 1 other coach asks "can my team use this?"
- [ ] Course standardization produces <10% error vs. known performances

---

## MVP Data Requirements

### Minimum Viable Data:

**Athletes:** 30-40 current Westmont athletes (2024-2025 roster)

**Meets:** 40-60 historical meets (2022-2025)

**Courses:** 50+ California HS XC courses with difficulty ratings

**Results:** ~1,000 individual race results

**Where to Get It:**
1. Athletic.net (primary source - scrape with Python)
2. Ron's existing Google Sheets (manual export/import)
3. Manual entry for missing data

---

## Technical Architecture (High Level)

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND LAYER                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Next.js Web App (manaxc.com)                           │
│  ├── Public Pages: Athlete profiles, team rankings      │
│  └── Coach Admin: Dashboard, roster management          │
│                                                          │
│  React Native Mobile App                                │
│  ├── Athlete profiles                                   │
│  └── Personal dashboard                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↓ ↑
                    REST API / Real-time
                          ↓ ↑
┌─────────────────────────────────────────────────────────┐
│                   BACKEND LAYER                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Supabase                                               │
│  ├── PostgreSQL Database                                │
│  ├── Row Level Security (RLS)                           │
│  ├── Authentication (GitHub OAuth for coaches)          │
│  ├── Storage (athlete photos, meet attachments)         │
│  └── Edge Functions (course standardization algorithm)  │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
                   Data Pipeline
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Python Scrapers (GitHub Actions cron)                  │
│  ├── Athletic.net scraper                               │
│  └── Data validation & deduplication                    │
│                                                          │
│  Manual Import Tools                                    │
│  └── CSV upload for historical data                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Development Phases (60-Day Timeline)

### Phase 1: Foundation (Days 1-10)
- Set up Supabase project
- Design database schema
- Create Next.js boilerplate
- Build Athletic.net scraper
- Import Westmont historical data

### Phase 2: Core Features (Days 11-30)
- Build course standardization algorithm
- Create athlete profile pages
- Build team rankings page
- Create coach admin dashboard
- Implement authentication

### Phase 3: Mobile + Polish (Days 31-50)
- Build React Native mobile app
- Add race time predictor
- Create records pages
- Design improvements
- Bug fixes

### Phase 4: Launch Prep (Days 51-60)
- Deploy to manaxc.com
- Load testing
- Coach training (Ron walkthrough)
- Athlete onboarding (share links with team)
- Monitor and fix critical bugs

---

## Post-MVP Roadmap (Not Building Yet, But Keep in Mind)

**Phase 2 Features (Months 2-6):**
- Multi-team support (WCAL league, then all of California)
- Training plan generator (AI-powered)
- Workout logging
- Payment processing ($3/month athletes, $50/month teams)
- Advanced analytics (VO2 max, race simulation)

**Phase 3 Features (Months 7-12):**
- Track & field expansion
- Social features (following, commenting)
- College recruiting tools
- Mobile app push notifications
- Calendar/event coordination

---

## Open Questions (Need to Decide)

1. **Course Difficulty Algorithm:** 
   - Use simple heuristic (elevation gain + distance) or ML model?
   - How to handle weather/conditions?
   - Decision: Start simple, refine with data

2. **Data Privacy:**
   - Are athlete profiles public or require login?
   - Do parents need to consent for minors?
   - Decision: Public profiles (like Athletic.net), add privacy settings post-MVP

3. **Mobile App Platform:**
   - iOS only, Android only, or both?
   - Decision: Both via React Native/Expo

4. **Manual Data Entry:**
   - How does coach add new race results?
   - CSV upload? Web form? Auto-scrape Athletic.net?
   - Decision: Web form for MVP, auto-scrape in Phase 2

---

## Resources & References

**Course Standardization Research:**
- [Lynbrook Sports Course Rankings](http://lynbrooksports.com/)
- Athletic.net course database
- Ron's 10+ years of coaching data

**Competitor Analysis:**
- Athletic.net: Feature comparison
- MileSplit: Pricing model review
- TFRRS: College recruiting insights

**Technical Documentation:**
- Supabase Docs: supabase.com/docs
- Next.js Docs: nextjs.org/docs
- React Native: reactnative.dev

---

**Last Updated:** October 22, 2025
**Owner:** Ron + Claude
**Status:** ✅ Specs complete, ready to build
