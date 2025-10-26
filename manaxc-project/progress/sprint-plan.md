# 30-Day Sprint Plan - Mana XC MVP

**Sprint Start:** October 22, 2025  
**Sprint End:** November 21, 2025  
**Goal:** Foundation + Core Features ready for Phase 2 build

---

## Sprint Philosophy

**"Ship Fast, Learn Faster"**

- Daily progress beats perfect planning
- Build → Test → Iterate
- Every Friday: Demo what we built
- Cut scope ruthlessly if falling behind

---

## Week 1: Foundation & Data (Oct 22 - Oct 28)

### Day 1 (Oct 22) - ✅ COMPLETE
- [x] Create project structure
- [x] Write master README
- [x] Define MVP specifications
- [x] Create service registry
- [x] Align on vision with Ron

**Deliverable:** Project plan approved ✅

---

### Day 2 (Oct 23) - Setup Supabase & Database
**Owner:** Claude Code + Ron

**Tasks:**
- [ ] Create Supabase project (ron@manaxc.com login)
- [ ] Design database schema (see below)
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create database migration files
- [ ] Test connection from local environment

**Database Schema v1:**
```sql
-- Core tables for MVP

CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  grad_year INTEGER NOT NULL,
  gender TEXT CHECK (gender IN ('M', 'F')),
  school_id UUID REFERENCES schools(id),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  distance_meters INTEGER NOT NULL, -- 5000 for 5K, 4828 for 3 mile
  difficulty_rating DECIMAL(3,1) CHECK (difficulty_rating >= 1 AND difficulty_rating <= 10),
  elevation_gain_meters INTEGER,
  surface_type TEXT, -- 'grass', 'dirt', 'mixed'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  meet_date DATE NOT NULL,
  course_id UUID REFERENCES courses(id),
  weather_conditions TEXT,
  temperature_f INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  meet_id UUID REFERENCES meets(id) ON DELETE CASCADE,
  time_seconds INTEGER NOT NULL, -- store as seconds for easy math
  place_overall INTEGER,
  place_team INTEGER,
  standardized_mile_seconds INTEGER, -- calculated by algorithm
  is_pr BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(athlete_id, meet_id) -- one result per athlete per meet
);

CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  city TEXT,
  state TEXT DEFAULT 'CA',
  league TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE personal_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
  distance_meters INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  standardized_mile_seconds INTEGER,
  result_id UUID REFERENCES results(id),
  set_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_results_athlete ON results(athlete_id);
CREATE INDEX idx_results_meet ON results(meet_id);
CREATE INDEX idx_athletes_school ON athletes(school_id);
CREATE INDEX idx_meets_date ON meets(meet_date DESC);
```

**Deliverable:** Working Supabase database with schema deployed

---

### Day 3 (Oct 24) - Build Athletic.net Scraper
**Owner:** Claude Code

**Tasks:**
- [ ] Research Athletic.net structure (inspect HTML)
- [ ] Write Python scraper for Westmont team page
- [ ] Test scraping 1 meet's results
- [ ] Implement rate limiting (1 request per 2 seconds)
- [ ] Handle errors gracefully
- [ ] Store results in CSV for review

**Tech Stack:**
- Python 3.11+
- Libraries: `requests`, `beautifulsoup4`, `pandas`

**Deliverable:** Python script that scrapes 1 Westmont meet successfully

---

### Day 4 (Oct 25) - Data Import Pipeline
**Owner:** Claude Code + Ron

**Tasks:**
- [ ] Scrape all Westmont meets (2022-2025) from Athletic.net
- [ ] Clean and validate data (check for duplicates)
- [ ] Ron reviews CSV export (sanity check)
- [ ] Write SQL import script
- [ ] Load data into Supabase
- [ ] Verify: All athletes, meets, results loaded correctly

**Quality Checks:**
- Total meets: Should be 40-60
- Total results: Should be ~1,000
- All times look reasonable (no 5-minute 5Ks)
- Athlete names match known roster

**Deliverable:** Supabase database populated with Westmont historical data

---

### Day 5 (Oct 26) - Course Difficulty Algorithm v1
**Owner:** Claude + Ron

