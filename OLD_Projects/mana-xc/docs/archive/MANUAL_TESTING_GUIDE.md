# Manual Testing Guide - Import Wizard

This guide will walk you through manually testing the import wizard in your browser.

---

## Prerequisites

### 1. Servers Running
Open two terminal windows:

**Terminal 1 - Backend (Django):**
```bash
cd ~/mana-xc
source .venv/bin/activate
python manage.py runserver
```
Should see: `Starting development server at http://127.0.0.1:8000/`

**Terminal 2 - Frontend (Next.js):**
```bash
cd ~/mana-xc
npm run dev
```
Should see: `Ready in XXXXms` and `Local: http://localhost:3000`

### 2. Test CSV File Ready
The test file is located at: `/Users/ron/mana-xc/2025_0911_STAL_test.csv`

This file contains:
- 55 total athletes
- 6 distinct races
- Columns: Place, Athlete, School, Time, Gender, Race

---

## Step-by-Step Testing Procedure

### Step 1: Access Import Wizard

1. Open your web browser (Chrome, Firefox, Safari, etc.)
2. Navigate to: **http://localhost:3000/admin/import**
3. You should see a modern dark-themed page with the title "Import Meet Results"
4. Verify the 5-step progress indicator is visible at the top

**Expected Result:**
- Page loads without errors
- Step 1 is highlighted in blue with a ring glow
- Steps 2-5 are gray
- Form shows three input fields: Meet Name, Date, Location

---

### Step 2: Enter Meet Information

1. **Meet Name:** Type `STAL Invitational`
2. **Date:** Click the date picker and select `September 11, 2025` (or type `2025-09-11`)
3. **Location (Optional):** Type `Montgomery Hill Park`
4. Click the blue **"Continue to File Upload"** button

**Expected Result:**
- Form validates (all required fields filled)
- Progress indicator advances to Step 2
- Step 1 now shows a green checkmark
- Step 2 is now highlighted in blue

---

### Step 3: Upload CSV File

#### Option A: Drag & Drop
1. Open Finder and navigate to `/Users/ron/mana-xc/`
2. Find the file `2025_0911_STAL_test.csv`
3. Drag the file onto the upload zone (should highlight when you hover over it)
4. Drop the file

#### Option B: Browse
1. Click the **"Browse"** button
2. Navigate to `/Users/ron/mana-xc/`
3. Select `2025_0911_STAL_test.csv`
4. Click **"Open"**

**Expected Result:**
- File preview card appears showing:
  - File name: `2025_0911_STAL_test.csv`
  - File size: ~X KB
  - Status: "CSV file selected"
- **"Parse & Continue"** button becomes enabled (blue)

5. Click **"Parse & Continue"** button

**Expected Result:**
- Brief loading spinner appears
- Progress indicator advances to Step 3
- Step 2 now shows a green checkmark
- Step 3 is now highlighted in blue
- Console may show: "Parser complete: 55 athlete results found"

---

### Step 4: Map CSV Columns

This step maps your CSV columns to database fields.

**What You Should See:**

1. **Completion Tracker:** Top right shows `3/3` or `5/5` Required fields
2. **Blue Info Box:** "Full Name Detected" message appears
3. **CSV Columns Preview:** Pills showing `Place`, `Athlete`, `School`, `Time`, `Gender`, `Race`
4. **Required Fields Section:**
   - Full Name (or First Name + Last Name)
   - School Name
   - Time (MM:SS.CC)
   All should have **green borders** (auto-mapped)

5. **Optional Fields Section:**
   - Place Overall
   - Race Category
   - Gender
   - Grade
   Some may be auto-mapped (green) if detected

**Verify Auto-Mapping:**
Check that the dropdowns show:
- Full Name → `Athlete` ✅
- School Name → `School` ✅
- Time → `Time` ✅
- Place Overall → `Place` ✅
- Race Category → `Race` ✅
- Gender → `Gender` ✅

**Expected Result:**
- All required fields have green borders
- Completion tracker shows 100%
- **"Continue to Race Config"** button is enabled (blue, not grayed out)

6. Click **"Continue to Race Config"** button

**Expected Result:**
- Progress indicator advances to Step 4
- Step 3 now shows a green checkmark
- Step 4 is now highlighted in blue

---

### Step 5: Configure Races

This step groups your results into distinct races and lets you configure each one.

**What You Should See:**

Header text: `We found 6 distinct races in your file`

**Six Race Cards:**

1. **Varsity Boys**
   - Athletes: 10
   - Category badge: "2.74 Miles Varsity"
   - Course dropdown (default: Select course...)
   - Distance: 4409 meters (default)

2. **Varsity Girls**
   - Athletes: 10
   - Category badge: "2.74 Miles Varsity"
   - Course dropdown
   - Distance: 4409 meters

3. **JV Boys** (may say "Varsity Boys" - known issue)
   - Athletes: 10
   - Category badge: "2.74 Miles Junior Varsity"
   - Course dropdown
   - Distance: 4409 meters

4. **JV Girls** (may say "Varsity Girls" - known issue)
   - Athletes: 10
   - Category badge: "2.74 Miles Junior Varsity"
   - Course dropdown
   - Distance: 4409 meters

5. **Reserves Boys**
   - Athletes: 10
   - Category badge: "2.74 Miles Reserves"
   - Course dropdown
   - Distance: 4409 meters

6. **Reserves Girls**
   - Athletes: 5
   - Category badge: "2.74 Miles Reserves"
   - Course dropdown
   - Distance: 4409 meters

**Action Items:**

