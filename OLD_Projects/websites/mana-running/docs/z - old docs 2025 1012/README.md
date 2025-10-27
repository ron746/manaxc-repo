# Mana Running

**Production Cross Country Statistics Platform**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://mana-running.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-green)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

**Live:** https://mana-running.vercel.app/

The definitive XC statistics tool - like xcstats.com but with superior analytics and user experience.

---

## 🎯 Target Users

- **Coaches:** Team analysis, varsity selection, performance tracking, championship planning
- **Athletes:** Personal progress tracking, course PRs, season goals
- **Fans:** Meet results, school comparisons, historical data

---

## 🗂️ Tech Stack

- **Frontend:** Next.js 14.2.5, TypeScript, React Server Components
- **Backend:** Supabase (PostgreSQL 15.1)
- **Auth:** @supabase/ssr 0.5.1
- **Styling:** Tailwind CSS 3.4.1 + shadcn/ui
- **Deployment:** Vercel (auto-deploy from `main`)

---

## 📊 Database Status

**Current:** 4,477 unique athletes (deduplicated October 2025)

**Unique Constraint Active:**
```sql
UNIQUE (first_name, last_name, current_school_id, graduation_year)
```

**⚠️ Critical:** Times stored in CENTISECONDS (field misleadingly named `time_seconds`)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

Visit http://localhost:3000

---

## 📁 Project Structure

```
mana-running/
├── app/                          # Next.js 14 app directory
│   ├── schools/[id]/
│   │   ├── individual-records/   # ✅ NEW (Oct 11)
│   │   └── team-records/         # 🟡 IN PROGRESS
│   ├── courses/[id]/             # Course pages
│   ├── meets/[meetId]/           # Meet pages
│   └── api/                      # API routes
├── components/
│   ├── ui/                       # shadcn/ui components
│   └── ResultsTable.tsx          # Sortable results table
├── lib/
│   ├── supabase/                 # Supabase clients (@supabase/ssr)
│   └── utils/                    # Utilities (including time conversion)
└── supabase/
    └── migrations/               # Database migrations
```

---

## 🔧 Key Features

### Current
- Real-time race results
- Athlete performance tracking
- Team comparison analytics
- Course PR tracking
- School records (individual and team)
- Season progression visualization
- Sortable, interactive tables

### Recently Added (October 2025)
- ✅ Individual school records page (58x faster)
- ✅ Clickable athlete/school names
- ✅ Client-side sortable results tables
- ✅ Database deduplication (1,328 duplicates removed)
- ✅ Supabase auth migration

---

## ⚠️ Critical Pending Work

### 🔴 High Priority
- [ ] Fix race participant counts (trigger + data update)
- [ ] Add database indexes for performance
- [ ] Implement duplicate athlete checks in all creation flows
- [ ] Complete team records page

### 🟡 Medium Priority
- [ ] Add data validation on forms
- [ ] Clean up old records page
- [ ] Improve error handling

See `IMMEDIATE_ACTION_ITEMS.md` for detailed tasks.

---

## 📝 Common Development Tasks

### Database Queries
```sql
-- Top 7 varsity runners (remember: times in CENTISECONDS!)
SELECT a.first_name, a.last_name, 
       AVG(r.time_seconds) / 100 as avg_seconds
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN races ra ON ra.id = r.race_id
WHERE a.current_school_id = '<school-id>' 
  AND ra.distance = '5K'
GROUP BY a.id
ORDER BY avg_seconds ASC
LIMIT 7;
```

### Check for Duplicates
```sql
SELECT first_name, last_name, current_school_id, graduation_year, COUNT(*)
FROM athletes
GROUP BY first_name, last_name, current_school_id, graduation_year
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

---

## 🔄 Development Workflow

1. Create feature branch: `git checkout -b feature/name`
2. Make changes and test: `npm run dev`
3. Build check: `npm run build`
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feature/name`
6. Create PR and merge to `main`
7. Auto-deploys to production on merge

---

## 📝 Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Set in Vercel Dashboard → Settings → Environment Variables

---

## 📚 Documentation

Full documentation available in `/docs`:

- **PROJECT_CONTEXT.md** - Quick reference for new conversations (⭐ start here)
- **MANA_RUNNING_PROJECT_SUMMARY.md** - Complete technical documentation
- **IMMEDIATE_ACTION_ITEMS.md** - Current priorities and tasks
- **QUICK_REFERENCE.md** - Daily commands and queries
- **DATABASE_SCALABILITY.md** - Performance guidelines
- **MANA_RUNNING_ROADMAP.md** - Feature planning

---

## 🆘 Support

- **Deployment Issues:** [Vercel Dashboard](https://vercel.com/dashboard)
- **Database Issues:** [Supabase Dashboard](https://supabase.com)
- **Bug Reports:** [GitHub Issues](https://github.com/ron681/mana-running/issues)

---

## ⚡ Quick Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Lint code

git push origin main # Deploy to production
vercel logs          # View deployment logs
```

---

## 📈 Project Status

**Last Major Update:** October 12, 2025

**Recent Achievements:**
- ✅ Database cleaned (0 duplicates)
- ✅ Auth migrated to @supabase/ssr
- ✅ Individual records page deployed
- ✅ 58x performance improvement on school records

**Critical Next Steps:**
- 🔴 Fix race participant counts
- 🔴 Add database indexes
- 🟡 Complete team records page

---

**Status:** Production (Active Development)  
**Version:** 2.0  
**Last Updated:** October 12, 2025
