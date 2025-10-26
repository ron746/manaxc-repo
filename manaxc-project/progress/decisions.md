# Architectural Decision Records (ADR)

Document key technical and business decisions with context and rationale.

---

## ADR-001: Technology Stack Selection

**Date:** October 22, 2025  
**Status:** ✅ Accepted  
**Deciders:** Ron + Claude

**Context:**
Need to choose technology stack that balances:
- Ron's learning goals (new to software development)
- Speed to market (60-day MVP deadline)
- Scalability (millions of results, thousands of users)
- Cost (bootstrapped, limited budget)

**Decision:**

**Backend:** Supabase (PostgreSQL + Auth + Storage + Real-time)
- **Why:** 
  - Generous free tier (perfect for MVP)
  - Built-in authentication (no need to build from scratch)
  - Real-time subscriptions (for live meet results later)
  - Ron has prior experience with Supabase
  - Easy migration to Google Cloud if grant approved

**Frontend:** Next.js 14 + React + Tailwind CSS
- **Why:**
  - Modern, fast, great developer experience
  - Server-side rendering for SEO (important for college recruiters finding athletes)
  - Large community (easy to find help)
  - Works great with Supabase
  - Tailwind makes it easy to build attractive UIs quickly

**Mobile:** React Native + Expo
- **Why:**
  - Write once, deploy to iOS + Android
  - Can share components with Next.js web app (both use React)
  - Expo simplifies build/deployment process
  - Free TestFlight/Google Play internal testing

**Data Pipeline:** Python 3.11+
- **Why:**
  - Best language for web scraping (BeautifulSoup, Requests)
  - Easy to learn and read
  - Great data processing libraries (Pandas)
  - Can run on GitHub Actions for free

**Hosting:**
- Vercel (frontend) - Free tier, automatic deployments
- Supabase (backend) - Free tier, scales easily
- GitHub Actions (scrapers) - Free for public repos

**Consequences:**
- ✅ Low cost (everything on free tiers for MVP)
- ✅ Fast development (modern tooling)
- ✅ Scalable (proven at scale by large companies)
- ⚠️ Vendor lock-in to Vercel/Supabase (but easy to migrate)
- ⚠️ Learning curve for Ron (but good long-term investment)

---

## ADR-002: MVP Scope - Free Information Only

**Date:** October 22, 2025  
**Status:** ✅ Accepted  
**Deciders:** Ron + Claude

**Context:**
Need to decide whether to include paid features (training plans, subscriptions) in MVP or keep it free.

**Decision:**
MVP will be 100% FREE with no payment processing.

**Rationale:**
1. **Validation First:** Need to prove course standardization works before charging
2. **Faster Launch:** No Stripe integration, no subscription management, no refund handling
3. **User Acquisition:** Free removes friction, easier to get Westmont athletes to try it
4. **Focus:** Can focus on core product instead of billing infrastructure
5. **Word of Mouth:** Free product spreads faster in coaching community

**Monetization Plan (Post-MVP):**
- Athletes: $3/month for AI training plans
- Teams: $50/month for full suite
- Ads: Display ads on high-traffic pages

**Consequences:**
- ✅ Faster to market (no payment complexity)
- ✅ Lower risk (no compliance issues with minors paying)
- ✅ Easier feedback loop (users focus on features, not price)
- ⚠️ No revenue validation in MVP (have to assume willingness to pay)
- ⚠️ Will need to add payments later (more work)

---

## ADR-003: Launch with Single Team (Westmont Only)

**Date:** October 22, 2025  
**Status:** ✅ Accepted  
**Deciders:** Ron + Claude

**Context:**
Considering whether to launch with multiple teams or just Westmont.

**Decision:**
MVP launches with Westmont High School only. Multi-team support comes in Phase 2.

**Rationale:**
1. **Simpler Database:** No need for complex multi-tenancy, team permissions, etc.
2. **Faster Development:** Less code to write and test
3. **Better Focus:** Can tailor UX specifically for Westmont's needs
4. **Real Feedback:** Ron is the coach, can iterate quickly based on actual usage
5. **Proof of Concept:** Validates the core value before scaling

