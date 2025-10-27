# AI CONTEXT LOADER - CRITICAL STARTING FILE

## 🚨 MANDATORY CONVERSATION PROTOCOL

**START EVERY NEW CHAT WITH THIS PROMPT:**
"Search my Google Drive for 'Mana Running Documentation' and review the files **PROJECT_STATUS_REPORT.md**, **DATA_ARCHITECTURE_V2.4.md**, and **PHASE_0_MVP_BLUEPRINT.md** before answering. Summarize the last completed task and state the immediate next priority. Ensure strict adherence to the CENTISECONDS rule and the Hybrid Database model."

---

## 📅 LATEST SESSION UPDATE (October 17, 2025)

**CRITICAL ACCOMPLISHMENTS:**
1. ✅ **Enhanced CSV Parser** - Added full name splitting capability for Athletic.net format
2. ✅ **Complete UI Redesign** - Modern, professional interface for all 5 import wizard steps
3. ✅ **Visual Progress System** - Step tracker with checkmarks and status indicators
4. ✅ **Drag & Drop Upload** - Enhanced file handling with visual feedback
5. ✅ **Auto-Detection** - Smart field mapping with completion tracking
6. ✅ **Race Grouping** - Automatic detection by category/gender from CSV

**FILES UPDATED:**
- `lib/admin/import-parser.ts` - Enhanced parser with name splitting
- `lib/admin/import-utils.ts` - Race grouping logic
- All 5 import step components (Step1-Step5) - Complete UI redesign
- `app/admin/import/page.tsx` - Progress bar and modern layout

**NEXT PRIORITY:** Execute Test Phase A with sample CSV (2025_0911_STAL_1.csv)

---

## 🎯 PROJECT CORE CONTEXT

| Category | Value | Source/Rationale |
| :--- | :--- | :--- |
| **Current Name** | **Mana XC** (Domain: ManaXC.com) | Strategic transition from Mana-Running |
| **Core USP** | Fusing **Official Race Results** with **Wearable Training Data** using Evidence-Based AI (RAG) | Defensible data moat |
| **Architecture** | **Modular Monolith** (Python/Django/Next.js) evolving to Microservices | Prioritizes fast startup while planning for scale |
| **Database Model**| **NON-NEGOTIABLE Hybrid Strategy:** PostgreSQL (Relational) + **TimescaleDB** (Time-Series) | Essential for handling millions of race results AND billions of granular workout data points |
| **AI Strategy** | **Retrieval-Augmented Generation (RAG)** over Fine-Tuning. Provider-agnostic abstraction layer. | Ensures evidence-based, citable advice, building user trust |
| **Development** | **Structured "AI Copilot" Workflow.** Developer is the Architect; AI is the pair programmer. **All AI code must be reviewed.** | Mitigates prior issues with architectural naïveté and syntax errors |

---

## 🔧 DEVELOPER ENVIRONMENT NOTE (MANDATORY CONTEXT)

**Platform:** Macbook Air (zsh)  
**Python:** All commands require virtual environment activation (`source .venv/bin/activate`)  
**Node:** v18+ recommended for Next.js 14  
**Servers:**
- Backend: `python manage.py runserver` (port 8000)
- Frontend: `npm run dev` (port 3001)

**Recent Issues Resolved:**
- ✅ Syntax errors in UI components (corrupted escape codes)
- ✅ Switch component dependency in Step 4 (replaced with checkbox)
- ✅ CSV parser unable to handle full names (added splitFullName function)
- ✅ Race grouping not working (added race category detection)

---

## 🎯 CRITICAL DATA RULES

### CENTISECONDS RULE (NON-NEGOTIABLE)
- **Storage:** All race times MUST be stored in CENTISECONDS
- **Field Name:** `time_cs` in results table
- **Conversion:** 15:30.00 = 93000 centiseconds
- **Display:** Always divide by 100 for user display
- **Parser:** Enhanced parser converts MM:SS.CC → centiseconds automatically

### MATERIALIZED VIEW
- **Name:** `athlete_xc_times_v3`
- **Purpose:** Normalized XC PR using course rating factor
- **Refresh:** Required after data changes: `REFRESH MATERIALIZED VIEW athlete_xc_times_v3;`
- **Location:** Backend service includes refresh command in import logic

---

## 📦 IMPORT WIZARD ENHANCEMENTS (Oct 17, 2025)

### Parser Capabilities
```typescript
// Enhanced features:
- splitFullName("Edward Innes") → {firstName: "Edward", lastName: "Innes"}
- splitFullName("Edgar Gomez Tapia") → {firstName: "Edgar", lastName: "Gomez Tapia"}
- parseGender("Boys") → true (male)
- parseGender("Girls") → false (female)
- parseTimeToCs("17:51.2") → 107120 (centiseconds)
- Auto-detect race categories: Varsity, JV, Reserves
```

