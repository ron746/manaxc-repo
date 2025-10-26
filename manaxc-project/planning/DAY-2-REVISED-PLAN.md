# Day 2 Plan - Build the Real App (Learning Focus)

**Date:** October 23, 2025
**Philosophy:** Learn by building, not by shortcuts
**Time Commitment:** 3-4 hours (focused session)

---

## Ron's Context (Important!)

**What you've already done:**
- ✅ Built Google Sheets version (knows it's brutal to maintain)
- ✅ 58 years of data in Excel (already compiled)
- ✅ 3 previous attempts at building this properly
- ✅ Proven patterns from OLD project

**What you want:**
- Build a REAL app with modern tech
- Learn AI-assisted development
- Enjoy the building process
- Create something professional and scalable

**What you DON'T want:**
- Google Sheets hacks
- No-code solutions
- Quick and dirty approaches
- Shortcuts that create maintenance hell

---

## Day 2 Goals (Learning-Focused)

### Primary Goal
**Set up the foundation for building a real app**

### Learning Objectives
1. Understand Supabase database structure (hands-on)
2. Make technical decisions based on your Excel data
3. Set up development environment properly
4. Import real data to start building features against

### Deliverables
- ✅ Working database with your schema
- ✅ Real Westmont data imported (at least sample)
- ✅ Development environment ready
- ✅ First technical decisions documented

---

## Session Plan (3-4 hours)

### Part 1: Technical Decisions (30 minutes)

**Decision 1: Time Storage Format ✅ DECIDED**
**CENTISECONDS** - Ron's decision: "Runners and coaches care deeply about accurate data"
- Format: 19:30.45 = 117045 centiseconds
- Database type: INTEGER
- Field name: `time_cs`
- Precision: 0.01 seconds (hundredths)
- Status: NON-NEGOTIABLE
- Documented in: `docs/decisions/adr-001-time-storage.md`

**Decision 2: Schema Approach**
- Use OLD project v2.4 as BASE
- Simplify based on what's in YOUR Excel data
- Keep what you actually use, drop what you don't

**Decision 3: Data Priority**
- Import your Excel data FIRST (Days 2-3)
- This gives you real data to build features against
- Build scraper LATER for ongoing updates

**Document in:** `docs/decisions/adr-001-data-model.md`

---

### Part 2: Database Setup (90 minutes)

**Step 1: Design Schema Based on Your Excel (30 min)**
- Review your Excel sheets structure
- Map to database tables
- Keep it simple - match what YOU track

**Tables you actually need (based on Excel + migration strategy):**
```sql
schools (you have 1: Westmont, will expand)
courses (from Master Courses sheet)
athletes (from Master Athletes sheet)
meets (from race data)
results (with legacy/complete tracking - see ADR-002)
result_validations (track discrepancies)
migration_progress (track which races need complete data)
```

**Migration Strategy:**
- Legacy data (Excel) = Westmont athletes only, marked `is_legacy_data = TRUE`
- Complete data (Athletic.net) = All schools, marked `is_complete_results = TRUE`
- System auto-validates, flags discrepancies for your review
- After confirmation, legacy data soft-deleted
- See: `docs/decisions/adr-002-data-migration-strategy.md`

**Step 2: Deploy to Supabase (30 min)**
- Open Supabase SQL Editor
- Create tables one by one
- Test each table works
- Set up basic indexes

**Step 3: Set up RLS Policies (30 min)**
- Public read (anyone can view data)
- Admin write (you can modify)
- Simple and functional

---

### Part 3: Import Your Excel Data (60 minutes)

**Why this matters for learning:**
- You'll see how database design decisions affect imports
- You'll understand data validation needs
- You'll have REAL data to query and display
- You can start building features immediately

**Step 1: Export to CSV (20 min)**
- Open your Excel file
- Export MasterResults → CSV (just 50 rows for testing)
- Export Master Athletes → CSV
- Export Master Courses → CSV

**Step 2: Test Import (20 min)**
- Use Supabase Table Editor to import CSV
- Or write simple SQL INSERT statements
- Verify data looks correct
- Check foreign key relationships work

**Step 3: Query Real Data (20 min)**
- Write SQL to get fastest Westmont times
- Get all athletes from 2024 season
- Get all results from Crystal Springs
- This shows you what you're building for!

---

### Part 4: Development Environment (30 min)

**Only if time allows - can do Day 3:**

**Set up Next.js project:**
```bash
npx create-next-app@latest manaxc-app
cd manaxc-app
npm install @supabase/supabase-js
```

**Create .env.local:**
```
NEXT_PUBLIC_SUPABASE_URL=https://mdspteohgwkpttlmdayn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your key]
```

**Test connection:**
- Write simple query to get athletes
- Display in basic Next.js page
- Proves everything works end-to-end

---

## What You'll Learn Today

### Technical Skills
1. **Database design** - How to model real-world data
2. **Supabase basics** - Cloud database, SQL editor, RLS
3. **Data import** - CSV to database, validation
4. **SQL queries** - Getting the data you need

### Decision-Making
1. How to evaluate technical options (centiseconds vs seconds)
2. When to keep vs. simplify from previous attempts
3. How to structure data for your actual use cases

### Practical Experience
1. Working with YOUR real data
2. Seeing what 58 years of history looks like in a database
3. Understanding what queries you'll need for features

---

## Tomorrow (Day 3) Preview

**If Day 2 goes well:**
- Build your first feature: "Fastest Times" page
- Query database for top 10 Westmont performances
- Display in simple Next.js page
- See your real data on a real web page!

**This is where it gets FUN** - you have data, now you build UI to show it.

---

## Success Criteria for Day 2

**Minimum Success:**
- [ ] Database created with 5+ tables
- [ ] Technical decisions documented
- [ ] Sample data imported (even just 10 rows)
- [ ] You understand the schema

**Expected Success:**
- [ ] Database fully deployed
- [ ] 50-100 results imported from Excel
- [ ] Athletes and courses tables populated
- [ ] Can write SQL queries to get data

**Exceptional Success:**
- [ ] 500+ results imported
- [ ] All Master Athletes imported
- [ ] All Master Courses imported
- [ ] Next.js project set up and connected
- [ ] First simple page showing data

---

## Questions I'll Help You Answer Tomorrow

1. **Looking at your Excel MasterResults sheet:**
   - What columns do you have?
   - How are times formatted?
   - What data is most important to you?

2. **Database design:**
   - Should we add a field for X?
   - How do we handle Y?
   - What indexes do we need?

3. **Import strategy:**
   - Best way to get Excel → Supabase?
   - How to handle duplicates?
   - What validation rules?

---

## Why This Approach Works

**You're learning by doing:**
- Not following a tutorial
- Building with YOUR real data
- Making real technical decisions
- Creating something you'll actually use

**You're building properly:**
- Real database (Supabase)
- Modern framework (Next.js)
- Scalable architecture
- Professional practices

**You're having fun:**
- Seeing your 58 years of data come to life
- Making things that work
- Learning modern tech
- Building something meaningful

---

## The Learning Journey

**Week 1 (Days 1-7):**
- Database + data import + first feature
- Learn: Supabase, SQL, basic Next.js

**Week 2 (Days 8-14):**
- Build 3-4 core features (athlete profiles, rankings, records)
- Learn: React components, data queries, routing

**Week 3 (Days 15-21):**
- Course rating algorithm (the fun math part!)
- Learn: Algorithms, calculations, data analysis

**Week 4 (Days 22-30):**
- Polish, deploy, show Westmont team
- Learn: Deployment, performance, real user feedback

**By Day 30:** You've built a real app AND learned modern development.

---

## Tomorrow's Startup Prompt

**When you're ready to start Day 2, tell Claude:**

> "Read 00-START-HERE.md and planning/DAY-2-REVISED-PLAN.md. I want to set up the database and import my Excel data. Let's start by looking at my Excel file structure to inform our schema decisions."

---

## End of Day 1 Summary

**What we accomplished:**
- ✅ Comprehensive review of previous attempts
- ✅ Found your 58 years of Excel data
- ✅ Set up AI memory management
- ✅ Organized project structure
- ✅ Clarified that you want to BUILD, not hack
- ✅ Created learning-focused plan

**Your mindset:**
Build a real app, learn modern tech, enjoy the process.

**Tomorrow:**
Database + real data + hands-on learning.

---

**Token Usage:** 94% (saving 6% for tomorrow)
**Status:** Ready to build
**Mindset:** Learning by doing, building properly

**Good night, Ron. Tomorrow we build a real database with your real data. No shortcuts. 🚀**
