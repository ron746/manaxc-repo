# 🚀 START HERE - ManaXC AI Context Loader

**MANDATORY FIRST READ FOR EVERY AI SESSION**

---

## Quick Context (2-Minute Read)

**Project:** ManaXC - High school cross country performance tracking platform
**Target Launch:** December 22, 2025 (60 days from October 22)
**Launch Team:** Westmont High School XC
**Current Phase:** Foundation (Week 1 of 4)

**Current Sprint Day:** 1 of 30 ✅ COMPLETE
**Next Priority:** Day 2 - Database setup + import Excel data (LEARNING FOCUS)

---

## Project Status Dashboard

**Last Updated:** October 22, 2025 - End of Day 1

**Completed:**
- ✅ Project planning and documentation
- ✅ MVP specifications defined
- ✅ Service accounts created (Supabase, GitHub, Vercel, GCP)
- ✅ Domain setup (manaxc.com, manafitness.com)
- ✅ Review of previous attempts and lessons learned
- ✅ AI memory management system established

**Next Session Priorities:**
1. Review Excel file structure to inform database schema
2. Set up Supabase database with migration/validation system
3. Import sample Excel data as "legacy" (Westmont only)
4. Build foundation for validating complete results later
5. See: ADR-002 (Data Migration Strategy)

**Blockers:** None - ready to proceed

---

## Critical Technical Standards

### ✅ DECISION MADE: CENTISECONDS

**Time Storage:** **CENTISECONDS** (19:30.45 = 117045)
- **Rationale:** Runners and coaches care deeply about accurate data
- **Field name:** `time_cs` (INTEGER)
- **Precision:** 0.01 seconds (hundredths)
- **Status:** NON-NEGOTIABLE
- **Documentation:** `docs/decisions/adr-001-time-storage.md`

**Database Schema:**
- **Decision:** Use OLD project v2.4 as foundation, simplify where over-engineered
- **Proven patterns:** Materialized views, RLS policies, indexes
- **Location:** `docs/data-schema.md`

**Web Scraper:**
- **Decision:** Reuse Puppeteer scraper from OLD project (battle-tested with Athletic.net)
- **Location:** Copy from `OLD_Projects/mana-xc/scripts/athletic-net-scraper-v2.js`

---

## Session Startup Protocol

**Every AI session MUST start with:**

1. **Read this file** (00-START-HERE.md)
2. **Read current status** (CURRENT-STATUS.md)
3. **Read recent log** (progress/daily-log.md - last 3 entries)
4. **Ask Ron:** "What's our focus for today?"

**Then navigate to relevant deep-dive docs:**
- Architecture: `docs/data-schema.md`
- Business requirements: `docs/mvp-specifications.md`
- Current sprint: `progress/sprint-plan.md`
- Past decisions: `docs/decisions/`

---

## Key Lessons from Previous Attempts

### ✅ What Worked (Reuse These)
1. **Import Wizard:** 5-step UI with visual feedback and validation
2. **Puppeteer Scraper:** Handles Athletic.net's Angular SPA correctly
3. **Materialized Views:** Fast queries for athlete PRs
4. **Name Parser:** `nameparser` Python library (handles complex names)
5. **RLS Policies:** Public read, authenticated coach write
6. **Colorblind Design:** Light theme, yellow highlights, 2px borders

### ❌ What Failed (Avoid These)
1. **Insufficient validation:** Import bad data → database reset required
2. **Complex name splitting:** Over-engineered, caused errors
3. **Missing duplicate detection:** Polluted database
4. **No preview step:** Committed bad data directly
5. **Context decay:** Lost track of project state between sessions

### 🎯 How We're Fixing It
1. **Validation first:** Build validators before importers
2. **Database transactions:** All-or-nothing imports
3. **Preview UI:** Review data before final commit
4. **This file:** Prevents context loss
5. **Daily logs:** Track progress and decisions

---

## File Organization