**Tasks:**
- [ ] Document 20+ known courses with Ron's expert ratings
- [ ] Create simple heuristic formula:
  ```
  Difficulty = 1 + (elevation_gain_meters / 100) * 0.5 + terrain_modifier
  where:
    terrain_modifier = 0 (track), 0.5 (grass), 1.0 (trails), 1.5 (hills)
  Max difficulty capped at 10
  ```
- [ ] Write Supabase Edge Function for standardization:
  ```typescript
  function standardizeTime(actualTime: number, courseId: string): number {
    // 1. Get course difficulty from database
    // 2. Apply adjustment factor
    // 3. Return standardized mile time
  }
  ```
- [ ] Test on known performances (Ron validates)
- [ ] Update all results with standardized times

**Test Cases:**
```
Course: Crystal Springs 5K (Difficulty: 8)
Athlete: 19:30 → Should output ~5:45 mile

Course: Baylands 5K (Difficulty: 3)
Athlete: 19:30 → Should output ~5:25 mile
```

**Deliverable:** Working algorithm + all results have standardized times

---

### Day 6 (Oct 27) - Next.js Boilerplate + Design System
**Owner:** Claude Code

**Tasks:**
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Install dependencies:
  - Tailwind CSS
  - Shadcn UI components
  - Supabase JS client
- [ ] Set up project structure:
  ```
  /app
    /page.tsx (homepage)
    /athlete/[id]/page.tsx (athlete profile)
    /team/roster/page.tsx (roster)
    /admin/page.tsx (coach dashboard)
  /components
    /ui (Shadcn components)
    /athlete-card.tsx
    /results-table.tsx
  /lib
    /supabase.ts (client setup)
    /utils.ts (time formatting, etc.)
  ```
- [ ] Create design system (colors, typography, spacing)
- [ ] Build reusable components:
  - Athlete card
  - Results table
  - Time display (with standardized time)

