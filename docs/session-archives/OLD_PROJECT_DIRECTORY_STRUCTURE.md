# OLD_Projects - Directory Structure & Code Organization

## Project Root Structure

```
/Users/ron/manaxc/OLD_Projects/mana-xc/oldwebsite/mana-running/
├── src/                          # Main application source
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.tsx              # Home page (/)
│   │   ├── layout.tsx            # Root layout
│   │   ├── actions/              # Server actions directory
│   │   ├── admin/                # Admin panel routes
│   │   │   ├── page.tsx
│   │   │   └── mass-import/      # Batch import tool
│   │   ├── athletes/             # Athlete pages
│   │   │   ├── page.tsx          # Athletes listing
│   │   │   └── [id]/             # Dynamic athlete detail
│   │   │       └── page.tsx
│   │   ├── auth/                 # Authentication
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   ├── courses/              # Course pages
│   │   │   ├── page.tsx          # Courses listing
│   │   │   ├── [id]/             # Dynamic course detail
│   │   │   │   ├── page.tsx
│   │   │   │   ├── records/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── performances/ # Top times
│   │   │   │       └── page.tsx
│   │   │   └── import-courses/
│   │   │       └── page.tsx
│   │   ├── import/               # Import tools
│   │   │   └── page.tsx
│   │   ├── meets/                # Meet/race pages
│   │   │   ├── page.tsx          # Meets listing
│   │   │   └── [meetId]/         # Dynamic meet detail
│   │   │       ├── page.tsx
│   │   │       ├── races/        # Race results
│   │   │       │   └── [raceId]/
│   │   │       │       └── page.tsx
│   │   │       └── combined/     # Combined results
│   │   │           ├── page.tsx
│   │   │           └── ResultsTable.tsx
│   │   ├── schools/              # School pages
│   │   │   ├── page.tsx          # Schools listing
│   │   │   └── [id]/             # Dynamic school detail
│   │   │       ├── page.tsx      # School roster
│   │   │       ├── records/      # School records
│   │   │       │   └── page.tsx
│   │   │       ├── results/      # All school results
│   │   │       │   └── page.tsx
│   │   │       ├── seasons/      # Season pages
│   │   │       │   ├── page.tsx  # Seasons listing
│   │   │       │   ├── [year]/   # Season detail
│   │   │       │   │   └── page.tsx
│   │   │       │   └── loading.tsx # Loading skeleton
│   │   │       └── team-selection/
│   │   │           └── page.tsx
│   │   └── search/               # Search page
│   │       └── page.tsx
│   ├── components/               # React components
│   │   ├── CourseSelectionModal.tsx
│   │   ├── IndividualResultsTable.tsx
│   │   ├── SearchFilters.tsx
│   │   ├── SimpleCourseImporter.tsx
│   │   ├── TeamSelectionTable.tsx
│   │   ├── delete-confirmation-dialog.tsx
│   │   ├── meet-delete-buttons.tsx
│   │   ├── race-delete-buttons.tsx
│   │   └── ui/                   # UI component library
│   │       ├── alert-dialog.tsx
│   │       ├── alert.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── skeleton.tsx
│   │       └── tabs.tsx
│   └── lib/                      # Utility libraries
│       ├── admin/                # Admin utilities (empty in current structure)
│       ├── auth/
│       │   └── admin.ts          # Admin auth check
│       ├── supabase/             # Database clients
│       │   ├── client.ts         # Client-side Supabase
│       │   └── server.ts         # Server-side Supabase
│       ├── bulk-course-import.ts
│       ├── course-import-utilities.ts
│       ├── crud-operations.ts    # CRUD for all entities
│       ├── grade-utils.ts        # Grade level calculations
│       ├── import-utilities.ts
│       ├── mass-results-import.ts
│       ├── schema-compatibility.ts
│       ├── supabase.ts           # Main Supabase config
│       ├── teamScoring.ts        # Team scoring logic
│       ├── timeConverter.ts      # Time formatting
│       └── utils.ts              # General utilities
├── public/                       # Static assets
├── docs/                         # Documentation
├── .next/                        # Next.js build output (generated)
├── node_modules/                 # Dependencies (generated)
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS config
├── tsconfig.json                # TypeScript config
├── package.json                 # Node dependencies
└── ...other config files
```

