# Old Website Analysis - Key Patterns to Adopt

**Date:** October 21, 2025
**Purpose:** Extract best practices from previous Mana XC website implementation

---

## Page Structure Patterns

### 1. School Profile Page (`/schools/[id]/page.tsx`)

**Layout:**
- Breadcrumb navigation (Home > Schools > School Name)
- Header with school name + athlete counts
- **Tab navigation** (Athletes | Records | Seasons | All Results)
- Search/filter section (Search, Gender dropdown, Grad Year dropdown, Clear Filters)
- Sortable table with pagination

**Features:**
- Loads ALL athletes (handles 1000+ with pagination queries)
- Client-side sorting and filtering
- Advanced pagination (First/-10/-5/Prev/Next/+5/+10/Last)
- Clean error handling and loading states
- Links to athlete profiles

**Color Scheme:**
- Primary: Red-600 (#DC2626)
- Background: Gray-50
- Cards: White with rounded-lg shadow

---

### 2. Season Detail Page (`/schools/[id]/seasons/[year]/page.tsx`)

**Purpose:** Team selection and performance analysis for a specific season

**Key Metrics Displayed:**
- **Season PR**: Fastest XC Time equivalent this season
- **Top 3 Average**: Average of athlete's 3 fastest XC Times
- **Last 3 Average**: Average of 3 most recent XC Times (chronological)
- **Race Count**: Number of races completed
- **Performance Trend**: Improving/Stable/Declining indicator

**XC Time Calculation (OLD FORMULA):**
```typescript
const xcTime = result.time_seconds * course.xc_time_rating
```

**Team Selection Features:**
- Top 7 runners highlighted with blue background
- Boys and Girls teams shown separately
- Expandable rows showing recent races
- Team Selection Guide explaining metrics

**Performance Trend Logic:**
```typescript
const improvement = athlete.season_pr - athlete.last_3_average
if (Math.abs(improvement) < 10) return 'stable'
return improvement > 0 ? 'declining' : 'improving'
```

---

### 3. Athlete Profile Page (`/athletes/[id]/page.tsx`)

**Layout Sections:**
1. **Header**: Name, school, grade, graduation year, gender
2. **Course PRs**: Best time on each course (sidebar)
3. **Season Stats**: Races, Season Best, Avg Time, Improvement
4. **Season Progression**: Timeline of races with XC equivalents
5. **All Race Results**: Sortable table with all metrics

**Metrics Displayed:**
- **Raw Time**: Actual finish time
- **Pace**: Per-mile pace
- **Mile Equiv**: Equivalent 1-mile track time (adjusted for course difficulty)
- **XC Time**: Crystal Springs 2.95-mile equivalent
- **Place**: Overall placement
- **Season**: Year

**XC Time Formula:**
```typescript
const xcTime = result.time_seconds * result.xc_time_rating
const pace = calculatePace(result.time_seconds, result.distance_miles)
const mileEquiv = pace / result.mile_difficulty
```

**Season Stats:**
```typescript
const seasonStats = {
  races: seasonProgression.length,
  avgTime: seasonXcTimes.reduce((sum, t) => sum + t, 0) / seasonXcTimes.length,
  bestTime: Math.min(...seasonXcTimes),
  improvement: seasonXcTimes[0] - seasonXcTimes[seasonXcTimes.length - 1]
}
```

---

### 4. TeamSelectionTable Component

**Features:**
- Rank column (#1, #2, etc.)
- Expandable rows (chevron icon)
- Top 7 highlighted with blue-50 background
- Sortable columns (Name, Class, Season PR, Top 3 Avg, Last 3 Avg, Races, Trend)
- Recent races displayed when expanded
- Performance trend indicators (↗/→/↘)

**Sorting Logic:**
- Handles null values (nulls last)
- Toggle ascending/descending on click
- Visual sort indicators (ChevronUp/ChevronDown icons)

---

## Database Views Used

### `results_with_details` View
```sql
SELECT
  results.*,
  courses.mile_difficulty,
  courses.xc_time_rating,
  meets.name as meet_name,
  meets.meet_date,
  courses.name as course_name,
  ...
FROM results
JOIN races ON ...
JOIN meets ON ...
JOIN courses ON ...
```

**Purpose:** Pre-join all result details for athlete queries

---

## Design Patterns to Adopt

### 1. **Breadcrumb Navigation**
```tsx
<nav className="text-sm text-gray-600">
  <a href="/" className="hover:text-red-600">Home</a>
  <span className="mx-2">/</span>
  <a href="/schools" className="hover:text-red-600">Schools</a>
  <span className="mx-2">/</span>
  <span className="text-black font-medium">{school.name}</span>
</nav>
```

### 2. **Tab Navigation**
```tsx
<div className="bg-white rounded-lg shadow mb-6">
  <div className="border-b border-gray-200">
    <nav className="flex">
      <div className="px-6 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
        Athletes
      </div>
      <a href={`/schools/${id}/records`} className="px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300">
        Records
      </a>
      ...
    </nav>
  </div>
</div>
```

### 3. **Search/Filter Section**
```tsx
<div className="bg-white rounded-lg shadow mb-6 p-6">
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <input type="text" placeholder="Search by name..." />
    <select>Gender filter</select>
    <select>Graduation Year filter</select>
    <button>Clear Filters</button>
  </div>
</div>
```

### 4. **Sortable Column Header**
```tsx
<th
  className="py-3 px-4 font-bold text-black cursor-pointer hover:bg-gray-100"
  onClick={() => handleSort('name')}
>
  Athlete Name
  <SortIndicator column="name" />
</th>
```

### 5. **Advanced Pagination**
```tsx
<button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
  First
</button>
<button onClick={() => setCurrentPage(Math.max(1, currentPage - 10))}>
  -10
</button>
...
```

### 6. **Expandable Rows**
```tsx
<button onClick={() => toggleExpanded(athlete.athlete_id)}>
  {expandedAthlete === athlete.athlete_id ? (
    <ChevronDownIcon className="w-4 h-4" />
  ) : (
    <ChevronRightIcon className="w-4 h-4" />
  )}
</button>
```

---

## Key Differences: Old vs New Schema

### Old Schema:
- `time_seconds` (FLOAT)
- `courses.mile_difficulty` (difficulty vs 1-mile track)
- `courses.xc_time_rating` (Crystal Springs multiplier)
- `results_with_details` view (pre-joined)

### New Schema:
- `time_cs` (INTEGER centiseconds)
- `courses.track_mile_rating` (Track Mile conversion)
- `courses.xc_time_rating` (Crystal Springs multiplier)
- `athlete_comparison_metrics` materialized view (dual metrics)

---

## Recommended Page Structure for New Site

### `/schools/[id]/page.tsx` - School Overview
- Show all athletes (all years)
- Sortable by name, graduation year, gender
- Filterable by gender, grad year
- Links to athlete profiles

### `/schools/[id]/roster?season=2025` - **NEW: Season Roster**
- Current season only
- Shows: Name, Grade, XC Time PR, Top 3 Season Avg, Season Avg
- Sortable and filterable by grade
- This is what user just requested!

### `/schools/[id]/seasons` - Season History
- List all seasons with team stats
- Links to season detail pages

### `/schools/[id]/seasons/[year]` - Season Detail
- Team selection analysis
- Top 7 highlighted
- Expandable rows with recent races
- Performance trends

### `/schools/[id]/records` - School Records
- All-time bests by grade, gender, course

### `/schools/[id]/results` - All Results
- Complete result history for school athletes

---

## Action Items for New Roster Page

1. ✅ Match layout to old website (breadcrumb, tabs, filters)
2. ✅ Add expandable rows for recent races
3. ✅ Add performance trend indicators
4. ✅ Highlight top 7 runners
5. ✅ Use consistent color scheme (red-600 primary)
6. ✅ Add season selector
7. ✅ Show both raw and XC equivalent times
8. ✅ Add "Team Selection Guide" info box

---

## Code Reuse Opportunities

### Time Formatting
```typescript
// Old: lib/timeConverter.ts
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 100)
  const secs = Math.floor((seconds % 100))
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Adapt for centiseconds in new site
```

### Grade Calculation
```typescript
// Old: lib/grade-utils.ts
export function getGradeDisplay(graduationYear: number, dateString: string): string {
  const date = new Date(dateString)
  const currentYear = date.getFullYear()
  const currentMonth = date.getMonth()
  const schoolYear = currentMonth >= 8 ? currentYear + 1 : currentYear
  const grade = 12 - (graduationYear - schoolYear)
  return `Grade ${Math.max(9, Math.min(12, grade))}`
}
```

### Team Scoring
```typescript
// Old: lib/teamScoring.ts
// Calculate team scores for meets (top 5 score, up to 7 compete)
```

---

## Visual Style Guide

### Colors:
- Primary: `red-600` (#DC2626)
- Secondary: `gray-600`
- Success: `green-600`
- Info: `blue-600`
- Background: `gray-50`
- Cards: `white` with `shadow` and `rounded-lg`

### Typography:
- Page titles: `text-3xl font-bold`
- Section headers: `text-xl font-bold`
- Body text: `text-sm` or `text-base`
- Labels: `text-xs font-medium text-gray-500 uppercase`

### Spacing:
- Container: `container mx-auto px-6 py-8`
- Card padding: `p-6`
- Section gaps: `mb-6` or `mb-8`

---

## Summary

The old website provides excellent patterns for:
1. **Professional UI**: Clean, consistent design
2. **Navigation**: Breadcrumbs + tabs for context
3. **Data Tables**: Sortable, filterable, paginated
4. **XC Time Normalization**: Clear display of both raw and normalized times
5. **Team Analysis**: Top 7 highlighting, trends, expandable details

**Next steps**: Adapt these patterns to the new schema with dual comparison metrics (Track Mile + Crystal Springs).
