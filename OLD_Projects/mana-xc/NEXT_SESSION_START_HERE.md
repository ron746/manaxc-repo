# Next Session Start Here - October 21, 2025

## 📋 Session Summary

**Last Session (Oct 21)**: Successfully created clean landing page and fixed Tailwind CSS configuration. All pages now use colorblind-friendly light theme.

**Status**: Landing page complete, accessibility guidelines established, ready for feature development.

---

## 🚀 Step 0: Launch Everything

### Open VS Code
1. Navigate to `/Users/ron/mana-xc/`
2. Open VS Code: `code .` (or open from Applications)
3. VS Code will load the project workspace

### Open Terminals

**Option A: VS Code Integrated Terminal (Recommended)**
1. Press `` Ctrl + ` `` (backtick) to open integrated terminal
2. Click the `+` icon to create additional terminal tabs
3. You'll have all 3 terminals in one window

**Option B: Separate Terminal Windows**
1. Open Terminal app from Applications
2. Create 3 separate terminal windows (Cmd + N)
3. Navigate each to `/Users/ron/mana-xc/`

### Terminal 1: Next.js Frontend (Port 3000)
```bash
cd /Users/ron/mana-xc
npm run dev
```
**Expected output**: `✓ Ready in XXXXms` and `Local: http://localhost:3000`

### Terminal 2: Claude Code / Analysis Terminal
This terminal is reserved for Claude Code (if you use it) or for backend/admin/analysis tasks.

