# DO THIS NEXT - Session Startup Guide

## Quick Start (MacBook Air)

### Step 1: Open VS Code
1. Open **Visual Studio Code**
2. File → Open Folder → Navigate to `/Users/ron/mana-xc`
3. Open this folder in VS Code

### Step 2: Open Terminals

**You will need TWO terminal windows.**

**Option A: Use VS Code Integrated Terminal (RECOMMENDED)**
1. In VS Code, press `` Ctrl + ` `` (backtick) to open integrated terminal
2. Click the `+` icon to open a second terminal
3. Use the terminal selector dropdown to switch between them

**Option B: Use Separate Terminal App**
1. Open Terminal app on Mac
2. Create two tabs (Cmd+T for new tab)
3. Navigate both to `/Users/ron/mana-xc` using `cd /Users/ron/mana-xc`

### Step 3: Start Backend (Terminal 1)

```bash
# Navigate to project directory (if not already there)
cd /Users/ron/mana-xc

# Activate Python virtual environment
source .venv/bin/activate

# Start Django backend
python3 manage.py runserver
```

**Expected output:**
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

**Leave this terminal running!**

---

### Step 4: Start Frontend (Terminal 2)

```bash
# Navigate to project directory (if not already there)
cd /Users/ron/mana-xc

# Start Next.js frontend
npm run dev
```

**Expected output:**
```
- Local:        http://localhost:3000
- Ready in 2.3s
```

**Leave this terminal running!**

---

### Step 5: Open Browser

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Admin Tools**: http://localhost:3000/admin/bulk-import

---

## What to Tell Claude in Next Session

Copy and paste this into Claude Code:

```
I'm ready to fix the Mana XC data quality issues. Please follow the plan in NEXT_SESSION_PRIORITY.md:

1. First, clean up the database by running FIX_DATA_IMPORT.sql in Supabase
2. Then fix the batch-import code in app/api/admin/batch-import/route.ts
3. After that, re-import the 2024 and 2025 data
4. Finally, verify the data quality

The servers are already running:
- Django on port 8000
- Next.js on port 3000

Let's start with Phase 1: Clean Database.
```

---

## Files to Review Before Starting

1. **NEXT_SESSION_PRIORITY.md** - Complete 70-minute fix plan
2. **IMPORT_FIXES_NEEDED.md** - All data quality issues documented
3. **FIX_DATA_IMPORT.sql** - SQL script to clean database
4. **SESSION_SUMMARY_OCT18.md** - What we accomplished last session

---

## Key URLs for Reference

- **GitHub Repository**: https://github.com/ron681/mana-xc
- **Supabase Project**: https://app.supabase.com/project/dvclmjqafooecutprclr
- **Supabase SQL Editor**: https://app.supabase.com/project/dvclmjqafooecutprclr/sql/new
- **Local Frontend**: http://localhost:3000
- **Local Backend**: http://localhost:8000
- **Bulk Import Page**: http://localhost:3000/admin/bulk-import
- **Scraper Dashboard**: http://localhost:3000/admin/scraper

---

## Troubleshooting

### If Django won't start:
```bash
# Make sure virtual environment is activated
source .venv/bin/activate

# Check if port 8000 is in use
lsof -i :8000

# If something is using it, kill it:
kill -9 <PID>
```

### If Next.js won't start:
```bash
# Check if port 3000 is in use
lsof -i :3000

# If something is using it, kill it:
kill -9 <PID>

# Or use a different port:
PORT=3001 npm run dev
```

### If you need to pull latest code from GitHub:
```bash
git status
git pull
```

---

## Critical Reminders

1. **DO NOT import data until the code is fixed!** The current import code has bugs that create bad data.
2. **Run FIX_DATA_IMPORT.sql first** to clean the database before re-importing.
3. **Follow NEXT_SESSION_PRIORITY.md exactly** - it's a 5-phase plan with verification steps.
4. **All times MUST be in centiseconds** - this is non-negotiable.
5. **Gender MUST be 'M' or 'F'** - not true/false boolean.

---

## Expected Timeline

- **Phase 1**: Clean Database (15 min)
- **Phase 2**: Fix Import Code (30 min)
- **Phase 3**: Re-import Data (10 min)
- **Phase 4**: Calculate Derived Fields (5 min)
- **Phase 5**: Verify Data Quality (10 min)

**Total: ~70 minutes**

---

## Success Criteria

After completing the fixes, you should be able to:

1. ✅ Query fastest Westmont athletes
2. ✅ Compare 2024 vs 2025 performances
3. ✅ Analyze by course difficulty
4. ✅ Build optimal varsity lineup
5. ✅ Track year-over-year improvements

---

**Good luck! The foundation is solid, we just need to clean up the data pipeline.**

---

Generated: October 18, 2025
Status: Ready for data quality fixes