**Multi-Team Roadmap:**
- Month 2: Add 2-3 more WCAL teams
- Month 3: Open to all WCAL league (8 schools)
- Month 6: Expand to all California high schools

**Consequences:**
- ✅ Drastically simpler architecture
- ✅ Faster to market
- ✅ Easier to get feedback and iterate
- ⚠️ Less impressive demo (only 1 team)
- ⚠️ Will need database refactoring for multi-team (but manageable)

---

## ADR-004: Course Standardization Algorithm Approach

**Date:** October 22, 2025  
**Status:** ✅ Accepted  
**Deciders:** Ron + Claude

**Context:**
Need to decide between simple heuristic vs. machine learning model for course difficulty.

**Decision:**
Start with simple heuristic based on elevation gain + terrain type. Upgrade to ML model after collecting more data.

**Heuristic Formula:**
```
Difficulty = 1 + (elevation_gain_meters / 100) * 0.5 + terrain_modifier

where terrain_modifier:
  - 0.0 for track
  - 0.5 for flat grass
  - 1.0 for rolling hills
  - 1.5 for steep trails

Max difficulty capped at 10
```

**Rationale:**
1. **Explainable:** Coaches can understand and trust the formula
2. **Fast to Build:** No need to collect training data or train model
3. **Good Enough:** Ron's domain expertise suggests this will be 80% accurate
4. **Iterative:** Can refine based on feedback and add ML later

**ML Model (Future):**
- Collect 1,000+ race results across 100+ courses
- Train model on: elevation, distance, weather, altitude, winning times
- Use gradient boosting or neural network
- Target: <5% error vs. simple heuristic