- Using Claude Code (CLI): if you have the Claude Code CLI installed, run it from the repo root to execute assistant-driven workflows or local commands. Example:
```bash
cd /Users/ron/mana-xc
claude-code
```
If the CLI is not installed or returns an error, use the Claude web UI instead (https://claude.ai/) and run the same prompts there.

- Alternative (no Claude): keep this terminal for ad-hoc admin tasks such as running the Node scraper, analytical scripts, or quick data queries. Examples:
```bash
# Run the Athletic.net scraper (Puppeteer)
node scripts/athletic-net-scraper-v2.js <schoolId> <season>

# Run an analysis helper (example)
node scripts/analyze-meet-page.js <file.html>
```

Keep this terminal open so you can paste prompts, run analysis commands, or execute import helpers without interrupting the frontend (Terminal 1) or backend (Terminal 3).

### Terminal 3: Django Backend (Port 8000)
Use this terminal to run the Django backend and related management tasks.

If you have a virtual environment already created (recommended):
```bash
cd /Users/ron/mana-xc
source .venv/bin/activate
python manage.py runserver
```

If you don't have a virtual environment yet, create and activate one first:
```bash
cd /Users/ron/mana-xc
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # if requirements.txt exists
python manage.py migrate
python manage.py runserver
```

**Expected output**: `Starting development server at http://127.0.0.1:8000/` and backend accessible at `http://localhost:8000`

### Verify Services Running
Open browser to:
- Frontend: http://localhost:3000 (should show landing page)
- API: http://localhost:3000/api/top-performances?gender=M (should return JSON)

**If services don't start:**
- Check ports: `lsof -ti:3000` (kill if needed: `kill -9 <PID>`)
- Clear Next.js cache: `rm -rf .next`
- Reinstall deps: `npm install`

---

## ✅ What Was Accomplished Last Session

### Major Achievements:
1. **Fixed Global Dark Theme** - Changed `globals.css` from black to white background
2. **Created Tailwind Configuration** - Added missing config files that were causing CSS to fail
3. **Built Clean Landing Page** - Minimal design at root (`/`) with mission statement and stats
4. **Simplified Header/Footer** - White theme with only working links
5. **Fixed School Roster** - Changed dark headers to light gray for colorblind accessibility
6. **Added Environment Variable** - `NEXT_PUBLIC_APP_URL=http://localhost:3000` (use this exact name for client-side code)
7. **Created Accessibility Guidelines** - Complete design system in `ACCESSIBILITY_GUIDELINES.md`

### Technical Fixes:
- Created `tailwind.config.js` and `postcss.config.js` (were missing!)
- Fixed `globals.css` body background from `#0d1117` (nearly black) to `#ffffff` (white)
- Removed root redirect so landing page shows at `/`
- Updated layout.tsx to not force Header/Footer on every page

---

## 📁 Files Created/Modified This Session

### New Files:
- `app/page.tsx` - Landing page
- `tailwind.config.js` - Tailwind config
- `postcss.config.js` - PostCSS config
- `components/layout/PageLayout.tsx` - Layout wrapper
- `ACCESSIBILITY_GUIDELINES.md` - Design system
- `SESSION_SUMMARY_OCT21.md` - This session's summary

### Modified Files:
- `app/globals.css` - White background
- `app/layout.tsx` - No forced Header/Footer
- `components/layout/Header.tsx` - White theme
- `components/layout/Footer.tsx` - Light gray theme
- `app/schools/[id]/roster/page.tsx` - Light headers
- `.env.local` - Added `NEXT_PUBLIC_APP_URL`
- `next.config.js` - Redirect removed; `experimental.esmExternals: false` kept to avoid module resolution issues

---

## 🎯 Immediate Next Steps (Priority Order)

### 1. Build Athlete Profile Page (10 hours) - HIGH PRIORITY
**Route**: `/app/athletes/[id]/profile/page.tsx`

**Requirements**:
- Individual athlete stats (name, school, grade, graduation year)
- XC Time PR (Crystal Springs equivalent)
- Track Mile PR (recruiting baseline)
- Season-by-season progression table
- Complete race history with dates, courses, times
- PR timeline chart (optional)

**Success Metrics**:
- Profile accessible from roster and top performances
- All athlete data displays correctly
- Season progression visible
- Times formatted in MM:SS.CC

### 2. Build Most Improved Page (6 hours) - MEDIUM PRIORITY
**Route**: `/app/most-improved/page.tsx`

**Requirements**:
- Season-over-season improvement rankings
- Filter by gender and grade
- Calculate percentage improvement
- Show previous year time vs current year time
- Highlight breakout performances (>10% improvement)

**Success Metrics**:
- Rankings show meaningful improvements
- Filters work correctly
- Yellow highlighting for top improvers
- Links to athlete profiles

### 3. Review All Pages for Accessibility (4 hours) - LOW PRIORITY
**Pages to Check**:
- `/app/top-performances/page.tsx`
- `/app/schools/[id]/roster/page.tsx` (already done)
- `/app/admin/**` pages
- Any other existing pages

**Checklist** (use ACCESSIBILITY_GUIDELINES.md):
- [ ] No dark backgrounds
- [ ] Text is gray-900 or gray-800 (never lighter)
- [ ] Highlights use yellow-50 background with yellow-500 border
- [ ] All buttons have 2px borders
- [ ] Links underline on hover
- [ ] Tables have light gray headers (bg-gray-100)

---

## 🎨 Design System (CRITICAL)

**User is colorblind - ALL pages must follow these rules:**

### Colors to Use:
- **Backgrounds**: White (`bg-white`), light gray (`bg-gray-50`, `bg-gray-100`)
- **Text**: Dark gray (`text-gray-900`, `text-gray-800`, `text-gray-700`)
- **Highlights**: Yellow (`bg-yellow-50` + `border-yellow-500`)
- **Borders**: Gray (`border-gray-200`, `border-gray-300`)
- **Buttons**: Dark gray (`bg-gray-800`) or outlined white (`bg-white border-gray-300`)

### Colors to NEVER Use:
- ❌ Black backgrounds (`bg-black`, `bg-gray-900` as background)
- ❌ Dark maroon/red backgrounds
- ❌ Blue backgrounds (except very light `bg-blue-50`)
- ❌ Light text (anything lighter than `text-gray-700`)

### Reference:
See `ACCESSIBILITY_GUIDELINES.md` for complete examples of buttons, tables, links, badges, etc.

---

## 🔧 Troubleshooting

### Tailwind CSS Not Working:
1. Check `tailwind.config.js` exists
2. Check `postcss.config.js` exists
3. Clear cache: `rm -rf .next`
4. Restart server: Kill terminals and restart

### Safari Not Showing Style Changes:
1. Hard refresh: `Cmd + Shift + R`
2. Clear cache: `Cmd + Option + E`, then refresh
3. Try incognito window: `Cmd + Shift + N`

### Environment Variable Errors:
1. Check `.env.local` exists
2. Verify `NEXT_PUBLIC_APP_URL=http://localhost:3000`
3. Restart Next.js server (env vars only load on startup)

### Port Already in Use:
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Quick QA: Lint, build, tests
Run these commands to validate the frontend and backend after changes.

Frontend (Next.js):
```bash
npm run lint
npm run build
```

Backend (Django - basic):
```bash
source .venv/bin/activate
python manage.py makemigrations
python manage.py migrate
python manage.py test
```

---

## 🎯 What to Tell Claude in Next Session

**Suggested prompt**:
"Read NEXT_SESSION_START_HERE.md and SESSION_SUMMARY_OCT21.md. I want to build the athlete profile page next. Make sure to follow ACCESSIBILITY_GUIDELINES.md for colorblind-friendly design - white backgrounds, dark text, yellow highlights only. The user is colorblind so this is critical."

---

**Last Updated**: October 21, 2025, 5:45 PM
**Status**: Ready for athlete profile development
**Next Priority**: Build `/app/athletes/[id]/profile/page.tsx`
