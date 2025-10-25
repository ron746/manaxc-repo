# Start Next Session: Quick Reference Guide

## 🚀 How to Start Your Next Claude Code Session

### Quick Start Command
```
I'm continuing the ManaXC project. The website is deployed at https://manaxc.com.
Please read SESSION-SUMMARY-2025-10-25.md, SESSION-UPDATE-2025-10-25-EVENING.md, and this file to understand where we are.
```

---

## ✅ Current Status (As of October 25, 2025 - Evening)

### What's Working
- ✅ **Website Live:** https://manaxc.com
- ✅ **Official Logo:** Mana XC tribal runner logo added
- ✅ **Hero Redesign:** Modern zinc/cyan color scheme
- ✅ **New Tagline:** "The Finish Line Starts Here"
- ✅ **GitHub Repo:** https://github.com/ron746/manaxc-website
- ✅ **Database:** Supabase connected and working
- ✅ **Deployments:** Automatic on git push to main
- ✅ **Local Dev:** npm run dev at http://localhost:3000

### What's NOT Done
- ❌ Only landing page exists (meets, schools, courses pages return 404)
- ❌ Database is mostly empty (1 school, 0 athletes, 0 results)
- ❌ No admin interface for data import
- ❌ No search or filtering features

---

## 📋 Recommended Next Steps (In Priority Order)

### Option A: Import Data First (Recommended)
**Why:** Get real data in the system to test the website properly

1. **Import First Race**
   - Use existing importers in `/code/importers/`
   - Start with Crystal Springs Varsity 2025
   - Reference: `SINGLE_RACE_IMPORT_PLAN.md`

2. **Verify Website Shows Data**
   - Check stats update on landing page
   - Trigger Cloudflare redeploy if needed

3. **Build Meet Detail Page**
   - Create `/meets/[id]/page.tsx`
   - Show race results, participants, times

### Option B: Build Pages First
**Why:** See the full site structure before importing data

1. **Create /meets Page**
   - List all meets from database
   - Sort by date descending
   - Link to detail pages

2. **Create /meets/[id] Detail Page**
   - Show meet information
   - List all races in the meet
   - Display results for each race

3. **Create /athletes/[id] Profile Page**
   - Show athlete information
   - List all results
   - Calculate PRs and statistics

### Option C: Build Admin Tools
**Why:** Make data import easier going forward

1. **Create Admin Import Interface**
   - Reference: `ADMIN_IMPORT_WORKFLOW.md`
   - Build step-by-step import wizard
   - Handle CSV upload and parsing

2. **Add Course Management**
   - CRUD for courses and venues
   - Difficulty rating interface
   - Course rating history

---

## 📁 Key Files to Reference

### Essential Documentation
```
/Users/ron/manaxc/manaxc-project/
├── SESSION-SUMMARY-2025-10-25.md          ← Read this first!
├── START-NEXT-SESSION.md                   ← You are here
├── CURRENT-STATUS.md                       ← Project status
├── WEBSITE_SETUP_PLAN.md                   ← Original website plan
└── code/importers/
    ├── ADMIN_IMPORT_WORKFLOW.md            ← Admin import design
    ├── SINGLE_RACE_IMPORT_PLAN.md          ← How to import one race
    ├── SCHEMA_COMPARISON.md                 ← Database schema info
    └── README.md                           ← Importer documentation
```

### Code Locations
```
/Users/ron/manaxc/manaxc-project/
├── website/                                 ← Next.js website code
│   ├── app/
│   │   ├── page.tsx                        ← Landing page
│   │   └── layout.tsx                      ← Root layout
│   ├── components/
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   └── lib/
│       └── supabase/
│           ├── client.ts                   ← Supabase connection
│           └── queries.ts                  ← Database queries
└── code/importers/                          ← Data import scripts
    ├── import_westmont_excel.py            ← Excel importer
    └── athletic-net-scraper-v3.js          ← Athletic.net scraper
```

---

## 🔧 Development Commands

### Website Development
```bash
cd /Users/ron/manaxc/manaxc-project/website

# Start development server
npm run dev

# Build for production (test locally)
npm run build

# Git workflow
git add .
git commit -m "Your message"
git push  # Auto-deploys to Cloudflare Pages
```

