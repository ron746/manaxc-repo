# ✅ Day 2 Action Checklist - Database Setup

**Date:** October 23, 2025  
**Estimated Time:** 2-3 hours  
**Goal:** Deploy complete database schema to Supabase

---

## Before We Start (5 minutes)

- [ ] Open Supabase dashboard: https://supabase.com/dashboard/project/mdspteohgwkpttlmdayn
- [ ] Have VS Code installed and ready
- [ ] Have the `data-schema.md` file open for reference
- [ ] Coffee/water ready ☕
- [ ] Set phone to Do Not Disturb

---

## Part 1: Database Schema Deployment (45 minutes)

### Step 1: Access Supabase SQL Editor
- [ ] Go to Supabase dashboard
- [ ] Click "SQL Editor" in left sidebar
- [ ] Click "New Query"

### Step 2: Create Core Tables
Run these SQL scripts in order (we'll do this together):

- [ ] Enable UUID extension
- [ ] Create `schools` table
- [ ] Create `athletes` table
- [ ] Create `courses` table
- [ ] Create `meets` table
- [ ] Create `results` table
- [ ] Create `personal_records` table
- [ ] Create `coach_schools` table

### Step 3: Create Indexes
- [ ] Add all performance indexes
- [ ] Verify indexes created (check table details)

### Step 4: Set Up Row Level Security
- [ ] Enable RLS on all tables
- [ ] Create public read policies
- [ ] Create coach write policies

### Step 5: Create Helper Functions
- [ ] `format_time()` function
- [ ] `parse_time()` function
- [ ] `check_if_pr()` trigger
- [ ] `generate_athlete_slug()` trigger

---

## Part 2: Insert Initial Data (20 minutes)

### Insert Westmont School Record
- [ ] Run SQL to insert Westmont High School
- [ ] Verify school appears in `schools` table

### Insert Sample Course Data
- [ ] Crystal Springs 5K
- [ ] Baylands 5K
- [ ] Toro Park 3 Mile
- [ ] Verify courses appear in `courses` table

### Create Test Athlete (Optional)
- [ ] Insert one test athlete
- [ ] Verify athlete appears with auto-generated slug

---

## Part 3: Local Development Setup (30 minutes)

### Install Tools (if not already done)
- [ ] Node.js 20.x LTS installed
- [ ] Python 3.11+ installed
- [ ] VS Code installed

### Create Project Directory
```bash
mkdir ~/manaxc
cd ~/manaxc
```

### Get Supabase Credentials
- [ ] Copy Project URL: https://mdspteohgwkpttlmdayn.supabase.co
- [ ] Get anon key from Supabase → Settings → API
- [ ] Get service role key (keep SECRET!)

### Create .env.local File
```bash
# In ~/manaxc directory
touch .env.local
```

Add this content:
```
NEXT_PUBLIC_SUPABASE_URL=https://mdspteohgwkpttlmdayn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[paste your anon key]
SUPABASE_SERVICE_ROLE_KEY=[paste your service role key]
```

- [ ] .env.local file created
- [ ] API keys added to file
- [ ] File saved

---

## Part 4: Test Database Connection (20 minutes)

### Option A: Using Supabase Dashboard
- [ ] Go to Table Editor
- [ ] Click on `schools` table
- [ ] See Westmont record
- [ ] Try inserting a test athlete manually

### Option B: Using SQL (More Technical)
- [ ] Open SQL Editor
- [ ] Run: `SELECT * FROM schools;`
- [ ] Should see Westmont
- [ ] Run: `SELECT * FROM courses;`
- [ ] Should see 3+ courses

---

## Part 5: Documentation (15 minutes)

### Update Daily Log
- [ ] Open `progress/daily-log.md`
- [ ] Add Day 2 entry with what we accomplished
- [ ] Note any blockers or questions

### Update Service Registry (if needed)
- [ ] Add any new credentials
- [ ] Note database URL and access info

### Take Screenshots
- [ ] Supabase table view (shows our tables)
- [ ] Sample data in `schools` table
- [ ] Save to `~/manaxc/screenshots/day-2/`

---

## Success Criteria ✅

By end of Day 2, you should have:

- [ ] All database tables created in Supabase
- [ ] Westmont school record exists
- [ ] At least 3 course records exist
- [ ] Row Level Security configured
- [ ] Helper functions and triggers created
- [ ] Can view tables in Supabase dashboard
- [ ] .env.local file with API keys
- [ ] Daily log updated

---

## If You Get Stuck

**Database errors?**
- Check Supabase logs: Dashboard → Logs
- Most common issue: Foreign key constraint violations
- Solution: Create tables in correct order

**Can't connect to Supabase?**
- Verify project URL is correct
- Check API key is copied completely (no spaces)
- Try accessing dashboard first to verify project is active

**VS Code issues?**
- Try restarting VS Code
- Check extensions are installed
- Ensure you're in the right directory

**General confusion?**
- Take a break, come back in 10 minutes
- Review the database schema document
- Ask Claude: "I'm stuck on [specific issue]"

---

## Celebrate When Done! 🎉

Once you check off all the items above, you'll have:
- A working database with real schema
- Data you can query and modify
- Foundation for building the web app
- Completed 2/30 sprint days (6.7% done!)

**Tomorrow (Day 3), we'll build the Athletic.net scraper to import real Westmont data.**

---

## Time Breakdown

- Database deployment: 45 min
- Initial data: 20 min
- Local setup: 30 min
- Testing: 20 min
- Documentation: 15 min
- **Total: 2 hours 10 minutes**

Add buffer for learning/questions: **Plan for 3 hours total**

---

## Pro Tips

1. **Save your work frequently** - After each table creation, check it worked
2. **Copy SQL to a file** - Save all SQL you run to `~/manaxc/database-setup.sql`
3. **Screenshot everything** - You'll want to remember how you did this
4. **Don't rush** - Better to understand than to move fast
5. **Ask questions** - Claude is here to help, no question is too basic

---

**Ready to start Day 2?**

Say to Claude: **"Let's start Day 2 - I'm ready to set up the database!"**

🚀 Let's build this thing!
