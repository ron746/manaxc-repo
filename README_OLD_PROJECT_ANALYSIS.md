# Old Project Feature Analysis - Complete Documentation

## Overview

This directory contains comprehensive documentation of all features, pages, and unique functionality discovered in the OLD_Projects/mana-xc/oldwebsite/mana-running project. These documents should guide the implementation roadmap for the current manaxc-project/website.

## Documentation Files

### 1. **OLD_PROJECT_FEATURES_ROADMAP.md** (727 lines)
**Comprehensive technical reference**

The complete feature inventory with detailed breakdowns:
- All 14 page templates documented
- Functionality descriptions for each page
- Database fields and calculations required
- Implementation complexity assessment
- Technical considerations and patterns
- File references to source code

**Use this when:** You need detailed technical information about specific features, database schema requirements, or exact implementation details.

---

### 2. **ROADMAP_SUMMARY.md** (204 lines)
**Executive summary and strategic overview**

High-level strategic document covering:
- Key statistics and metrics
- Critical gaps (features that MUST be implemented)
- High priority features (should implement)
- Advanced features (phase 2+)
- Core systems explanation
- Implementation phases (4 weeks)
- Success criteria

**Use this when:** You're planning sprints, reporting to stakeholders, or need a quick overview of what needs to be done.

---

### 3. **FEATURES_CHECKLIST.md** (329 lines)
**Interactive implementation checklist**

Checkbox-based tracking organized by:
- School features (6 sections)
- Athlete features (2 sections)
- Course features (4 sections)
- Meet features (4 sections)
- Core systems & calculations (4 areas)
- UI/UX features (3 categories)
- Admin features (3 areas)
- Home page features
- Priority implementation order

**Use this when:** You're actively building features and want to track what's been completed.

---

## Quick Start

### If you're starting development:
1. Read **ROADMAP_SUMMARY.md** first (5-10 min)
2. Review **FEATURES_CHECKLIST.md** to understand scope
3. Reference **OLD_PROJECT_FEATURES_ROADMAP.md** for technical details

### If you're implementing a specific page:
1. Find the page in **OLD_PROJECT_FEATURES_ROADMAP.md**
2. Review its "Functionality" section
3. Check the associated lines in **FEATURES_CHECKLIST.md**
4. Reference the old project code at: `/Users/ron/manaxc/OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/`

### If you're planning a sprint:
1. Look at **ROADMAP_SUMMARY.md** implementation phases
2. Pick features from the phase
3. Use **FEATURES_CHECKLIST.md** to break them into tasks

---

## Key Findings Summary

### Critical Missing Pages (Must Implement)
1. **School Records Pages** - Core for coaches
2. **Team Selection Tool** - Unique coach feature
3. **Athlete Detail Page** - Central athlete hub
4. **School Roster Browsing** - Essential directory
5. **Course Records** - Important records tracking

### Core Systems (Essential Understanding)
1. **XC Time Rating** - Normalizes performances across courses
   - Formula: `time_seconds * xc_time_rating`
   - Base: Crystal Springs 2.95-mile course

2. **Mile Difficulty Rating** - Shows course hardness
   - Multiplier compared to 1-mile track
   - Color-coded (Green/Yellow/Orange/Red)

3. **Grade Calculation** - Determines athlete grade
   - Academic year: July 1 - June 30
   - Used for record categorization

4. **Season Stats** - Performance aggregation
   - Season PR, Top 3 avg, Last 3 avg, Improvement

### Implementation Priority

| Phase | Focus | Duration |
|-------|-------|----------|
| Phase 1 | Foundation pages (Athletes, Schools, Courses) | Weeks 1-3 |
| Phase 2 | Records & Analytics (Team selection, Records) | Weeks 4-6 |
| Phase 3 | Polish & Features (Meets, Pagination, Badges) | Weeks 7-8 |
| Phase 4 | Admin & Refinement (Search, Performance) | Week 9+ |

---

## What's Already in New Project

Based on the analysis, these features partially exist:
- Home page (basic dashboard)
- Import tools (different structure)
- Meet pages (partial structure)
- Some admin tools

### What's Missing

10+ major pages need to be built:
- Complete school browsing & records
- Athlete directory & detail pages
- Course browsing & records
- Team selection tool
- Advanced search
- Comprehensive meet browsing

