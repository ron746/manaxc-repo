# MANA RUNNING - DOCUMENTATION INDEX

**Last Updated:** October 12, 2025

---

## 📋 ESSENTIAL DOCUMENTS (Start Here)

### 1. **PROJECT_CONTEXT.md** (⭐ START HERE)
**Quick reference for starting new Claude conversations**

Contains:
- Critical technical details (time storage format, environment)
- Recent completed work summary
- Pending priorities
- Developer communication requirements
- Quick commands and queries

**Use for:**
- Starting new Claude conversations
- Quick context refresh
- Communication style reference

---

### 2. **MANA_RUNNING_PROJECT_SUMMARY.md**
**Complete technical documentation**

Contains:
- Full project overview and goals
- Complete technical architecture
- Database structure and relationships
- Scalability requirements and best practices
- Known issues and troubleshooting
- Common queries and patterns

**Use for:**
- Deep technical understanding
- Architecture decisions
- Comprehensive troubleshooting
- Onboarding developers

---

### 3. **IMMEDIATE_ACTION_ITEMS.md**
**Current priorities and task checklist**

Contains:
- ✅ Completed items with dates
- 🔴 Critical tasks (do today)
- 🟡 Important tasks (do this week)
- 🟢 Nice to have tasks (do this month)
- Verification checklists

**Use for:**
- Sprint planning
- Task prioritization
- Tracking progress

---

### 4. **QUICK_REFERENCE.md**
**Daily commands and queries cheat sheet**

Contains:
- Essential links
- Quick commands (dev, database, deployment)
- Common SQL queries
- Troubleshooting steps
- File paths

**Use for:**
- Day-to-day development
- Quick command lookup
- Common query templates

---

## 📚 SUPPORTING DOCUMENTATION

### 5. **DATABASE_SCALABILITY.md**
**Performance and scalability guidelines**

Contains:
- Core scalability principles
- Fetch-and-filter anti-pattern examples
- SQL function patterns
- Performance benchmarks
- Required database functions

**Use for:**
- Writing scalable queries
- Understanding performance best practices
- Adding new features that query data

---

### 6. **MANA_RUNNING_ROADMAP.md**
**Feature planning and project roadmap**

Contains:
- Current issues and backlog
- Completed features
- Technical debt tracking
- Future feature planning

**Use for:**
- Long-term planning
- Feature prioritization
- Tracking technical debt

---

### 7. **README.md**
**GitHub repository documentation**

Contains:
- Project overview
- Quick start instructions
- Tech stack
- Development workflow

**Use for:**
- GitHub repository root
- New developer onboarding
- Public project introduction

---

## 🗄️ REFERENCE FILES

### 8. **merge_athlete_duplicates.sql**
**Historical reference - Athlete deduplication script**

- ✅ Already executed (October 2025)
- Removed 1,328 duplicate athletes
- Keep for reference only - DO NOT run again

---

### 9. **schema-changelog.md**
**Database schema changes log**

- Documents all schema modifications
- Critical issue tracking
- Migration history

**Update when:**
- Schema changes made
- Critical issues identified
- Indexes added/modified

---

## 🎯 RECOMMENDED READING ORDER

### For New Developers:
1. **PROJECT_CONTEXT.md** - Get oriented quickly
2. **README.md** - Understand the project
3. **QUICK_REFERENCE.md** - Learn daily commands
4. **MANA_RUNNING_PROJECT_SUMMARY.md** - Deep dive

### For Quick Context in New Chat:
1. **PROJECT_CONTEXT.md** - Has everything you need to start

### For Database Work:
1. **DATABASE_SCALABILITY.md** - Understand principles
2. **MANA_RUNNING_PROJECT_SUMMARY.md** - Database structure
3. **QUICK_REFERENCE.md** - Common queries

### For Feature Planning:
1. **IMMEDIATE_ACTION_ITEMS.md** - Current priorities
2. **MANA_RUNNING_ROADMAP.md** - Long-term vision

---

## 🔄 WHAT CHANGED FROM OLD DOCS

### ✅ Documents Consolidated (Removed/Merged):
- CLIENT_COMPONENT_IMPLEMENTATION_GUIDE.md → Completed, removed
- IMPLEMENTATION_GUIDE.md → Completed, removed
- IMPLEMENTATION_STARTER_GUIDE.md → No longer needed
- RACE_PARTICIPANTS_FIX.md → Merged into IMMEDIATE_ACTION_ITEMS.md
- NEW_CONVERSATION_STARTER.txt → Merged into PROJECT_CONTEXT.md
- PROJECT_INSTRUCTIONS_UPDATED.txt → Merged into PROJECT_CONTEXT.md
- team_performance_diagnostic.sql → Debugging, removed
- team_performance_with_debugging.tsx → Debugging, removed

### ✅ Documents Updated:
- PROJECT_CONTEXT.md - NEW, replaces multiple old docs
- MANA_RUNNING_PROJECT_SUMMARY.md - Updated with recent work
- IMMEDIATE_ACTION_ITEMS.md - Marked completed items, updated priorities
- QUICK_REFERENCE.md - Added recent changes
- MANA_RUNNING_ROADMAP.md - Updated completed features
- DOCUMENTATION_INDEX.md - Complete rewrite (this file)
- schema-changelog.md - Added October changes

### ✅ Documents Kept As-Is:
- DATABASE_SCALABILITY.md - Still relevant
- README.md - Minor updates only
- merge_athlete_duplicates.sql - Historical reference

---

## 📥 USING THESE DOCUMENTS

### In New Claude Conversations:
```
Search my Google Drive for "Mana Running Documentation" 
and review PROJECT_CONTEXT.md before answering.
```

### For Daily Work:
- Keep QUICK_REFERENCE.md open/printed
- Refer to IMMEDIATE_ACTION_ITEMS.md for priorities

### For Planning:
- Review IMMEDIATE_ACTION_ITEMS.md weekly
- Update MANA_RUNNING_ROADMAP.md monthly

---

## ✅ CURRENT PROJECT STATUS

**Database:**
- 4,477 unique athletes
- Unique constraint active
- 0 duplicate records
- 0 orphaned foreign keys

**Completed Recently:**
- ✅ Supabase auth migration (Oct 9)
- ✅ Database cleanup (Oct 2025)
- ✅ School records SQL functions (Oct 10-11)
- ✅ Individual records page deployed
- ✅ UI improvements (clickable links)

**Critical Pending:**
- 🔴 Fix race participant counts
- 🔴 Add duplicate prevention in code
- 🔴 Add database indexes
- 🟡 Complete team records page

---

## 🔗 KEY LINKS

**Production:** https://mana-running.vercel.app/  
**GitHub:** https://github.com/ron681/mana-running  
**Vercel Dashboard:** https://vercel.com/dashboard  
**Supabase Dashboard:** [Your project URL]

---

**Total Essential Documents:** 4  
**Supporting Documents:** 3  
**Reference Files:** 2  
**Total Size:** ~75KB (down from ~150KB)

**🎯 Start with PROJECT_CONTEXT.md for everything you need!**