```
manaxc-project/
├── 00-START-HERE.md          ← You are here (AI context loader)
├── CURRENT-STATUS.md          ← Daily update (what's done, what's next)
├── README.md                  ← Project vision and overview
│
├── docs/
│   ├── data-schema.md         ← Database design (copy from OLD, proven)
│   ├── mvp-specifications.md  ← What we're building
│   ├── service-registry.md    ← All accounts and credentials
│   └── decisions/             ← Architectural Decision Records (ADRs)
│       └── adr-XXX-*.md       ← One file per major decision
│
├── planning/                  ← Day-by-day plans and summaries
│   ├── DAY-2-CHECKLIST.md     ← Tomorrow's checklist
│   └── END-OF-DAY-1-SUMMARY.md ← Today's summary
│
├── progress/
│   ├── daily-log.md           ← Update at end of every session
│   ├── sprint-plan.md         ← 30-day roadmap
│   └── decisions.md           ← Quick decision log
│
├── reference/                 ← Reference docs and OLD project assets
│   ├── MANA_XC_FRESH_START_CONTEXT.md
│   ├── RESEARCH_DATA_SOURCES_AND_NAME_PARSING.md
│   ├── ORIGINAL-START-HERE.md
│   └── proven-patterns/       ← Copy working code here (Day 2)
│
└── code/                      ← Implementation (empty until Day 2)
    ├── backend/
    ├── frontend/
    ├── mobile/
    └── scrapers/
```

---

## Daily Workflow

### 1. Start of Day (5 minutes)
- [ ] Read this file (00-START-HERE.md)
- [ ] Check CURRENT-STATUS.md
- [ ] Review yesterday's progress in daily-log.md
- [ ] Identify today's #1 priority

### 2. During Work Session
- [ ] Use SpecKit commands for feature work:
  - `/speckit.specify` - Define features
  - `/speckit.plan` - Create implementation plans
  - `/speckit.tasks` - Generate actionable tasks
  - `/speckit.implement` - Execute implementation
- [ ] Document decisions in `docs/decisions/`
- [ ] Update progress as you go

### 3. End of Day (10 minutes)
- [ ] Update CURRENT-STATUS.md with today's progress
- [ ] Add entry to progress/daily-log.md
- [ ] Set tomorrow's priority
- [ ] Commit code changes (if any)

### 4. End of Week
- [ ] Review sprint-plan.md (are we on track?)
- [ ] Archive old session notes
- [ ] Plan next week's priorities

---

## Critical Resources

### Accounts & Services
- **Supabase:** https://supabase.com/dashboard/project/mdspteohgwkpttlmdayn
- **GitHub:** ron746 (ron@manaxc.com)
- **Vercel:** Connected to GitHub
- **Domains:** manaxc.com, manafitness.com (Cloudflare)
- **Credentials:** See `docs/service-registry.md`

### Previous Project (Reference Only)
- **Location:** `/Users/ron/manaxc/OLD_Projects/mana-xc/`
- **Key files to reference:**
  - `CLAUDE.md` - Technical overview
  - `docs/DATA_ARCHITECTURE_V2.4.md` - Proven database schema
  - `scripts/athletic-net-scraper-v2.js` - Working scraper
  - `docs/AI_CONTEXT_LOADER.md` - Context management approach

**⚠️ Important:** OLD project is for reference only. Don't modify it.

---

## Non-Negotiable Rules

### 1. Data Quality
- ✅ Validate before insert (no bad data in database)
- ✅ Use database transactions (all-or-nothing)
- ✅ Preview step before commit
- ✅ Duplicate detection required

### 2. Accessibility (Ron is colorblind)
- ✅ Light theme only (white/gray backgrounds)
- ✅ High contrast text (gray-900, gray-800)
- ✅ Yellow highlights (bg-yellow-50 + border-yellow-500)
- ✅ No dark backgrounds, no red/green color coding
- ✅ Thick borders (2px minimum)

### 3. Context Management
- ✅ Read this file every session
- ✅ Update daily-log.md every session
- ✅ Document decisions in ADRs
- ✅ Keep CURRENT-STATUS.md current

### 4. Scope Discipline
- ✅ MVP only (no feature creep)
- ✅ Westmont team only (no multi-team yet)
- ✅ Information platform only (no training plans yet)
- ✅ Ask "Is this MVP?" before building anything

---

## Effective AI Prompts

