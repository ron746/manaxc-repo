# Mana XC - Project Overview

**Mission:** Build the world's best high school cross country team management and performance tracking platform.

**Founder:** Ron (Chief Credit Officer @ $50Bn Bank | Head XC/Track Coach @ Westmont HS)

**Launch Target:** 60 days to MVP with Westmont High School

---

## The Big Vision

Mana XC will become the dominant platform for high school cross country teams by solving the **course standardization problem** - converting race results across different courses into standardized, comparable times. This unlocks:

- Fair athlete rankings across the country
- College recruiting insights
- Predictive race performance
- Training progression tracking

**Long-term:** Expand to track & field, monetize training plans, become the "Strava for high school runners"

---

## The Killer Feature (Our Moat)

**Course Difficulty Standardization Algorithm**

Convert any XC race time on any course to a standardized track mile equivalent.

Example: 17:30 on a hilly 5K course = 4:45 track mile equivalent

This is what Athletic.net, MileSplit, and others haven't solved well. We will.

---

## MVP Scope (Westmont HS Launch - 60 Days)

### ✅ In Scope
- [ ] Course ranking/standardization system
- [ ] All Westmont meet results since 2022 (scraped from Athletic.net)
- [ ] Coach admin interface (web-based)
- [ ] Student/athlete interface (mobile app + web)
- [ ] Team ranking page
- [ ] Individual athlete profile pages
- [ ] Roster page with PRs
- [ ] Most Improved tracking
- [ ] Season records display
- [ ] Course records display
- [ ] School all-time records
- [ ] League comparison tool
- [ ] Race time predictor

### ❌ Out of Scope (Post-MVP)
- Training plan generation
- Payment processing
- Injury management
- Workout logging
- Calendar/event coordination
- Transportation planning
- Multiple teams beyond Westmont

---

## Business Model

**Phase 1 (MVP):** 100% FREE - Information only
- Build user base
- Validate course standardization
- Get feedback from Westmont athletes/parents

**Phase 2:** Freemium Model
- Athletes: $3/month for training plans
- Teams: $50/month for full suite
- Ad revenue from site traffic

**CAC Strategy:** Word of mouth in XC community (coaches share on social)

**Target:** $10K MRR within 6 months of paid launch

---

## Competitive Analysis

| Competitor | Strengths | Weaknesses | Our Advantage |
|------------|-----------|------------|---------------|
| Athletic.net | Massive database, meet hosting | Clunky UI, no standardization | Better course rankings, simpler UX |
| MileSplit | Great media coverage | Expensive, not team-focused | Free tier, team management tools |
| Lynbrook Sports | Historical data (PDFs) | Outdated, no live data | Modern tech, real-time updates |
| TFRRS/Lactic | College-focused | Ignores high school market | HS-first approach |
| TeamSnap | Team management | No performance analytics | Performance + management in one |

**Our Unique Position:** Deep XC coaching expertise + modern AI/tech + course standardization

---

## Technology Stack

**Backend:**
- Supabase (PostgreSQL, Auth, Storage, Real-time subscriptions)
- Python for data scraping (Athletic.net, MileSplit)

**Frontend:**
- Next.js 14 + React + Tailwind CSS (manaxc.com)
- Responsive design (works on mobile web)

**Mobile App:**
- React Native + Expo (iOS + Android)
- Shared components with web app

**Data Pipeline:**
- Python scrapers (GitHub Actions cron jobs)
- Athletic.net historical data import
- Supabase Edge Functions for real-time processing

**Hosting:**
- Vercel (Next.js frontend - free tier)
- Supabase (backend - free tier, then Google Cloud grant)
- Cloudflare (DNS for manaxc.com, manafitness.com)

**Project Management:**
- Markdown files (AI-readable, version controlled)
- Custom admin dashboard at manaxc.com/admin

---

## Key Accounts & Services

See `docs/service-registry.md` for detailed credentials and tracking.

**Active Services:**
- manaxc.com (Cloudflare DNS)
- manafitness.com (Cloudflare DNS)
- GitHub: ron@manaxc.com
- Supabase: [TBD - need to create project]
- Google Cloud Platform: Grant application pending
- Vercel: [TBD - will connect to GitHub]

---

## Project Structure

```
manaxc-project/
├── README.md (this file)
├── docs/
│   ├── service-registry.md          # All accounts, logins, API keys
│   ├── business-plan.md             # Full business plan
│   ├── mvp-specifications.md        # Detailed MVP requirements
│   ├── course-standardization.md    # Algorithm documentation
│   └── data-schema.md               # Database design
├── progress/
│   ├── sprint-plan.md               # 30-day sprint breakdown
│   ├── daily-log.md                 # What we did each day
│   └── decisions.md                 # Key architectural decisions
├── research/
│   ├── athletic-net-scraping.md     # How to scrape Athletic.net
│   ├── competitor-analysis.md       # Deep dive on competitors
│   └── course-data.md               # Course difficulty research
└── code/
    ├── backend/                     # Supabase setup, Edge Functions
    ├── frontend/                    # Next.js web app
    ├── mobile/                      # React Native app
    └── scrapers/                    # Python data collection scripts
```

---

## Next Steps (Immediate)

1. ✅ Create project structure
2. ⏳ Set up Supabase project
3. ⏳ Design database schema
4. ⏳ Build Athletic.net scraper
5. ⏳ Import Westmont historical data
6. ⏳ Create course standardization algorithm v1
7. ⏳ Build coach admin dashboard
8. ⏳ Build athlete profile pages
9. ⏳ Deploy to manaxc.com
10. ⏳ Launch with Westmont team

---

**Last Updated:** October 22, 2025
**Project Start:** October 22, 2025
**Target MVP Launch:** December 22, 2025 (60 days)