For each race (or at least one for testing):
1. **Course:** Select a course from the dropdown (e.g., "Montgomery Hill Park" if available)
   - If no courses appear, this is expected (database not populated)
   - You can skip this for now
2. **Distance:** Verify it shows `4409` (meters for 2.74 miles)
3. **Rating:** Leave the checkbox unchecked (default rating 1.000)

7. Click **"Continue to Final Validation"** button

**Expected Result:**
- Progress indicator advances to Step 5
- Step 4 now shows a green checkmark
- Step 5 is now highlighted in blue

---

### Step 6: Final Validation & Import

This is the final review before importing data to the database.

**What You Should See:**

**Summary Cards:**
1. **Database** icon card
   - Meet: STAL Invitational
   - Date: September 11, 2025
   - Location: Montgomery Hill Park

2. **Trophy** icon card
   - Total Races: 6
   - Total Athletes: 55
   - Season Year: 2025

3. **FileCheck** icon card
   - Upload Status: Complete
   - Parser Status: Valid

**Validation Checklist:**
- ✅ Meet information complete
- ✅ All required columns mapped
- ✅ Races configured and grouped
- ✅ XX valid athlete results found

**Status Indicator:**
- Color: Green or Blue
- Text: "Ready to Import" or "All checks passed"

**Action:**

8. Click the **"Execute Import"** button

---

### Step 7: Expected Outcomes

#### If Database IS Configured (Supabase connected):

**Expected Result:**
- Loading spinner appears
- Import executes
- Success animation appears (trophy icon)
- Green success message: "Import completed successfully!"
- Meet ID displayed: `Meet ID: 12345`
- **"Import Another Meet"** button appears

**Verify in Database:**
```sql
-- Should return 55
SELECT COUNT(*) FROM results;

-- Should return 6
SELECT COUNT(*) FROM races WHERE meet_id = [the returned meet_id];

-- Should return distinct athlete count
SELECT COUNT(DISTINCT athlete_id) FROM results;

-- Should show normalized times
SELECT * FROM athlete_xc_times_v3 LIMIT 10;
```

#### If Database IS NOT Configured (Supabase not connected):

**Expected Result:**
- Error message appears (red background)
- Text: "Unauthorized" or "Cannot connect to database" or similar
- **This is expected if you haven't set up Supabase yet**

**What This Means:**
- The frontend is working correctly
- The parser, mapping, and grouping all succeeded
- You need to set up the Supabase database to complete the test

---

## Troubleshooting

### Issue: Step 3 shows "0/5 Required fields"

**Cause:** Auto-mapping failed
**Fix:**
1. Manually select each CSV column from the dropdowns
2. Ensure you map either "Full Name" OR both "First + Last Name"
3. Map "School Name" and "Time"

### Issue: Step 4 shows "0 distinct races"

**Cause:** Race category or gender not detected
**Fix:**
1. Go back to Step 3
2. Make sure "Race Category" is mapped to the "Race" column
3. Make sure "Gender" is mapped to the "Gender" column
4. Click "Continue" again

### Issue: "Cannot read property of undefined" error

**Cause:** Data not passing between steps correctly
**Fix:**
1. Refresh the page (http://localhost:3000/admin/import)
2. Start from Step 1 again
3. Check browser console (F12) for specific error details

### Issue: Import fails with "Unauthorized"

**Cause:** Supabase authentication not configured
**Expected:** This is normal if database isn't set up yet
**Next Steps:** See "Database Setup Requirements" below

---

## Database Setup Requirements

To complete the full end-to-end import test, you need:

### 1. Create Supabase Project
1. Go to https://supabase.com
2. Sign up / Log in
3. Create a new project
4. Wait for database to provision (~2 minutes)

### 2. Configure Environment Variables
Create a file `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Create Database Schema
Execute the SQL from `docs/DATA_ARCHITECTURE_V2.4.md`:
- Create tables: athletes, schools, meets, courses, races, results
- Create materialized view: athlete_xc_times_v3
- Create RPC function: admin_import_meet_results

### 4. Create Admin User
1. Sign up via Supabase auth UI
2. Insert into user_profiles: `INSERT INTO user_profiles (user_id, role) VALUES ('your-user-id', 'admin');`

### 5. Restart Next.js Server
```bash
# In Terminal 2
Ctrl+C (to stop)
npm run dev (to restart)
```

---

## Success Criteria

✅ **Frontend Test Passed If:**
- All 5 steps load without errors
- CSV uploads successfully
- Auto-mapping detects all columns
- 6 races are detected and displayed
- Form validation works correctly
- UI is responsive and professional

✅ **Full End-to-End Test Passed If:**
- Import executes without errors
- Database shows 55 results
- Database shows 6 races
- Athlete names are split correctly
- Times are stored as centiseconds
- Materialized view refreshes

---

## Next Session Checklist

After completing manual testing:

- [ ] Did the import wizard load correctly?
- [ ] Did all 5 steps advance properly?
- [ ] Did auto-mapping detect all columns?
- [ ] Were 6 races detected in Step 4?
- [ ] Did the import execute (or fail with expected auth error)?
- [ ] Document any bugs or unexpected behavior
- [ ] Note any UX improvements needed
- [ ] Update PROJECT_STATUS_REPORT.md with results

---

## Contact/Support

If you encounter issues not covered here:
1. Check browser console (F12 → Console tab)
2. Check Next.js terminal output (Terminal 2)
3. Review TEST_PHASE_A_RESULTS.md for known issues
4. Check docs/AI_CONTEXT_LOADER.md for context

---

**Good luck with testing! The frontend is ready and waiting for you to try it out.**