### UI Improvements
```
Step 1: Card-based inputs with icons (Trophy, Calendar, MapPin)
Step 2: Drag & drop zone with file preview and validation
Step 3: Visual field mapping with green borders on completion
Step 4: Beautiful race cards with gradient headers
Step 5: Summary dashboard with success celebration
```

### Auto-Detection
- Full name columns: "Athlete", "Name", "FullName"
- Time columns: "Time", "Duration"
- Place columns: "Place"
- School columns: "School"
- Gender columns: "Gender", "Sex"
- Race columns: "Race", "Category"

---

## 🧪 TESTING STATUS

### Test Phase A: Data Ingestion & Integrity
**Status:** READY TO EXECUTE  
**Test File:** `2025_0911_STAL_1.csv`  
**Expected Results:**
- 191 athlete results parsed
- 6 races detected (Varsity/JV/Reserves × Boys/Girls)
- Full names split correctly
- Times converted to centiseconds
- All data inserted into PostgreSQL
- Materialized view refreshed

**Test Steps:**
1. Navigate to `http://localhost:3001/admin/import`
2. Step 1: Enter "STAL Invitational", date "2025-09-11", "Montgomery Hill Park"
3. Step 2: Upload CSV (drag & drop or browse)
4. Step 3: Verify auto-mapping (should be 5/5 complete)
5. Step 4: Review 6 race cards with athlete counts
6. Step 5: Execute import
7. Validate: Query database for 191 results

### Test Phase B: Rating Change Validation
**Status:** PENDING (awaits Phase A completion)

---

## 🎨 UI/UX PHILOSOPHY

**Design Principles:**
- **Modern Dark Theme** - Gradient backgrounds, professional aesthetics
- **Visual Feedback** - Green borders for success, red for errors
- **Progressive Enhancement** - Progress bars, checkmarks, status indicators
- **Responsive Design** - Works on desktop, tablet, mobile
- **User Confidence** - Clear messaging, completion tracking, success celebrations

**Color Scheme:**
- Primary: Blue-600 (active states)
- Success: Green-600 (completed items)
- Warning: Yellow-600 (overrides, alerts)
- Error: Red-600 (validation failures)
- Backgrounds: Gray-900/800 gradients

---

## 📚 DOCUMENTATION STRUCTURE

**Core Files:**
1. `AI_CONTEXT_LOADER.md` - This file (start here every session)
2. `PROJECT_STATUS_REPORT.md` - Living log of progress
3. `DATA_ARCHITECTURE_V2.4.md` - Database schema and rules
4. `PHASE_0_MVP_BLUEPRINT.md` - Feature roadmap and testing
5. `MANA_XC_MASTER_STRATEGY.md` - Business strategy and vision

**Location:** All files stored in Google Drive folder "Mana Running Documentation"

---

## ⚠️ COMMON PITFALLS TO AVOID

1. **Never forget CENTISECONDS** - All time storage must use centiseconds
2. **Always refresh materialized view** - After data changes
3. **Check parser logic** - Verify name splitting and time conversion
4. **Test auto-detection** - May not work for all CSV formats
5. **Validate before import** - Catch errors early in the wizard
6. **Use proper file paths** - Check imports work correctly

---

## 🚀 IMMEDIATE NEXT ACTIONS

1. **Execute Test Phase A** - Validate entire import pipeline
2. **Fix any import bugs** - Based on test results
3. **Complete Test Phase B** - Rating change validation
4. **Deploy to staging** - Once both test phases pass
5. **User acceptance testing** - Get coach feedback

---

## 💡 SESSION HANDOFF TEMPLATE

When ending a session, update this section:

**Last Completed:**
- Enhanced CSV parser with full name splitting
- Complete UI redesign of import wizard (all 5 steps)
- Visual progress tracking and status indicators
- Drag & drop file upload
- Auto-detection and field mapping enhancements

**Current Blockers:**
- None - Ready for Test Phase A

**Next Developer Actions:**
1. Test import wizard with sample CSV
2. Verify database insertion
3. Check materialized view refresh
4. Document any issues found

---

## 🔗 QUICK REFERENCE LINKS

**Local Development:**
- Frontend: http://localhost:3001
- Import Wizard: http://localhost:3001/admin/import
- Backend API: http://localhost:8000
- Database: Supabase dashboard

**Key Commands:**
```bash
# Activate Python environment
source .venv/bin/activate

# Start backend
python manage.py runserver

# Start frontend
npm run dev

# Database refresh (in SQL editor)
REFRESH MATERIALIZED VIEW athlete_xc_times_v3;
```

---

**REMEMBER:** This file should be read at the START of every AI conversation to ensure context continuity and prevent knowledge loss between sessions.