---

## Key Directories Explained

### `/src/app/` - Pages & Routes (Next.js App Router)

The App Router uses file-based routing where:
- Files named `page.tsx` become route endpoints
- Directories with `[id]` become dynamic routes
- `layout.tsx` provides layout for directory and children

**Route Examples:**
- `app/page.tsx` → `/`
- `app/schools/page.tsx` → `/schools`
- `app/schools/[id]/page.tsx` → `/schools/:id`
- `app/schools/[id]/records/page.tsx` → `/schools/:id/records`
- `app/meets/[meetId]/races/[raceId]/page.tsx` → `/meets/:meetId/races/:raceId`

### `/src/components/` - Reusable React Components

**Organized by function:**
- **Data display:** IndividualResultsTable, TeamSelectionTable
- **Forms:** SearchFilters, CourseSelectionModal
- **Import tools:** SimpleCourseImporter
- **Admin:** delete-confirmation-dialog, meet/race-delete-buttons
- **UI Library:** Shadcn-style reusable components in `/ui/`

### `/src/lib/` - Utilities & Business Logic

**Categories:**
- **supabase/**: Database client configuration
  - `client.ts` - Client-side (for use in 'use client' components)
  - `server.ts` - Server-side (for server components)
  - `supabase.ts` - Main config export
- **Data operations:**
  - `crud-operations.ts` - Create, Read, Update, Delete functions
  - `bulk-course-import.ts` - Batch course import
  - `mass-results-import.ts` - Batch results import
- **Calculations:**
  - `timeConverter.ts` - Time formatting (seconds → MM:SS.CC)
  - `teamScoring.ts` - Team scoring algorithms
  - `grade-utils.ts` - Grade level calculations
- **Formatting:**
  - `utils.ts` - General utility functions
  - `import-utilities.ts` - CSV parsing helpers

---

## Page Type Categories

### 1. List Pages (Browsing)
```
/schools
/courses
/meets
/athletes
```
**Pattern:** Show all entities with search/filter/pagination/sort

### 2. Detail Pages (Viewing)
```
/schools/[id]
/courses/[id]
/athletes/[id]
/meets/[meetId]
```
**Pattern:** Show full entity info with related data

### 3. Sub-Detail Pages (Specific Views)
```
/schools/[id]/records
/schools/[id]/seasons
/schools/[id]/results
/courses/[id]/records
/courses/[id]/performances
/meets/[meetId]/combined
```
**Pattern:** Filtered view of entity or related data

### 4. Dynamic Sub-Pages
```
/schools/[id]/seasons/[year]
/meets/[meetId]/races/[raceId]
```
**Pattern:** Nested dynamic routing

### 5. Admin Pages
```
/admin
/admin/mass-import
/admin/import (in other branches)
/courses/import-courses
```
**Pattern:** Data management and import tools

### 6. Auth Pages
```
/auth/login
/auth/signup
```
**Pattern:** User authentication

---

## File Type Distribution

### TypeScript/JSX Pages (`.tsx`)
- 44 page/component files in app structure
- All use 'use client' directive for client-side rendering
- Some use SSR where needed (like meet detail)

### Utility Files (`.ts`)
- CRUD operations: crud-operations.ts
- Import helpers: import-utilities.ts, bulk-course-import.ts, mass-results-import.ts
- Calculations: timeConverter.ts, teamScoring.ts, grade-utils.ts
- Database: supabase.ts, server.ts, client.ts
- Config: schema-compatibility.ts

### Configuration Files
- `next.config.js` - Next.js settings
- `tailwind.config.js` - Tailwind CSS settings
- `tsconfig.json` - TypeScript settings
- `package.json` - Dependencies

---

## Data Flow Architecture

### Frontend → Database

```
React Component (page.tsx or component.tsx)
    ↓
    useEffect hook
    ↓
    Supabase Client (.from().select(), .eq(), etc.)
    ↓
    Supabase Database (PostgreSQL)
    ↓
    Return Data
    ↓
    Component State (useState)
    ↓
    Render UI
```

### CRUD Operations

```
import { schoolCRUD } from '@/lib/crud-operations'

// Read
await schoolCRUD.getAll()
await schoolCRUD.getById(id)

// Create
await schoolCRUD.create(data)

// Update
await schoolCRUD.update(id, data)

// Delete
await schoolCRUD.delete(id)
```

---

## Naming Conventions

### Files
- **Pages:** `page.tsx` (Next.js convention)
- **Layouts:** `layout.tsx`
- **Components:** PascalCase.tsx (e.g., `SearchFilters.tsx`)
- **Utilities:** camelCase.ts (e.g., `timeConverter.ts`)

### Routes
- **Dynamic segments:** `[id]`, `[meetId]`, `[raceId]`, `[year]`
- **Dynamic files:** Use same bracket syntax in filename
- **Nested routes:** Use directory nesting

### Variables
- **State:** camelCase with descriptive names
  - `athletes`, `loading`, `selectedGender`, `sortDirection`
- **Interfaces:** PascalCase
  - `Athlete`, `School`, `Course`, `RaceData`
- **Functions:** camelCase
  - `handleSort()`, `formatTime()`, `filterAthletes()`

---

## Component Patterns

### Pattern: List Page
```tsx
'use client'
import { useEffect, useState } from 'react'

export default function ItemsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    // Fetch from Supabase
    setItems(data)
    setLoading(false)
  }
  
  const filtered = items.filter(...)
  const paginated = filtered.slice(start, end)
  
  return (
    <div>
      <SearchInput ... />
      <Table data={paginated} />
      <Pagination ... />
    </div>
  )
}
```

### Pattern: Detail Page
```tsx
'use client'
interface Props {
  params: { id: string }
}

export default function DetailPage({ params }: Props) {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    loadData()
  }, [params.id])
  
  const loadData = async () => {
    // Fetch specific item by params.id
  }
  
  return (
    <div>
      <Header data={data} />
      <Tabs>
        <Tab1 data={data} />
        <Tab2 data={data} />
      </Tabs>
    </div>
  )
}
```

### Pattern: Sortable Table
```tsx
const [sortColumn, setSortColumn] = useState('name')
const [sortDirection, setSortDirection] = useState('asc')

const handleSort = (column) => {
  if (sortColumn === column) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
  } else {
    setSortColumn(column)
    setSortDirection('asc')
  }
}

const sorted = [...items].sort((a, b) => {
  const comparison = a[sortColumn].localeCompare(b[sortColumn])
  return sortDirection === 'asc' ? comparison : -comparison
})
```

---

## Technology Stack Details

### Frontend
- **Next.js 13+** - App Router for file-based routing
- **React 18** - Component library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Supabase Client** - Real-time database queries

### Styling Approach
- **Tailwind classes** - Applied directly to JSX
- **Responsive utilities** - `md:`, `lg:` breakpoints
- **Custom colors** - Blues, reds, greens for different sections
- **Shadcn UI** - Component library in `/ui/` folder

### State Management
- **React Hooks** - useState, useEffect
- **Component-level state** - Each component manages own state
- **No Redux/Zustand** - Simple hook-based approach

### Database
- **Supabase (PostgreSQL)** - Hosted database
- **Realtime queries** - Subscribe to changes
- **RPC functions** - Complex queries on server

---

## Import Path Aliases

Configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/components/*": ["components/*"],
      "@/lib/*": ["lib/*"]
    }
  }
}
```

**Usage:**
```ts
import { formatTime } from '@/lib/timeConverter'
import { SearchFilters } from '@/components/SearchFilters'
```

Instead of:
```ts
import { formatTime } from '../../../lib/timeConverter'
import { SearchFilters } from '../../../components/SearchFilters'
```

---

## Summary

The old Mana-XC project demonstrates:

1. **Clear separation of concerns:**
   - Pages handle routing and page logic
   - Components handle UI reusability
   - Lib handles data and utilities

2. **Scalable structure:**
   - Dynamic routes for variable content
   - Consistent patterns across pages
   - Reusable components and utilities

3. **Next.js best practices:**
   - App Router for modern routing
   - Client components marked with 'use client'
   - Server components for data fetching
   - Layout files for shared UI

4. **Data-driven design:**
   - Supabase integration at component level
   - CRUD operations library
   - Type-safe interfaces for all entities

5. **Professional organization:**
   - Consistent naming conventions
   - Clear directory structure
   - Utility functions extracted
   - UI components in dedicated folder

This structure provides a solid foundation for understanding what pages existed and how they were organized in the old project.