**Design Principles:**
- Clean, modern, athletic vibe (think Nike, Strava)
- Primary color: Deep blue (#0F172A)
- Accent: Bright orange (#F97316)
- Fonts: Inter (headings), system default (body)

**Deliverable:** Next.js app with basic routing + UI components

---

### Day 7 (Oct 28) - Week 1 Review & Catch-Up
**Owner:** Ron + Claude

**Tasks:**
- [ ] Review progress (what's done, what's blocked)
- [ ] Test Supabase connection from Next.js
- [ ] Deploy Next.js to Vercel (staging environment)
- [ ] Demo: Show Ron the data in Supabase and basic UI
- [ ] Adjust plan for Week 2 if needed

**Demo Checklist:**
- ✅ Database has Westmont data
- ✅ Algorithm produces reasonable standardized times
- ✅ Next.js app loads at staging.manaxc.com
- ✅ Can view at least 1 athlete profile (even if ugly)

**Deliverable:** End-of-week demo + Week 2 plan locked

---

## Week 2: Core Features (Oct 29 - Nov 4)

### Day 8 (Oct 29) - Athlete Profile Page (Backend)
**Owner:** Claude Code

**Tasks:**
- [ ] Create Supabase API functions:
  ```typescript
  getAthleteProfile(athleteId: string)
  getAthleteResults(athleteId: string)
  getAthletePRs(athleteId: string)
  getAthleteCareerStats(athleteId: string)
  ```
- [ ] Write SQL queries optimized for performance
- [ ] Test API endpoints with Postman or Thunder Client
- [ ] Handle edge cases (athlete with no results, etc.)

**Deliverable:** Working API for athlete data

---

### Day 9 (Oct 30) - Athlete Profile Page (Frontend)
**Owner:** Claude Code

**Tasks:**
- [ ] Build athlete profile UI (see MVP specs)
- [ ] Display:
  - Name, grad year, photo
  - Season PRs
  - Career stats
  - Race history table
  - Career progression chart (use Chart.js or Recharts)
- [ ] Make it responsive (mobile + desktop)
- [ ] Add loading states and error handling

**Design Goal:** Simple, scannable, impressive

**Deliverable:** Functional athlete profile page at `/athlete/[id]`

---

### Day 10 (Oct 31) - Team Roster Page
**Owner:** Claude Code

**Tasks:**
- [ ] Build roster page UI
- [ ] Display table of all athletes (sortable, filterable)
- [ ] Add search bar
- [ ] Link each athlete to their profile
- [ ] Show key stats (grad year, season PR, standardized time)

**Deliverable:** Roster page at `/team/roster`

---

### Day 11 (Nov 1) - Team Rankings Page (Backend)
**Owner:** Claude Code

**Tasks:**
- [ ] Create API functions:
  ```typescript
  getVarsityRankings() // Top 7 by standardized time
  getMostImprovedRankings() // % improvement
  getRecentPRs() // Last 30 days
  ```
- [ ] Write SQL for most improved calculation:
  ```sql
  -- Compare latest result to first result of season
  WITH first_results AS (
    SELECT athlete_id, MIN(time_seconds) as first_time
    FROM results
    WHERE meet_date >= '2025-08-01'
    GROUP BY athlete_id
  ),
  latest_results AS (
    SELECT athlete_id, MIN(time_seconds) as latest_time
    FROM results
    WHERE meet_date >= '2025-08-01'
    GROUP BY athlete_id
  )
  SELECT 
    a.name,
    ((f.first_time - l.latest_time)::float / f.first_time * 100) as improvement_pct
  FROM athletes a
  JOIN first_results f ON a.id = f.athlete_id
  JOIN latest_results l ON a.id = l.athlete_id
  ORDER BY improvement_pct DESC;
  ```

**Deliverable:** API functions for all ranking types

---

### Day 12 (Nov 2) - Team Rankings Page (Frontend)
**Owner:** Claude Code

**Tasks:**
- [ ] Build rankings UI with tabs:
  - Varsity (top 7)
  - Most Improved
  - Recent PRs
- [ ] Add visual indicators (podium for top 3, etc.)
- [ ] Make it look motivating (athletes want to see their name here)

**Deliverable:** Rankings page at `/team/rankings`

---

### Day 13 (Nov 3) - Coach Admin Dashboard (Part 1)
**Owner:** Claude Code

**Tasks:**
- [ ] Set up GitHub OAuth authentication (Supabase Auth)
- [ ] Create `/admin` route (protected, coach-only)
- [ ] Build dashboard homepage:
  - Team overview stats
  - Recent activity
  - Quick links to roster, rankings, records
- [ ] Add simple navigation sidebar

**Deliverable:** Basic admin dashboard with auth

---

### Day 14 (Nov 4) - Week 2 Review & Catch-Up
**Owner:** Ron + Claude

**Tasks:**
- [ ] Review all pages built so far
- [ ] Test on mobile (Ron's phone)
- [ ] Fix critical bugs
- [ ] Deploy updates to staging
- [ ] Demo to Westmont athletes (soft launch)

**Demo Checklist:**
- ✅ At least 3 athlete profiles look good
- ✅ Roster page works
- ✅ Rankings page shows correct data
- ✅ Coach can log in to admin

**Deliverable:** Soft launch with 3-5 Westmont athletes testing

---

## Week 3: Records & Race Predictor (Nov 5 - Nov 11)

### Day 15 (Nov 5) - Records Pages (Backend)
**Owner:** Claude Code

**Tasks:**
- [ ] Create API functions:
  ```typescript
  getSeasonRecords(season: string, gender: string)
  getCourseRecords()
  getAllTimeRecords()
  ```
- [ ] Optimize SQL queries for performance

**Deliverable:** API functions for records

---

### Day 16 (Nov 6) - Records Pages (Frontend)
**Owner:** Claude Code

**Tasks:**
- [ ] Build 3 records pages:
  - `/records/season` (current season top 10)
  - `/records/courses` (fastest time on each course)
  - `/records/all-time` (top 25 in school history)
- [ ] Add filters (boys/girls, varsity/JV)
- [ ] Make it look like a hall of fame

**Deliverable:** Records pages live

---

### Day 17 (Nov 7) - Race Time Predictor (Backend)
**Owner:** Claude

**Tasks:**
- [ ] Write prediction algorithm:
  ```typescript
  function predictTime(athleteId: string, targetCourseId: string): number {
    // 1. Get athlete's last 5 standardized times
    // 2. Calculate average (current fitness)
    // 3. Get target course difficulty
    // 4. Adjust for course difficulty
    // 5. Return predicted time with confidence interval
  }
  ```
- [ ] Test on known results (Ron validates accuracy)
- [ ] Aim for <10% error on average

**Deliverable:** Working prediction algorithm

---

### Day 18 (Nov 8) - Race Time Predictor (Frontend)
**Owner:** Claude Code

**Tasks:**
- [ ] Build predictor UI at `/tools/predictor`
- [ ] Inputs: Select athlete, select course
- [ ] Output: Predicted time, confidence %, recent form
- [ ] Make it fun (like a fortune teller for race times)

**Deliverable:** Race predictor tool live

---

### Day 19 (Nov 9) - Coach Admin Dashboard (Part 2)
**Owner:** Claude Code

**Tasks:**
- [ ] Add manual result entry form:
  - Select athlete, meet, course
  - Enter time
  - Save to database
  - Auto-calculate standardized time
- [ ] Add roster management:
  - Add new athlete
  - Edit athlete info
  - Archive graduated athletes

**Deliverable:** Coach can add results and manage roster

---

### Day 20 (Nov 10) - Polish & Bug Fixes
**Owner:** Claude Code + Ron

**Tasks:**
- [ ] Fix all known bugs
- [ ] Improve page load speeds
- [ ] Add loading skeletons (better UX)
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Optimize images (athlete photos)
- [ ] SEO basics (meta tags, Open Graph)

**Deliverable:** Stable, fast web app

---

### Day 21 (Nov 11) - Week 3 Review & Prepare for Mobile
**Owner:** Ron + Claude

**Tasks:**
- [ ] Full demo of web app (all features)
- [ ] Collect feedback from Westmont team
- [ ] Prioritize mobile app features for Week 4
- [ ] Set up React Native development environment

**Demo Checklist:**
- ✅ All 7 MVP features work
- ✅ Coach can use admin dashboard
- ✅ Athletes happy with their profiles
- ✅ Ready to build mobile app

**Deliverable:** Web app feature-complete, mobile prep done

---

## Week 4: Mobile App & Launch Prep (Nov 12 - Nov 18)

### Day 22 (Nov 12) - React Native Setup
**Owner:** Claude Code

**Tasks:**
- [ ] Initialize Expo project
- [ ] Install dependencies (React Navigation, Supabase JS)
- [ ] Set up project structure:
  ```
  /app
    /(tabs)
      /index.tsx (home/roster)
      /profile.tsx (my profile)
      /team.tsx (team rankings)
  /components
    /athlete-card.tsx
    /results-list.tsx
  /lib
    /supabase.ts
  ```
- [ ] Test on iOS simulator (if available) or Expo Go

**Deliverable:** React Native boilerplate running

---

### Day 23 (Nov 13) - Mobile App: Roster & Search
**Owner:** Claude Code

**Tasks:**
- [ ] Build home screen with athlete list
- [ ] Add search bar
- [ ] Each athlete card shows: Name, grad year, season PR
- [ ] Tap card → navigate to athlete detail

**Deliverable:** Functional roster screen

---

### Day 24 (Nov 14) - Mobile App: Athlete Profile
**Owner:** Claude Code

**Tasks:**
- [ ] Build athlete detail screen
- [ ] Show: Stats, PRs, race history
- [ ] Make it thumb-friendly (large touch targets)
- [ ] Pull-to-refresh for latest data

**Deliverable:** Athlete profile screen

---

### Day 25 (Nov 15) - Mobile App: Team Rankings
**Owner:** Claude Code

**Tasks:**
- [ ] Build rankings screen (tabs: Varsity, Most Improved)
- [ ] Highlight current user (if logged in)
- [ ] Add celebratory animations for top 3

**Deliverable:** Rankings screen

---

### Day 26 (Nov 16) - Mobile App: My Profile (Optional)
**Owner:** Claude Code

**Tasks:**
- [ ] Add simple login (athlete selects their name)
- [ ] Show personalized dashboard:
  - My stats
  - My rank on team
  - My recent races
- [ ] If time allows: Push notifications setup

**Deliverable:** Personalized profile screen

---

### Day 27 (Nov 17) - Mobile App: Polish & Testing
**Owner:** Claude Code + Ron

**Tasks:**
- [ ] Test app on real devices (Ron's phone, athlete phones)
- [ ] Fix UI issues (spacing, colors, fonts)
- [ ] Ensure offline functionality (cache data)
- [ ] Add app icon and splash screen

**Deliverable:** Polished mobile app ready for TestFlight

---

### Day 28 (Nov 18) - Week 4 Review & Launch Prep
**Owner:** Ron + Claude

**Tasks:**
- [ ] Full demo: Web + mobile
- [ ] Collect final feedback
- [ ] Create launch plan for Week 5
- [ ] Write announcement for Westmont team

**Demo Checklist:**
- ✅ Web app production-ready
- ✅ Mobile app working on iOS/Android
- ✅ All MVP features complete
- ✅ Ready to launch to full Westmont team

**Deliverable:** MVP complete, launch plan finalized

---

## Week 5: Launch Week (Nov 19 - Nov 21)

### Day 29 (Nov 19) - Pre-Launch Checklist
**Owner:** Ron + Claude

**Tasks:**
- [ ] Deploy web app to manaxc.com (production)
- [ ] Submit mobile app to TestFlight (iOS)
- [ ] Upload mobile app to Google Play (internal testing)
- [ ] Final QA testing (Ron + 2-3 athletes)
- [ ] Fix any critical bugs

**Deliverable:** All systems go for launch

---

### Day 30 (Nov 20) - 🚀 LAUNCH DAY
**Owner:** Ron

**Tasks:**
- [ ] Announce to Westmont XC team:
  - Email to athletes/parents
  - Share in team group chat
  - Post on social media (if applicable)
- [ ] Send TestFlight invites to athletes (iOS)
- [ ] Share Google Play internal testing link (Android)
- [ ] Share manaxc.com link
- [ ] Monitor for bugs/issues

**Launch Message Template:**
```
Hey Westmont XC Team! 🏃‍♂️

I'm excited to share Mana XC - our new team website and app!

Check out your stats, PRs, and how you stack up against the team:
🌐 Website: https://manaxc.com
📱 Mobile App: [TestFlight link] or [Google Play link]

Find your profile, see if you made Varsity rankings, and track your improvement all season long.

Let me know if you find any bugs or have ideas for improvements!

- Coach Ron
```

**Deliverable:** Mana XC live with Westmont team using it

---

### Day 31 (Nov 21) - Post-Launch Support
**Owner:** Ron + Claude

**Tasks:**
- [ ] Monitor usage (how many athletes using it?)
- [ ] Collect feedback (surveys, direct messages)
- [ ] Fix urgent bugs
- [ ] Celebrate the launch! 🎉

---

## Sprint Retrospective

### What Went Well:
- [To be filled after sprint]

### What Didn't Go Well:
- [To be filled after sprint]

### What to Improve:
- [To be filled after sprint]

### Key Learnings:
- [To be filled after sprint]

---

## Post-Sprint: Next 30 Days (Nov 22 - Dec 21)

**Focus:** Expand beyond Westmont

**Goals:**
- Add 3-5 more WCAL teams
- Auto-scraping for Athletic.net (no more manual entry)
- Improve course standardization with more data
- Onboard 1 other coach to test usability

---

## Emergency Protocols

**If We're Falling Behind:**
1. Cut mobile app (web-only for MVP)
2. Cut race predictor (nice-to-have)
3. Cut most improved rankings (focus on varsity only)
4. Manual data entry instead of scraping

**If We're Ahead of Schedule:**
1. Build mobile app early
2. Add social features (athlete comments)
3. Expand to 2nd team (another WCAL school)
4. Build auto-scraper for Athletic.net

---

## Daily Standup Template

Every morning, answer:
1. **What did I accomplish yesterday?**
2. **What am I working on today?**
3. **Any blockers or questions?**

Log in `progress/daily-log.md`

---

## Success Metrics

By end of 30 days, we should have:
- ✅ 100% of Westmont data loaded
- ✅ All 7 MVP features working
- ✅ Web app live at manaxc.com
- ✅ Mobile app in beta testing
- ✅ At least 15 Westmont athletes actively using it
- ✅ Zero critical bugs

**If we hit these, we WIN. 🏆**

---

**Last Updated:** October 22, 2025
**Status:** ✅ Sprint planned, Day 1 complete, ready for Day 2
