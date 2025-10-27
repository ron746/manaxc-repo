# MANA RUNNING - PRODUCT ROADMAP

**Last Updated:** October 13, 2025  
**Vision:** The definitive cross country statistics platform

---

## 🎯 MISSION

**Build the best XC statistics tool** that coaches, athletes, and fans rely on for:
- Complete, accurate historical data
- Powerful analytics and insights
- Intuitive, fast user experience
- AI-powered predictions and recommendations

---

## ✅ COMPLETED FEATURES

### Q3-Q4 2024: Foundation
- ✅ Database schema designed
- ✅ Core data model (athletes, schools, courses, meets, races, results)
- ✅ Next.js app with TypeScript
- ✅ Supabase integration
- ✅ Vercel deployment
- ✅ Basic school roster pages

### October 2025: Data Quality & Performance
- ✅ Database cleanup (removed 1,328 duplicates)
- ✅ Supabase auth migration (@supabase/ssr)
- ✅ XC Time calculation implementation
- ✅ Materialized view for performance
- ✅ 1000-row limit resolution
- ✅ Individual records pages (58x faster)
- ✅ UI enhancements (clickable links, sorting, medals)

---

## 🚧 IN PROGRESS

### Phase 0: Foundation (October-November 2025)
**Goal:** Build infrastructure for rapid, quality data growth

**5 Critical Features:**

1. **Import Meet Results** (6h)
   - CSV and Athletic.net format support
   - Automatic athlete matching
   - Multi-step wizard UI
   - Target: 500+ results in < 5 minutes

2. **Find Duplicate Results** (2h)
   - Identify data integrity issues
   - One-click resolution
   - Automatic race count updates

3. **Safe Delete Functions** (3h)
   - Delete results, races, meets properly
   - Cascade handling
   - Confirmation prompts
   - Admin audit log

4. **Merge Athletes** (4h)
   - Combine duplicate athlete records
   - School transfer tracking
   - Preview before merge

5. **Course Rating Accuracy Test** (8h)
   - AI-powered rating validation
   - Flag inaccurate ratings
   - Suggest corrections
   - Optional Claude API integration

**Target Completion:** End of November 2025  
**Total Time:** ~23 hours

---

## 📅 UPCOMING PHASES

### Phase 1: User View Enhancements (December 2025)
**Goal:** Improve coach and athlete experience

**5 User-Facing Features:**

1. **Top Performances Page** (2h)
   - Rename from "School Records"
   - Show best XC times (all courses)
   - Gender and grade filtering

2. **Course Records Page** (4h)
   - Top times per specific course
   - 10 categories (overall + 4 grades × 2 genders)
   - Course selection dropdown

3. **Team Records Page** (3h)
   - Best varsity performance (top 5 same day)
   - Best frosh/soph performance
   - Boys and girls separately

4. **Seasons Page** (6h)
   - List all seasons
   - Detailed athlete stats per season
   - Year-over-year improvement tracking

5. **All Results Page** (3h)
   - Complete athlete listing
   - Ranked by XC Time within gender
   - Sortable, filterable table

**Target Completion:** End of December 2025  
**Total Time:** ~18 hours

---

### Phase 2: Advanced Analytics (Q1 2026)
**Goal:** Provide predictive insights

**Features:**

1. **Race Time Predictor**
   - Predict times on different courses
   - Factor in: athlete history, course difficulty, conditions
   - Confidence intervals

2. **Team Optimizer**
   - Best varsity lineup recommendations
   - Championship team projections
   - "What if" scenarios

3. **Training Insights**
   - Identify improvement patterns
   - Suggest training focus areas
   - Compare to similar athletes

4. **Championship Projections**
   - Predict CCS/State qualifying
   - Team scoring predictions
   - Individual place predictions

**Target Completion:** March 2026  
**Total Time:** ~80 hours

---

### Phase 3: National Expansion (Q2 2026)
**Goal:** Expand beyond California

**Features:**

1. **Multi-Region Support**
   - State-by-state expansion
   - Regional course databases
   - State championship tracking

2. **Course Rating System v2**
   - Automated course rating suggestions
   - Community-validated ratings
   - Historical weather adjustments

3. **Enhanced School Profiles**
   - Multi-year team trends
   - Coach information
   - School records history

4. **Athlete Recruitment Tools**
   - College recruiting profiles
   - Performance comparisons
   - PR progression tracking

**Target Completion:** June 2026

---

### Phase 4: Community Features (Q3-Q4 2026)
**Goal:** Build engaged user community

**Features:**

1. **User Accounts & Profiles**
   - Claim athlete profiles
   - Coach accounts
   - Fan following

2. **Meet Predictions Game**
   - Predict race results
   - Leaderboards
   - Prizes for accuracy