### ✅ Good Prompts (Use These Patterns)
```
"Read 00-START-HERE.md, then review the database schema in
docs/data-schema.md and implement the athletes table in Supabase."

"Copy the Puppeteer scraper from OLD_Projects/mana-xc/scripts/
to our new project, then update it to output the new schema format."

"Update progress/daily-log.md with today's accomplishments:
we completed database setup and imported test data."

"Using /speckit.specify, create a spec for the athlete profile page
based on docs/mvp-specifications.md section 4."
```

### ❌ Avoid These Prompts
```
"Build the whole app" (too vague)
"Fix the bug" (need context about which bug)
"Make it better" (need specific criteria)
"Start from scratch" (we have proven patterns to reuse)
```

---

## Success Criteria (How We Know We're Winning)

### Week 1 (Days 1-7)
- [x] Day 1: Planning complete ✅
- [ ] Day 2: Database deployed with proven schema
- [ ] Day 3: Scraper copied and tested
- [ ] Day 4: Validation layer built
- [ ] Day 5: First data imported successfully
- [ ] Day 6-7: Import wizard UI working

### End of Sprint (Day 30)
- [ ] All Westmont 2022-2025 data imported (clean)
- [ ] Athlete profiles working
- [ ] Team rankings working
- [ ] Coach admin dashboard functional
- [ ] Deployed to manaxc.com
- [ ] 10+ Westmont athletes actively using it
- [ ] Zero critical bugs

---

## Emergency Protocols

### If We're Falling Behind Schedule
1. Cut mobile app (web-only MVP)
2. Cut race predictor (nice-to-have)
3. Manual data entry instead of auto-scraping
4. Focus on Westmont only (no other teams)

### If Context is Lost
1. Read this file
2. Read CURRENT-STATUS.md
3. Read last 3 daily-log.md entries
4. Ask Ron to clarify current priority

### If Data Quality Issue Occurs
1. STOP importing immediately
2. Review validation rules
3. Test with small dataset first
4. Get Ron to verify sample before full import

---

## Quick Reference Commands

### SpecKit Commands (Already Installed)
- `/speckit.specify` - Create/update feature specification
- `/speckit.plan` - Generate implementation plan
- `/speckit.tasks` - Generate actionable task list
- `/speckit.implement` - Execute implementation plan
- `/speckit.clarify` - Ask clarifying questions
- `/speckit.analyze` - Check consistency across artifacts

### Git Commands (When Ready)
```bash
# Daily commit pattern
git add .
git commit -m "Day X: [accomplishment]"
git push origin main
```

### Database Commands
```sql
-- Refresh materialized views (after data changes)
REFRESH MATERIALIZED VIEW athlete_xc_times_v3;

-- Check data quality
SELECT COUNT(*) FROM athletes;
SELECT COUNT(*) FROM results;
SELECT COUNT(*) FROM meets WHERE course_id IS NULL; -- Should be 0
```

---

## Today's Priorities (Day 1 Complete ✅)

**What We Accomplished:**
- ✅ Comprehensive review of OLD_Projects
- ✅ Analyzed all previous documentation
- ✅ Identified proven patterns to reuse
- ✅ Documented lessons learned
- ✅ Created this AI context management system
- ✅ Set up memory wall defenses

**Tomorrow's Plan (Day 2):**
1. Make final technical decisions (30 min)
   - Time storage: centiseconds vs seconds
   - Confirm schema approach
   - Confirm scraper reuse
2. Set up Supabase database (2 hours)
   - Deploy schema based on OLD project v2.4
   - Set up RLS policies
   - Test connection
3. Document decisions in ADRs (30 min)

**End of Week Goal:**
Database populated with Westmont historical data, import wizard working.

---

## Remember

**"Ship Fast, Learn Faster"**

- Progress beats perfection
- Reuse what worked, fix what didn't
- Daily logs prevent context loss
- Validation prevents data disasters
- MVP focus keeps us on track

**You've got this, Ron. Day 1 complete. Let's build ManaXC the right way. 🏃‍♂️**

---

**Last Updated:** October 22, 2025 - 7:30 PM
**Status:** ✅ Ready for Day 2
**Next Session:** Database setup with proven schema
