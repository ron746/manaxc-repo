# Mana Running

**Cross Country Statistics & Analytics Platform**

[![Deployed on Vercel](https://img.shields.io/badge/Vercel-Production-success)](https://mana-running.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

---

## 🎯 Mission

Build the definitive cross country statistics platform that coaches, athletes, and fans rely on for complete data, powerful analytics, and AI-powered insights.

**Live at:** https://mana-running.vercel.app/

---

## ✨ Features

### Current (Production)
- ✅ **Complete Database** - 4,477 athletes, 10,000+ results
- ✅ **School Rosters** - All athletes with XC times
- ✅ **Individual Records** - Top performances by grade
- ✅ **Meet Results** - Sortable, filterable results
- ✅ **Course Normalization** - XC Time system for fair comparisons

### In Development (Phase 0)
- 🚧 **Import System** - Bulk upload from CSV/Athletic.net
- 🚧 **Admin Tools** - Data quality management
- 🚧 **Course Validation** - AI-powered rating accuracy

### Coming Soon (Phase 1)
- 📋 **Top Performances** - Best times across all courses
- 📋 **Course Records** - Per-course top performances
- 📋 **Team Records** - Best varsity/frosh-soph teams
- 📋 **Seasons View** - Year-by-year athlete tracking

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** Next.js 14.2.5 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 3.4.1
- **UI:** shadcn/ui components

### Backend
- **Database:** PostgreSQL 15.1 (Supabase)
- **Auth:** Supabase Auth
- **API:** Next.js API Routes

### Deployment
- **Platform:** Vercel
- **Auto-deploy:** Push to `main`

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm
- Supabase account

### Installation
```bash
# Clone the repository
git clone https://github.com/ron681/mana-running.git
cd mana-running

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📊 Database Schema

### Core Tables
- **athletes** - Athlete profiles
- **schools** - High school information
- **courses** - XC course data with difficulty ratings
- **meets** - Meet information
- **races** - Individual races within meets
- **results** - Race results (stored in centiseconds!)
- **school_transfers** - Athlete transfer history

### Key Features
- **Materialized View:** `athlete_xc_times` for fast XC Time lookups
- **Course Ratings:** Normalize performance across different courses
- **Cascade Deletes:** Maintain referential integrity

---

## 🔢 XC Time System

**Problem:** Can't fairly compare times run on different courses  
**Solution:** XC Time = actual time × course difficulty rating

**Formula:**
```
XC Time = time_seconds × course.xc_time_rating
```

**Example:**
- Crystal Springs (baseline): rating = 1.0
- Easier course: rating = 0.95 (5% easier)
- Harder course: rating = 1.05 (5% harder)

**Result:** 15:30 at an easy course (0.95) = better XC Time than 15:30 at a hard course (1.05)

---

## 📁 Project Structure

```
mana-running/
├── app/                    # Next.js app directory
│   ├── schools/[id]/      # School pages
│   ├── courses/[id]/      # Course pages
│   ├── admin/             # Admin tools (in development)
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   └── ResultsTable.tsx   # Sortable results table
├── lib/                   # Utility libraries
│   ├── supabase/          # Supabase clients
│   └── utils/             # Helper functions
└── docs/                  # Documentation
```

---

## 🔧 Development

### Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Check code quality
```

### Database
Access Supabase dashboard for:
- SQL queries
- Table management
- Function creation
- View materialized view

**Important:** After bulk data changes:
```sql
REFRESH MATERIALIZED VIEW athlete_xc_times;
```

---

## ⚠️ Critical Technical Details

### Time Storage
**Database field:** `time_seconds` (misleading name!)  
**Actual storage:** CENTISECONDS

**Example:**
- 15:30.00 = 93000 centiseconds (NOT 930 seconds)
- Formula: `(minutes × 60 × 100) + (seconds × 100) + centiseconds`

**Always divide by 100 for display:**
```typescript
const displayTime = dbTime / 100
```

### Pagination
Supabase has a 1000-row default limit. Use pagination loops:
```typescript
let allResults = []
let from = 0
const pageSize = 1000

while (true) {
  const { data } = await supabase
    .from('results')
    .select('*')
    .range(from, from + pageSize - 1)
  
  if (!data || data.length === 0) break
  allResults = [...allResults, ...data]
  if (data.length < pageSize) break
  from += pageSize
}
```

---

## 📈 Recent Progress

### October 2025
- ✅ Fixed XC Time calculation across all pages
- ✅ Resolved 1000-row limit issue
- ✅ Database cleanup (removed 1,328 duplicates)
- ✅ Improved UI (clickable links, sorting, medals)
- ✅ Individual records page (58x faster)

### Next Up (Phase 0)
- 🎯 Import meet results system
- 🎯 Admin data quality tools
- 🎯 Course rating validation

---

## 🎯 Roadmap

### Phase 0: Foundation (Oct-Nov 2025)
Build infrastructure for quality data growth
- Import system
- Admin tools
- Data quality features

### Phase 1: User Views (Dec 2025)
Enhance coach and athlete experience
- Top performances
- Course records
- Team records
- Seasons view

### Phase 2: AI Analytics (Q1 2026)
Predictive insights
- Race time predictions
- Team optimization
- Training insights

### Phase 3: National Expansion (Q2 2026)
Expand beyond California
- Multi-state support
- Enhanced profiles
- Recruitment tools

---

## 📚 Documentation

Comprehensive documentation in `/docs/`:
- **PROJECT_CONTEXT.md** - Start here
- **IMMEDIATE_ACTION_ITEMS.md** - Current tasks
- **ADMIN_FEATURES.md** - Phase 0 specs
- **USER_VIEW_ENHANCEMENTS.md** - Phase 1 specs
- **QUICK_REFERENCE.md** - Daily commands
- **MANA_RUNNING_ROADMAP.md** - Long-term vision

---

## 🤝 Contributing

Currently in active development. If you'd like to contribute:
1. Review documentation in `/docs/`
2. Check `IMMEDIATE_ACTION_ITEMS.md` for open tasks
3. Follow existing code patterns
4. Submit pull requests

---

## 📊 Statistics

- **Athletes:** 4,477 unique
- **Results:** 10,000+
- **Schools:** 50+
- **Courses:** 30+
- **Meets:** 100+
- **Target:** 100,000 athletes, 1M results by 2027

---

## 🔐 Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📄 License

Proprietary - All rights reserved

---

## 👥 Team

**Developer:** Ron  
**Technology Partner:** Claude (Anthropic)

---

## 🐛 Known Issues

- Minor Supabase client warning (non-blocking)
- Some mobile UI needs polish
- Loading states could be improved

See `IMMEDIATE_ACTION_ITEMS.md` for full list and priorities.

---

## 📧 Contact

For questions or feedback:
- Create an issue in GitHub
- Email: [your-email]

---

## 🌟 Acknowledgments

- **Supabase** - Database and auth platform
- **Vercel** - Hosting and deployment
- **shadcn/ui** - UI component library
- **Athletic.net** - Inspiration for XC statistics

---

**Last Updated:** October 13, 2025  
**Current Phase:** Phase 0 - Foundation  
**Status:** Active Development 🚀