3. **Discussion Forums**
   - Meet discussions
   - Training advice
   - Course reviews

4. **Photo Galleries**
   - Meet photos
   - Athlete photos
   - Race videos

**Target Completion:** December 2026

---

## 🎨 FUTURE VISION (2027+)

### Mobile App
- Native iOS and Android apps
- Live meet following
- Push notifications
- Photo uploads

### AI Coach Assistant
- Personalized training recommendations
- Race strategy suggestions
- Injury risk prediction
- Peak performance timing

### Virtual Race Hub
- Live meet tracking
- Real-time scoring
- Social features during meets
- Post-race analysis

### International Expansion
- Support for 3200m, 8K, 10K races
- International course ratings
- Global athlete rankings

---

## 📊 SUCCESS METRICS

### Phase 0 Complete When:
- [ ] 10,000+ results in database
- [ ] Can import 500+ results in < 5 minutes
- [ ] Zero duplicate results
- [ ] All course ratings validated
- [ ] Admin tools fully functional

### Phase 1 Complete When:
- [ ] All 5 user views deployed
- [ ] Page load times < 2 seconds
- [ ] Mobile responsive
- [ ] Positive user feedback from 10+ coaches

### Phase 2 Complete When:
- [ ] Race predictions accurate within 30 seconds
- [ ] Team optimizer used by 50+ coaches
- [ ] Training insights available for 1,000+ athletes

### Long-Term Goals (2027):
- 100,000+ athletes tracked
- 1,000,000+ results
- 1,000+ active coach users
- 10,000+ monthly active users
- Revenue-positive (ads or premium features)

---

## 💰 MONETIZATION STRATEGY (Future)

### Free Tier
- Basic statistics
- School rosters
- Meet results
- Course records

### Coach Premium ($10/month)
- Advanced analytics
- Team optimizer
- Training insights
- Export capabilities
- Priority support

### School Premium ($50/month)
- All coach features
- Unlimited coaches
- Custom branding
- API access
- Historical data export

### Ads (Future)
- Targeted ads for running gear
- Meet sponsorships
- Local business partnerships

---

## 🔧 TECHNICAL DEBT & MAINTENANCE

### Ongoing Improvements
- [ ] Add remaining database indexes
- [ ] Optimize slow queries
- [ ] Improve error handling
- [ ] Add comprehensive testing
- [ ] Documentation updates

### Known Issues
- Minor Supabase client warning (non-blocking)
- Need better loading states
- Mobile UI needs polish

---

## 🎯 KEY DECISIONS

### October 2025: Phase 0 First
**Decision:** Build foundation before advanced features  
**Rationale:**
- Can't analyze what we can't import
- Quality data enables AI features
- Admin tools prevent technical debt
- Scaling requires solid infrastructure

### Focus on California First
**Decision:** Perfect California XC before expanding  
**Rationale:**
- Deep not wide initially
- Learn from one region
- Build strong local reputation
- Expand from position of strength

### Open Data Philosophy
**Decision:** Make data accessible, monetize premium features  
**Rationale:**
- Build trust with community
- Enable innovation
- Create network effects
- Premium features justify subscription

---

## 📚 RELATED DOCUMENTS

- **NEW_STRATEGIC_DIRECTION.md** - Why Phase 0 first
- **IMMEDIATE_ACTION_ITEMS.md** - Current sprint tasks
- **ADMIN_FEATURES.md** - Phase 0 specifications
- **USER_VIEW_ENHANCEMENTS.md** - Phase 1 specifications
- **PROJECT_CONTEXT.md** - Technical overview

---

## 🤝 STAKEHOLDERS

**Primary Users:**
- High school XC coaches
- High school XC athletes
- Parents and fans

**Secondary Users:**
- College recruiters
- Running clubs
- Meet directors

**Partners:**
- Timing companies (Direct Timing, FinishLynx)
- Athletic.net
- MaxPreps
- Running shoe companies

---

## 🎉 MILESTONES

- ✅ **Q3 2024:** Project launched
- ✅ **Oct 2025:** 4,477 athletes, 10,000+ results
- ⏳ **Nov 2025:** Phase 0 complete (import system)
- ⏳ **Dec 2025:** Phase 1 complete (user views)
- 🎯 **Q1 2026:** Phase 2 complete (AI analytics)
- 🎯 **Q2 2026:** 50,000 athletes tracked
- 🎯 **Q4 2026:** 100,000 athletes tracked
- 🎯 **2027:** Revenue-positive, national coverage

---

**Last Updated:** October 13, 2025  
**Current Phase:** Phase 0 - Foundation  
**Next Milestone:** Import system complete (Nov 2025)

**Vision Statement:** *By 2027, Mana Running will be the trusted platform for every XC coach, athlete, and fan seeking complete statistics, powerful insights, and predictive analytics.*
