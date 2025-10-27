# End of Session Cleanup Guide for Claude Code

**Purpose**: Standardized procedure for Claude Code to follow when user requests session cleanup

**When to use**: User says "clean everything up to end a session" or similar end-of-session request

---

## 📋 Complete Cleanup Checklist

### 1. Review and Organize Root Directory (10 minutes)

**Goal**: Keep root directory clean with only active documentation and project config

**Steps:**
1. List all files in root directory: `ls -la /Users/ron/mana-xc/`
2. Categorize each file:
   - ✅ **Keep in root**: Active documentation, project config files
   - 📁 **Archive**: Completed session docs, superseded files
   - 🗂️ **Move to data/**: Data files, imports, test files

**What stays in root:**
- CLAUDE.md (project guide)
- NEXT_SESSION_START_HERE.md (session handoff)
- SCHEMA_MIGRATION_V*.sql (current migration script)
- Active methodology docs (COURSE_RATING_METHODOLOGY.md, etc.)
- Session summary for CURRENT session only
- Project config (package.json, tsconfig.json, next.config.js, etc.)
- .gitignore, .env files
- README.md (if exists)

**What to archive:**
- Old session summaries (SESSION_SUMMARY_*.md) → `docs/archive/`
- Superseded migration scripts → `docs/archive/`
- Completed planning docs (DO_THIS_NEXT.md, NEXT_SESSION_PRIORITY.md) → `docs/archive/`
- Old fix scripts (FIX_*.sql) → `docs/archive/`
- Test phase documentation → `docs/archive/`

**What to move to data/:**
- Import files (*.csv, *.json) → `data/imports/YYYY-[purpose]/`
- Test data files → `data/testing-archive/`
- Screenshots and HTML captures → `data/testing-archive/`

---

### 2. Update All Relevant Files (15 minutes)

**CLAUDE.md** - Update if architecture changed:
- [ ] Current development phase
- [ ] Port numbers (if changed)
- [ ] New features or tools added
- [ ] Known issues section
- [ ] Database schema version

**NEXT_SESSION_START_HERE.md** - Create or update:
- [ ] Include "Step 0: Launch Everything" with detailed instructions:
  - How to open VS Code
  - How to open integrated terminal (`` Ctrl + ` ``)
  - Terminal 1: Django backend (`source .venv/bin/activate && python3 manage.py runserver`)
  - Terminal 2: Next.js frontend (`npm run dev`)
  - Terminal 3: Claude Code workspace
  - How to verify servers are running
- [ ] Session Summary (what was accomplished this session)
- [ ] Files Created/Modified list
- [ ] Immediate Next Steps (6-step plan with time estimates)
- [ ] Success Metrics (what to verify after completion)
- [ ] Troubleshooting section
- [ ] File organization status
- [ ] Estimated timeline for next session

**data/README.md** - Update directory structure:
```markdown
data/
├── imports/
│   ├── 2024-test/
│   └── YYYY-production/
└── testing-archive/
```

---

### 3. Create Session Summary (20 minutes)

**File**: `SESSION_SUMMARY_[DATE].md` (e.g., SESSION_SUMMARY_OCT19.md)

**Required sections:**

```markdown
# Session Summary - [Month Day, Year]

## 🎯 Session Goals Achieved
- Primary Objective: [one sentence]
- Status: [Complete/In Progress/Blocked]

## ✅ Major Accomplishments
1. [Bullet list of key achievements]

## 📊 Import/Data Results (if applicable)
- Metrics: meets, races, results, athletes imported
- Data Quality: issues found and fixed

## 🔍 Critical Discoveries
- Key insights from this session
- Issues identified
- Architectural decisions made

## 🏗️ Architecture Enhancements Designed (if applicable)
- New tables created
- Schema improvements
- Performance optimizations

## 💡 Strategic Insights (if applicable)
- Competitive differentiators
- Product positioning insights

## 📁 Files Created/Modified
### New Files:
- filename.ext - description

### Modified Files:
- filename.ext - what changed

### Archived Files:
- filename.ext → docs/archive/ (reason)

## 🚀 Next Session Readiness
### Remaining Tasks:
1. [ ] Task with time estimate
2. [ ] Task with time estimate

### Expected Results:
- What should be accomplished
- Success metrics

## 🎓 Key Learnings
- Technical insights
- Process improvements
- Things to avoid

## ✅ Success Criteria Met
- [x] Criterion 1
- [x] Criterion 2

## 🏁 Session Status: [COMPLETE/IN PROGRESS]

**Repository**: https://github.com/ron681/mana-xc
**Latest commit**: [hash] - "[message]"

---

Generated: [Date]
Session Duration: [time]
Phase: [current phase]
```

---

### 4. Organize Files into Archive (5 minutes)

**Move completed session docs:**
```bash
# Example commands (adjust dates/names as needed)
mv SESSION_SUMMARY_OCT18.md docs/archive/
mv DO_THIS_NEXT.md docs/archive/
mv NEXT_SESSION_PRIORITY.md docs/archive/
mv FIX_DATA_IMPORT.sql docs/archive/
mv FIX_DATA_IMPORT_V2.sql docs/archive/
```

**Move data files:**
```bash
# Create organized directories
mkdir -p data/imports/2024-test
mkdir -p data/testing-archive

# Move import files
mv athletic-net-1076-2024.csv data/imports/2024-test/
mv athletic-net-1076-2024.json data/imports/2024-test/

# Move test files
mv test-parser.js data/testing-archive/
mv all-results-*.* data/testing-archive/
mv *.png data/testing-archive/
mv *.html data/testing-archive/
```

**Update .gitignore** if needed to keep root clean:
```
# Scraped data files in root
/athletic-net-*.csv
/athletic-net-*.json

# Test files
*.png
*.html
```

---

### 5. Verify Root Directory is Clean (2 minutes)

**Expected files in root:**
- Active documentation (8-12 .md files)
- Current migration script (SCHEMA_MIGRATION_V*.sql)
- Project config (package.json, tsconfig.json, next.config.js, etc.)
- Environment files (.env, .gitignore)
- Django files (manage.py, db.sqlite3)

**Run verification:**
```bash
ls -la /Users/ron/mana-xc/
```

**Should NOT see:**
- Old session summaries (except current)
- Multiple fix scripts
- CSV/JSON data files
- Test files (.html, .png)
- Completed planning docs

---

### 6. Git Commit and Push (5 minutes)

**Standard commit procedure:**

1. **Stage all changes:**
```bash
git add -A
```

2. **Create comprehensive commit message:**
```bash
git commit -m "$(cat <<'EOF'
[One-line summary of session work]

Major Changes:
- [Key change 1]
- [Key change 2]
- [Key change 3]

[Section for new files]:
- filename.ext - description
- filename.ext - description

[Section for modifications]:
- filename.ext - what changed
- filename.ext - what changed

[Section for organization]:
- Moved X files to docs/archive/
- Organized data files to data/imports/
- Created SESSION_SUMMARY_[DATE].md

Documentation Updates:
- Enhanced NEXT_SESSION_START_HERE.md with [details]
- Updated CLAUDE.md with [changes]
- Organized root directory for clean handoff

Repository Status: [Clean/Ready for next session/etc.]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

3. **Push to GitHub:**
```bash
git push
```

4. **Verify clean status:**
```bash
git status
```

Expected output: `nothing to commit, working tree clean`

---

## 🎯 Session Handoff Documentation Requirements

### For User (NEXT_SESSION_START_HERE.md):

**Must include:**
1. **Step 0: Launch Everything** - Detailed VS Code and terminal setup
2. **Session Summary** - What was accomplished
3. **Immediate Next Steps** - 6-step plan with time estimates
4. **Files Created/Modified** - Complete list
5. **Troubleshooting** - Common issues and fixes
6. **Success Metrics** - What to verify after next session
7. **File Organization** - Where everything is located

### For Claude Code (This stays in conversation summary):

**Context to preserve:**
1. Technical decisions made this session
2. Schema changes and rationale
3. Bugs fixed and how
4. User preferences discovered (terminal setup, file organization)
5. Next session priorities
6. Known issues to watch for

---

## 📊 Quality Checklist

Before ending session, verify:

- [ ] Root directory contains only active files (8-12 .md files + config)
- [ ] All completed docs moved to docs/archive/
- [ ] All data files organized in data/ subdirectories
- [ ] NEXT_SESSION_START_HERE.md exists with Step 0
- [ ] SESSION_SUMMARY_[DATE].md created
- [ ] CLAUDE.md updated if architecture changed
- [ ] data/README.md reflects current structure
- [ ] All changes committed to git
- [ ] Changes pushed to GitHub
- [ ] `git status` shows clean working tree
- [ ] User has clear instructions for next session

---

## ⏱️ Time Estimates

- Review and organize root: 10 minutes
- Update documentation: 15 minutes
- Create session summary: 20 minutes
- Move files to archives: 5 minutes
- Verify cleanliness: 2 minutes
- Git commit and push: 5 minutes

**Total: ~60 minutes for complete cleanup**

---

## 🔄 Workflow Summary

```
1. User says: "clean everything up to end a session"
   ↓
2. Claude Code executes this checklist
   ↓
3. Reviews all files in root directory
   ↓
4. Archives completed docs → docs/archive/
   ↓
5. Organizes data files → data/imports/ or data/testing-archive/
   ↓
6. Updates CLAUDE.md (if needed)
   ↓
7. Creates/updates NEXT_SESSION_START_HERE.md (with Step 0!)
   ↓
8. Creates SESSION_SUMMARY_[DATE].md
   ↓
9. Updates data/README.md
   ↓
10. Verifies root directory is clean (8-12 files)
    ↓
11. Git: add -A → commit → push
    ↓
12. Confirms to user: "Session cleanup complete, repository ready"
```

---

## 📝 Example User Prompts That Trigger This

- "clean everything up to end a session"
- "let's wrap up this session"
- "organize files for next time"
- "prepare for handoff"
- "time to commit and push everything"

---

## ✨ Success Criteria

**A successful cleanup means:**
1. ✅ Root directory is organized (only active files)
2. ✅ All session work is documented (summary + handoff guide)
3. ✅ User has clear next-session startup instructions (with Step 0)
4. ✅ Future Claude Code has context via session summary
5. ✅ All changes committed and pushed to GitHub
6. ✅ Working tree is clean
7. ✅ Repository is ready for immediate next-session start

---

**Last Updated**: October 19, 2025
**Version**: 1.0
**Status**: Active standard for all future session cleanups
