# ManaXC.com Website Setup Plan

## Goal
Create a Next.js website for manaxc.com that mirrors the mana-running.vercel.app landing page, connected to our Supabase database, and deployed to Cloudflare Pages.

## Step 1: Create Next.js Project

```bash
cd /Users/ron/manaxc/manaxc-project
npx create-next-app@latest website --typescript --tailwind --app --no-src-dir
cd website
```

Options for create-next-app:
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ App Router (not Pages Router)
- ❌ No src directory
- ✅ Import alias (@/*)

## Step 2: Install Dependencies

```bash
npm install @supabase/supabase-js
npm install @supabase/ssr
```

## Step 3: Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://mdspteohgwkpttlmdayn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE
```

## Step 4: Create File Structure

```
website/
├── app/
│   ├── layout.tsx          # Root layout with nav
│   ├── page.tsx            # Landing page (copy from old mana-running)
│   ├── meets/
│   │   └── page.tsx        # Meets list (future)
│   ├── schools/
│   │   └── page.tsx        # Schools list (future)
│   └── courses/
│       └── page.tsx        # Courses list (future)
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── ui/
│       └── StatsCard.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Supabase client
│   │   └── queries.ts      # Database queries
│   └── utils/
│       └── formatters.ts   # Time formatting, etc.
└── public/
    └── (static assets)
```

## Step 5: Key Files to Create

### 1. `lib/supabase/client.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 2. `lib/supabase/queries.ts`
```typescript
import { supabase } from './client'

export async function getStats() {
  const [schools, athletes, courses, results] = await Promise.all([
    supabase.from('schools').select('id', { count: 'exact', head: true }),
    supabase.from('athletes').select('id', { count: 'exact', head: true }),
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('results').select('id', { count: 'exact', head: true })
  ])

  return {
    schools: schools.count || 0,
    athletes: athletes.count || 0,
    courses: courses.count || 0,
    results: results.count || 0
  }
}

export async function getRecentMeets(limit = 10) {
  const { data, error } = await supabase
    .from('meets')
    .select(`
      id,
      name,
      meet_date,
      season_year
    `)
    .order('meet_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}
```

### 3. `app/page.tsx`
Copy from old mana-running but update:
- Change "Mana Running" to "ManaXC"
- Update brand colors (keep blue theme or customize)
- Use new queries from lib/supabase/queries.ts
- Remove CRUD operations (use direct queries instead)

### 4. `components/layout/Header.tsx`
```typescript
export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-slate-800">
            ManaXC
          </a>
          <div className="flex gap-6">
            <a href="/meets" className="text-slate-600 hover:text-blue-600">Meets</a>
            <a href="/schools" className="text-slate-600 hover:text-blue-600">Schools</a>
            <a href="/courses" className="text-slate-600 hover:text-blue-600">Courses</a>
          </div>
        </nav>
      </div>
    </header>
  )
}
```

## Step 6: Customizations for ManaXC

### Brand Identity
- **Name**: ManaXC (instead of Mana Running)
- **Tagline**: "Where Cross Country Comes Alive"
- **Colors**: Keep blue theme or use:
  - Primary: Blue #3B82F6
  - Secondary: Slate #64748B
  - Accent: Red #EF4444 (for athletes)
  - Success: Green #10B981 (for courses)

### Hero Section Updates
```typescript
<h1>Welcome to ManaXC</h1>
<p>
  The ultimate platform for high school cross country.
  Track performances, analyze trends, and celebrate every runner's journey.
</p>
```

### Feature Cards
- Schools & Teams
- Courses & Venues
- Meets & Results

## Step 7: Deploy to Cloudflare Pages

### Build Configuration
```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "export": "next export"
  }
}
```

### Cloudflare Pages Setup
1. **Connect GitHub** (or push code to GitHub first)
2. **Framework Preset**: Next.js
3. **Build Command**: `npm run build`
4. **Build Output Directory**: `.next`
5. **Environment Variables**: Add NEXT_PUBLIC_SUPABASE_* vars

### Alternative: Static Export for Cloudflare
If using static export:
```javascript
// next.config.js
module.exports = {
  output: 'export',
  images: {
    unoptimized: true
  }
}
```

Then:
```bash
npm run build && npm run export
```
Deploy `out` directory to Cloudflare Pages.

## Step 8: Connect Domain

In Cloudflare Pages:
1. Go to Custom Domains
2. Add manaxc.com
3. Cloudflare will auto-configure DNS (since domain is already in Cloudflare)

## Differences from Old Mana Running

### Simplified Approach
1. **No authentication** (yet) - public read-only site
2. **No CRUD operations** - direct Supabase queries only
3. **No admin pages** (yet) - focus on public views
4. **Simplified queries** - just stats and recent meets for now

### What We're Keeping
1. ✅ Beautiful landing page design
2. ✅ Stats cards (schools, athletes, courses, results)
3. ✅ Recent meets list
4. ✅ Navigation cards
5. ✅ Responsive design
6. ✅ Loading states and error handling

### What We're Deferring
1. ⏳ Individual meet pages
2. ⏳ School profiles
3. ⏳ Athlete profiles
4. ⏳ Course details
5. ⏳ Admin tools
6. ⏳ Authentication

## Testing Locally

```bash
cd website
npm run dev
```

Visit http://localhost:3000

Verify:
- [ ] Stats load correctly from Supabase
- [ ] Recent meets display (should be 0 for now)
- [ ] Navigation links work
- [ ] Responsive design works on mobile
- [ ] Loading states show properly
- [ ] Error handling works if database is down

## Launch Checklist

- [ ] Next.js project created
- [ ] Dependencies installed
- [ ] Supabase client configured
- [ ] Environment variables set
- [ ] Landing page adapted from old mana-running
- [ ] Stats query working
- [ ] Tested locally
- [ ] Pushed to GitHub
- [ ] Connected to Cloudflare Pages
- [ ] Environment variables set in Cloudflare
- [ ] Build successful
- [ ] Deployed to preview URL
- [ ] Custom domain (manaxc.com) connected
- [ ] SSL working (https://manaxc.com)

## Next Steps After Launch

Once the landing page is live:
1. Import first race data
2. Build meet detail page
3. Build race results page
4. Build athlete profile page
5. Add search functionality
6. Add filtering/sorting
7. Build admin tools for data import

## Estimated Timeline

- **Step 1-3**: 10 minutes (project setup)
- **Step 4-5**: 30 minutes (file structure and Supabase)
- **Step 6**: 45 minutes (adapt landing page)
- **Step 7**: 15 minutes (deploy to Cloudflare)
- **Step 8**: 5 minutes (connect domain)

**Total**: ~2 hours for basic launch