### Data Import
```bash
cd /Users/ron/manaxc/manaxc-project/code/importers

# Activate Python virtual environment
source venv/bin/activate

# Run Excel importer
python3 import_westmont_excel.py

# Run Athletic.net scraper
node athletic-net-scraper-v3.js
```

---

## 🗄️ Database Information

### Supabase Project
- **URL:** https://mdspteohgwkpttlmdayn.supabase.co
- **Dashboard:** https://supabase.com/dashboard
- **Project ID:** mdspteohgwkpttlmdayn

### Current Data
- **Schools:** 1 (Westmont High School)
- **Athletes:** 0
- **Courses:** 0
- **Meets:** 0
- **Races:** 0
- **Results:** 0
- **Difficulty Presets:** 6 (Fast, Easy, Average, Moderate, Hard, Slow)

### Tables Schema
```
schools          → athletes
venues           → courses → races → results
meets            → races
difficulty_presets
course_rating_history (optional)
```

---

## 🌐 Deployment Information

### Cloudflare Pages
- **Project:** manaxc-website
- **Dashboard:** https://dash.cloudflare.com/
- **Auto-Deploy:** ✅ On push to main branch
- **Build Command:** `npm run build`
- **Build Output:** `/out`

### URLs
- **Production:** https://manaxc.com
- **Latest Deploy:** https://07cacef7.manaxc-website.pages.dev
- **GitHub:** https://github.com/ron746/manaxc-website

---

## ⚠️ Important Notes

### Static Export Limitation
The website uses Next.js static export mode, which means:
- Data is fetched **client-side** (in the browser)
- Stats load after page renders (you see "Loading..." first)
- To update stats on homepage, need to rebuild/redeploy

### Hardcoded Credentials
Supabase credentials are hardcoded in `/website/lib/supabase/client.ts`:
- This is **intentional** and safe (anon key is designed to be public)
- Security comes from Supabase Row Level Security policies
- Don't try to use environment variables (they don't work in static export)

### GitHub Account
- Correct account: **ron746** (not ron681)
- Already authenticated via gh CLI
- Repository: https://github.com/ron746/manaxc-website

---

## 🎯 Suggested First Task for Next Session

**Recommended:** Start with Option A - Import Data First

```
Task: Import the Crystal Springs Varsity Boys 2025 race

Steps:
1. Read SINGLE_RACE_IMPORT_PLAN.md
2. Locate CSV file for Crystal Springs race
3. Run import script or manually process
4. Verify data in Supabase dashboard
5. Check if stats update on https://manaxc.com
6. If needed, trigger Cloudflare redeploy
```

**Why this task:**
- Tests the full data pipeline
- Gives real data to work with
- Validates database schema
- Shows actual stats on the website
- Confirms everything is working end-to-end

---

## 📞 Quick Help

### If website isn't loading:
1. Check Cloudflare Pages deployments
2. Look for build errors
3. Check latest deployment URL (changes each time)
4. Hard refresh browser (Cmd+Shift+R)

### If database queries fail:
1. Verify Supabase credentials in `website/lib/supabase/client.ts`
2. Check Supabase dashboard for table structure
3. Test queries in Supabase SQL editor
4. Check browser console for errors

### If git push fails:
1. Verify GitHub authentication: `gh auth status`
2. Check you're on main branch: `git branch`
3. Verify remote: `git remote -v` (should show ron746)

---

## 📝 Session Checklist

When starting a new session, Claude should:

- [ ] Read SESSION-SUMMARY-2025-10-25.md for context
- [ ] Read this file (START-NEXT-SESSION.md)
- [ ] Verify website is accessible at https://manaxc.com
- [ ] Check latest Cloudflare deployment status
- [ ] Review database current state
- [ ] Ask user which next step they want to tackle
- [ ] Reference relevant documentation files

---

## 🎉 Celebration Note

The website deployment was a **huge milestone**! The foundation is solid and ready for rapid feature development. Great work so far!

**Current State:** Production website deployed, database connected, ready for data and features.

**Next Milestone:** First race imported with full data showing on the website.

---

## Version Information

- **Last Updated:** October 25, 2025
- **Session:** Website Deployment Complete
- **Next Phase:** Data Import & Page Development
- **Status:** ✅ Ready for Next Session