---

## Technical Notes

### Database Fields Required
- `xc_time_rating` - Course normalization
- `mile_difficulty` - Course difficulty multiplier
- `graduation_year` - For grade calculation
- `season_year` - For season filtering
- `place_overall` - Race placement
- `meet_date`, `race_date` - Sorting/filtering
- `gender` - Boy/Girl designation
- `meet_type` - Meet classification

### Key Implementation Patterns

1. **Multi-column Sorting**
   - Bidirectional indicators (↑/↓)
   - Click headers to sort
   - Show active sort column

2. **Advanced Pagination**
   - First, -10, -5, Prev, Next, +5, +10, Last
   - Dynamic result counts
   - Jump buttons for efficiency

3. **Visual Hierarchies**
   - Grade-level records + overall
   - School-specific + course-wide records
   - Boys/Girls separated consistently

4. **XC Time Integration**
   - Every time value needs XC Time equivalent
   - Used for rankings and comparisons
   - Shown alongside actual time

---

## Usage Examples

### Planning Week 1
Look at Phase 1 in ROADMAP_SUMMARY.md:
```
1. Athletes listing page
2. School roster page
3. Athlete detail page
4. Course listings
5. Course details
```

### Implementing School Records Page
Reference in OLD_PROJECT_FEATURES_ROADMAP.md:
- Section 2.3 describes functionality
- FEATURES_CHECKLIST.md has checkbox breakdown
- Old project path: `.../schools/[id]/records/page.tsx`

### Tracking Progress
Use FEATURES_CHECKLIST.md:
- Check off items as you build them
- See overall completion percentage
- Identify remaining work

---

## File Locations

**Old Project Source:** 
`/Users/ron/manaxc/OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/`

**New Project:**
`/Users/ron/manaxc/manaxc-project/`

**Documentation:**
- `/Users/ron/manaxc/OLD_PROJECT_FEATURES_ROADMAP.md` - Detailed reference
- `/Users/ron/manaxc/ROADMAP_SUMMARY.md` - Executive summary
- `/Users/ron/manaxc/FEATURES_CHECKLIST.md` - Implementation checklist

---

## Questions to Answer

### "What features from the old project should we implement?"
See ROADMAP_SUMMARY.md - Critical and High Priority sections

### "What's the order of implementation?"
See ROADMAP_SUMMARY.md - Implementation Phases section

### "How do I implement feature X?"
1. Find X in FEATURES_CHECKLIST.md
2. Look up X in OLD_PROJECT_FEATURES_ROADMAP.md for details
3. Check old project source code at path listed

### "What's unique about the old project?"
- XC Time normalization system (sophisticated)
- Team selection tool (for coaches)
- Advanced record hierarchies (grade-level + school-level)
- Comprehensive sorting/pagination

### "How long will this take?"
See ROADMAP_SUMMARY.md Implementation Phases:
- Critical features: ~2 weeks
- High priority: ~2 weeks
- Medium priority: ~1 week
- Polish: ~1 week

---

## Next Steps

1. **Review**: Read ROADMAP_SUMMARY.md (10 min)
2. **Understand**: Explore old project structure and one example page
3. **Plan**: Choose Phase 1 features for first sprint
4. **Build**: Use FEATURES_CHECKLIST.md to track progress
5. **Reference**: Use OLD_PROJECT_FEATURES_ROADMAP.md for details as needed

---

## Success Metrics

The project will be successful when:

- [ ] All CRITICAL features from ROADMAP_SUMMARY.md are implemented
- [ ] XC Time system works consistently across all pages
- [ ] Records pages show correct data hierarchies
- [ ] Team selection tool is usable by coaches
- [ ] Athlete pages show complete race histories
- [ ] FEATURES_CHECKLIST.md is 90%+ complete
- [ ] Old project and new project have feature parity

---

## Contact & References

**Analysis Date:** 2025-10-28

**Analyzed By:** Feature Audit (comprehensive codebase exploration)

**Source Files:** 14+ TSX/TSX files from old project

**Old Project Size:** ~2000+ lines of app code

**Documentation Size:** 1260+ lines (3 comprehensive documents)

---

Generated from: `/Users/ron/manaxc/OLD_Projects/mana-xc/oldwebsite/mana-running/src/app/`