**Consequences:**
- ✅ Ships in MVP timeframe
- ✅ Easy to explain to users
- ✅ Ron can manually adjust ratings for known courses
- ⚠️ May not be as accurate as ML (but good enough for launch)
- ⚠️ Will need to refactor when adding ML (but that's fine)

---

## ADR-005: Data Source Strategy - Athletic.net Scraping

**Date:** October 22, 2025  
**Status:** ⚠️ Accepted with Risk  
**Deciders:** Ron + Claude

**Context:**
Need historical Westmont results. Athletic.net has 15 years of data but no public API.

**Decision:**
Build Python scraper for Athletic.net with ethical rate limiting. Manually import data for MVP.

**Approach:**
1. Scrape Westmont team page (public data)
2. Rate limit: 1 request per 2 seconds (respectful)
3. Run once to import historical data (not continuous scraping)
4. Store scraped data in Supabase (never scrape same data twice)
5. For new meets, coach manually enters or we scrape on-demand

**Legal Considerations:**
- ✅ Public data (no login required)
- ✅ Not for commercial redistribution (only for Westmont team)
- ✅ Rate limited (not DDoS-ing their servers)
- ⚠️ No Terms of Service violation (need to verify)
- ⚠️ Could break if Athletic.net changes HTML structure

**Alternative Explored:**
- Athletic.net API: None available (contacted them, no response)
- Manual entry: Too time-consuming (1,000+ results)
- MileSplit API: None available
- TFRRS: College only, no high school data

**Consequences:**
- ✅ Gets us historical data we need
- ✅ One-time effort (not ongoing scraping)
- ⚠️ Ethical gray area (but common practice for sports data)
- ⚠️ Fragile (could break if they change site structure)

**Fallback Plan:**
If scraping fails or gets blocked:
- Manual CSV import of Ron's existing Google Sheets data
- Slower but guaranteed to work

---

## ADR-006: Mobile App Strategy - Native First

**Date:** October 22, 2025  
**Status:** ✅ Accepted  
**Deciders:** Ron + Claude

**Context:**
Athletes (high school students) prefer mobile apps over web. Coaches prefer web (larger screens).

**Decision:**
Build both: React Native mobile app for athletes + Next.js web app for coaches. Share code where possible.

**Rationale:**
1. **User Preference:** Teens live on their phones (Instagram, TikTok, etc.)
2. **Push Notifications:** Can notify athletes of new PRs, race results (future feature)
3. **Offline Access:** App can cache data, works at meets with poor cell signal
4. **Sharing:** Athletes more likely to share app with teammates ("Check out my profile!")

**Shared Code:**
- React components (athlete cards, results tables)
- Data fetching logic (Supabase queries)
- Business logic (time calculations, rankings)

**Platform-Specific:**
- Web: More detailed admin dashboard, bulk operations
- Mobile: Simpler navigation, thumb-friendly UI, push notifications

**Consequences:**
- ✅ Better user experience for athletes (native feel)
- ✅ Competitive advantage (Athletic.net has clunky mobile web)
- ⚠️ More development time (but React Native makes it manageable)
- ⚠️ App store approval process (TestFlight, Google Play)

**Contingency:**
If falling behind schedule:
- Cut mobile app from MVP
- Make web app highly mobile-responsive
- Add mobile app in Phase 2

---

## ADR-007: Project Management - Markdown + Custom Dashboard

**Date:** October 22, 2025  
**Status:** ✅ Accepted  
**Deciders:** Ron + Claude

**Context:**
Ron needs to track progress but is busy with coaching + full-time job. How to minimize overhead?

**Decision:**
Use Markdown files (version controlled) + build simple admin dashboard at manaxc.com/admin/progress.

**Markdown Files:**
- `progress/sprint-plan.md` - 30-day plan
- `progress/daily-log.md` - Daily updates
- `docs/decisions.md` - Architecture decisions (this file)

**Why Markdown:**
- ✅ Plain text (easy to read, edit, version control)
- ✅ AI-friendly (Claude can read and update)
- ✅ Works offline (Ron can edit locally)
- ✅ No external tool dependencies (Notion, Trello, etc.)

**Custom Dashboard:**
- Simple UI to visualize progress
- Shows: Tasks complete, days until launch, current sprint
- Links to all markdown files
- Updates automatically from Git

**Consequences:**
- ✅ Zero learning curve (Ron just opens markdown files)
- ✅ AI can track and update progress
- ✅ No monthly subscription fees (Notion, etc.)
- ⚠️ Less visually pretty than dedicated tools
- ⚠️ Have to build custom dashboard (but simple)

---

## ADR-008: Database Design - Denormalization for Speed

**Date:** October 22, 2025  
**Status:** ✅ Accepted  
**Deciders:** Claude

**Context:**
Need to decide between fully normalized schema vs. denormalized (store calculated values).

**Decision:**
Store calculated values (standardized times, PRs) in database instead of calculating on-the-fly.

**Example:**
Instead of:
```sql
-- Calculate standardized time every query (SLOW)
SELECT 
  r.time_seconds,
  calculate_standardized_time(r.time_seconds, c.difficulty) as std_time
FROM results r
JOIN courses c ON r.course_id = c.id
```

Do this:
```sql
-- Store standardized time (FAST)
SELECT 
  r.time_seconds,
  r.standardized_mile_seconds
FROM results r
```

**Rationale:**
1. **Speed:** Page loads in <1 second (critical for mobile)
2. **Simplicity:** No complex JOINs in every query
3. **Consistency:** Same calculation always returns same result

**Trade-offs:**
- ✅ 10x faster queries (no runtime calculations)
- ✅ Simpler API endpoints
- ⚠️ Storage overhead (extra columns)
- ⚠️ Must recalculate if algorithm changes (but rare)

**Recalculation Strategy:**
If course standardization algorithm improves:
1. Run SQL migration to update all `standardized_mile_seconds`
2. Should take <1 minute for 1,000 results
3. Atomic operation (no downtime)

---

## Template for New ADRs

```markdown
## ADR-XXX: [Decision Title]

**Date:** [Date]
**Status:** [Proposed / Accepted / Deprecated / Superseded]
**Deciders:** [Names]

**Context:**
[What's the situation? Why do we need to make a decision?]

**Decision:**
[What did we decide?]

**Rationale:**
[Why did we decide this?]

**Consequences:**
[What are the pros/cons of this decision?]
- ✅ Positive consequence
- ⚠️ Negative consequence or risk
```

---

**Last Updated:** October 22, 2025
