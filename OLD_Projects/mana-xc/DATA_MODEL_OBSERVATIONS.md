# Data Model Observations & Improvements

**Purpose**: Document insights from real-world data imports to refine database schema and scraping strategy.

**Date**: October 19, 2025
**Status**: Active observation during 2024/2025 data imports

---

## Observations During Import

### 1. Course vs Venue Confusion
**Issue**: The `courses` table currently mixes "venue" (physical location) with "course configuration" (distance/layout).

**Real-world example**:
- Crystal Springs (venue) has multiple race distances: 2.95 mile, 2.0 mile, 1.7 mile
- Each distance = different course record
- Current schema treats venue as course

**Impact on features**:
- Course records need: venue + distance + gender
- Can't distinguish between "Crystal Springs 5K" vs "Crystal Springs 2-mile"

**Proposed solution**:
- Option A: Separate `venues` and `courses` tables
- Option B: Composite key approach (venue_name + distance_meters)

**Decision**: TBD after import analysis

---

### 2. Athletic.net Race IDs
**Issue**: Currently scraping at meet level, missing individual race URLs/IDs.

**Better approach**:
- Extract race IDs from URLs: `athletic.net/CrossCountry/Race.aspx?Race=12345`
- Store in `races.athletic_net_id` for better duplicate detection
- Enables race-level historical tracking

**Benefits**:
- Perfect duplicate detection (race-level, not meet-level)
- Persistent URLs for cross-platform linking
- Granular updates if results are corrected

**Decision**: Add to Phase 6 enhancement backlog

---

### 3. Import Progress UX
**Issue**: Long imports (5,743 results) provide no feedback during processing.

**User experience problem**:
- No way to know if import is processing or hung
- No indication of progress or time remaining
- Can't cancel long-running imports

**Proposed enhancements**:
- Progress bar with percentage complete
- Status updates: "Processing meet 3 of 8..."
- Real-time counts: "Results: 1,234/5,743"
- Estimated time remaining
- Cancel button

**Implementation approach**:
- Streaming responses or websockets
- Periodic polling for progress updates
- Backend progress reporting

**Decision**: Add to Phase 6 enhancement backlog

---

## Additional Observations

_(Add notes here as you observe patterns during import)_

### 4. Duplicate Fields in Meets Table
**Issue**: The `meets` table has TWO fields for Athletic.net meet ID:
- `ath_net_id` (int4) - NOT being used
- `athletic_net_id` (text) - Currently populated by import

**Current behavior**:
- Import code uses `athletic_net_id` (line 119 of batch-import/route.ts)
- `ath_net_id` remains NULL/unused

**Recommendation**:
- **Remove `ath_net_id`** field entirely (dead field)
- Keep `athletic_net_id` as the standard
- OR: Standardize on `ath_net_id` across all tables (meets, races, schools, athletes)

**Consistency check needed**:
- `schools.ath_net_id` - Is this being used?
- `athletes.ath_net_id` - Is this being used?
- `races.athletic_net_id` - Currently being used
- `meets.athletic_net_id` - Currently being used

**Decision**: Choose ONE naming convention and apply consistently across all tables

---

### 5. Athlete Identity Resolution - Multi-Part Problem

**CRITICAL**: Athletes table has several interconnected identity management issues.

#### 5a. Name Parsing Issues (Multi-word names)
**Problem**: Current simple parsing fails on complex names.

**Examples**:
- "Balery Del Cid Munoz" - Which parts are first/last?
- "Mary Ann Smith-Jones" - Hyphenated last names
- "John Paul Getty III" - Suffixes and middle names

**Current logic** (line 197-199 of batch-import):
```typescript
const nameParts = result.fullName.trim().split(/\s+/);
const lastName = nameParts[nameParts.length - 1];
const firstName = nameParts.slice(0, -1).join(' ');
```

**Issues with this approach**:
- Assumes last word = last name (fails for compound last names)
- No handling of Jr/Sr/III suffixes
- No cultural name patterns (Hispanic double surnames, Asian surname-first)

**Proposed solutions**:
- Option A: AI/ML name parsing (nameparser library, or LLM)
- Option B: Flag 3+ word names for manual review
- Option C: Store full name + AI-parsed first/last + manual override fields
- Option D: Use Athletic.net's name structure if they provide it

**Decision**: TBD - needs testing with real dataset

---

#### 5b. Graduation Year Not Captured
**Problem**: `graduation_year` field exists but is NOT being populated during import.

**Current behavior**:
- Athletic.net provides "Grade" (9, 10, 11, 12)
- We're not storing grade or calculating graduation year
- Makes athlete identification impossible over multi-year periods

**Impact**:
- Can't distinguish "John Smith (Class of 2024)" from "John Smith (Class of 2026)"
- Can't track athlete progression over 4 years
- Can't age-out graduated athletes

**Required fix**:
```typescript
// Calculate graduation year from grade and season
const gradeToGraduationYear = (grade: number, seasonYear: number) => {
  // If grade 12 in 2024 season → graduates 2025
  // If grade 9 in 2024 season → graduates 2028
  return seasonYear + (13 - grade);
}
```

**Decision**: MUST implement in next import iteration

---

#### 5c. Duplicate Detection Strategy
**Problem**: Current duplicate check is too simplistic.

**Current logic** (line 201-206):
```typescript
.eq('first_name', firstName)
.eq('last_name', lastName)
.eq('current_school_id', schoolId)
```

**Real-world scenarios this FAILS**:
1. **Same name, same school, different years**:
   - John Smith (9th grade, Class of 2028)
   - John Smith (11th grade, Class of 2026)
   - Current code: Treats as same athlete ❌

2. **Same athlete, different schools** (transfers):
   - Sarah Johnson ran for Oak Ridge (2022-2023)
   - Sarah Johnson ran for Westmont (2024-2025)
   - Current code: Creates 2 separate athlete records ❌

3. **Name changes** (marriage, legal name change):
   - Maria Garcia (2022-2023)
   - Maria Rodriguez (2024-2025, same person)
   - Current code: No way to link ❌

**Proposed composite key**:
```typescript
// Unique athlete identifier
.eq('first_name', firstName)
.eq('last_name', lastName)
.eq('graduation_year', gradYear)  // NEW - critical for disambiguation
.eq('gender', gender)
```

**Decision**: Implement in next iteration

---

#### 5d. School Transfers and `current_school_id`
**Problem**: `current_school_id` is ambiguous when importing historical data.

**Scenarios**:
- Import 2024 races (athlete at School A)
- Then import 2022 races (same athlete at School B)
- What should `current_school_id` be? Most recent? Latest imported?

**Real-world example**:
```
2022: Sarah at Oak Ridge HS
2023: Sarah transfers to Westmont HS
2024: Sarah still at Westmont HS

If we import out of order:
- Import 2024 first → current_school_id = Westmont
- Then import 2022 → Should we update to Oak Ridge? NO!
```

**Proposed solutions**:

**Option A: Rename field to represent intent**
```sql
-- Instead of current_school_id
primary_school_id  -- School for athlete's profile page
```

**Option B: Track school history**
```sql
-- New table: athlete_school_history
athlete_id, school_id, start_season, end_season

-- Keep current_school_id as "most recent known"
-- Determine via MAX(season_year) from results
```

**Option C: Manual linking workflow**
```
1. System detects potential duplicate: "Sarah Johnson at 2 schools, same grad year"
2. Sends email to admin: "Review potential duplicate athlete"
3. Admin screen shows:
   - Athlete A: Sarah Johnson, Oak Ridge, results in 2022
   - Athlete B: Sarah Johnson, Westmont, results 2024
   - Button: "Link as same athlete" or "Keep separate"
4. If linked:
   - Merge into single athlete_id
   - Create school transfer record
   - Update all results to point to merged athlete
```

**User-initiated linking**:
- Athletes/coaches can request to "Claim athlete profile"
- Admin reviews and approves merge requests
- Prevents auto-merge errors

**Decision**: Implement Option C - manual review workflow with admin tooling

---

### 6. Results Verification & Dispute Resolution System

**CRITICAL**: Need comprehensive audit trail for result corrections and disputes.

#### Real-world problems this solves:
1. **Wrong name in results** - "John Smith" ran but recorded as "Jon Smith"
2. **Missing athlete** - Athlete ran but not listed in results at all
3. **Wrong athlete assigned** - Time belongs to different person
4. **Timing errors** - Official results have errors that need correction
5. **Unofficial results** - Practice races, scrimmages that shouldn't count for records

---

#### Proposed Schema Additions

**Add to `results` table:**
```sql
-- Verification status
official BOOLEAN DEFAULT true  -- From Athletic.net = official, user-submitted = false
verified_by_coach BOOLEAN DEFAULT false
verified_by_timer BOOLEAN DEFAULT false
disputed BOOLEAN DEFAULT false

-- Audit trail
created_by_user_id UUID  -- Who created/imported this result
modified_by_user_id UUID  -- Who last modified
modification_reason TEXT  -- Why was it changed
original_athlete_id INTEGER  -- If reassigned, track original
dispute_notes TEXT  -- Comments from athlete/coach

-- Timestamps
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

**New table: `result_disputes`**
```sql
CREATE TABLE result_disputes (
  id SERIAL PRIMARY KEY,
  result_id INTEGER REFERENCES results(id),
  dispute_type TEXT,  -- 'wrong_athlete', 'missing_result', 'wrong_time', 'should_not_count'

  -- Disputing party
  submitted_by_user_id UUID REFERENCES user_profiles(id),
  submitted_by_athlete_id INTEGER REFERENCES athletes(id),

  -- Dispute details
  current_value TEXT,  -- e.g., "athlete_id: 123, time: 16:45.2"
  requested_value TEXT,  -- e.g., "athlete_id: 456, time: 16:45.2"
  reason TEXT,
  supporting_evidence TEXT,  -- URLs to photos, videos, etc.

  -- Resolution
  status TEXT,  -- 'pending', 'approved', 'rejected', 'needs_info'
  resolved_by_user_id UUID,
  resolution_notes TEXT,
  resolved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);
```

**New table: `result_corrections`**
```sql
CREATE TABLE result_corrections (
  id SERIAL PRIMARY KEY,
  result_id INTEGER REFERENCES results(id),
  correction_type TEXT,  -- 'athlete_reassigned', 'time_corrected', 'marked_unofficial'

  -- What changed
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,

  -- Who and why
  corrected_by_user_id UUID REFERENCES user_profiles(id),
  correction_reason TEXT,

  -- Authority level
  approved_by_coach BOOLEAN DEFAULT false,
  approved_by_timer BOOLEAN DEFAULT false,
  approved_by_admin BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### Verification Hierarchy

**Level 1: Import source (highest trust)**
- Results from Athletic.net → `official = true`
- Results from Lynbrook Sports → `official = true`
- Manual entry by admin → `official = true`

**Level 2: Coach verification**
- Coach confirms result → `verified_by_coach = true`
- Required for records if dispute occurred

**Level 3: Timer verification**
- Meet timer confirms → `verified_by_timer = true`
- Gold standard for disputed results

**Level 4: User submissions (lowest trust)**
- Athlete self-reports missing result → `official = false`
- Requires coach/timer approval to become official

---

#### Use Cases & Workflows

**Use Case 1: Athlete claims missing result**
```
1. Athlete logs in, navigates to race
2. "I ran this race but I'm not listed" button
3. Form: Enter time, upload photo evidence
4. Creates result with official=false, disputed=true
5. Email sent to coach: "John Smith claims he ran 16:45 at Crystal Springs"
6. Coach reviews:
   - Approve → Updates official=true, verified_by_coach=true
   - Reject → Archives dispute with reason
   - Request info → Athlete gets notification
```

**Use Case 2: Wrong athlete assigned**
```
1. Athlete sees: "John Smith: 16:45.2" but should be "Jon Smith: 16:45.2"
2. Clicks "This isn't me" or "Claim this result"
3. System creates dispute record
4. Admin dashboard shows pending dispute
5. Admin reviews, reassigns result to correct athlete
6. Audit trail preserves: original_athlete_id, modification_reason
```

**Use Case 3: Mark race/meet as unofficial**
```
Admin options:
- Mark single result unofficial (practice race)
- Mark entire race unofficial (scrimmage)
- Mark entire meet unofficial (time trial)

Query for course records:
WHERE official = true
  AND verified_by_coach = true  -- Optional stricter filter
  AND disputed = false
```

---

#### Admin Dashboard Features

**Dashboard: Result Verification Queue**
```
Tabs:
1. Pending Disputes (requires admin action)
2. Coach Verification Requests
3. Recent Corrections (audit log)
4. Flagged Results (quality issues)

For each dispute, show:
- Athlete name, school, race details
- Current vs requested values (side-by-side)
- Evidence attachments
- One-click actions: Approve / Reject / Request More Info
```

**Dashboard: Bulk Operations**
```
- Mark entire meet as unofficial
- Mark all results from specific race as unofficial
- Re-verify all results from questionable source
- Bulk reassign athletes (for import errors)
```

**Dashboard: Audit Trail**
```
- View all changes to any result
- Filter by: date range, user, correction type
- Export corrections report
- Rollback capability for mistakes
```

---

#### Record Eligibility Rules

**For course records to count:**
```sql
SELECT * FROM results
WHERE official = true
  AND disputed = false
  AND (
    -- Either verified by authority OR imported from trusted source
    verified_by_coach = true
    OR verified_by_timer = true
    OR (official = true AND created_by_user_id IS NULL)  -- Auto-import
  )
ORDER BY time_cs ASC
```

**For team records:**
Same rules, plus:
- All 7 scoring athletes must meet eligibility
- Meet must not be marked unofficial

---

#### User Permissions

**Athletes can:**
- View their own results
- Dispute results assigned to them
- Claim missing results
- Upload evidence

**Coaches can:**
- Verify results for their team
- Approve/reject athlete claims
- Request corrections

**Timers can:**
- Verify results for meets they timed
- Override coach disputes

**Admins can:**
- All of the above
- Mark meets/races official/unofficial
- Bulk operations
- View full audit trail

---

#### Migration Strategy

**For existing results:**
```sql
-- All imported Athletic.net results start as official
UPDATE results
SET official = true,
    verified_by_coach = false,
    disputed = false,
    created_at = NOW()
WHERE created_by_user_id IS NULL;
```

**For new imports:**
- Scraper sets `official = true` by default
- Import code populates `created_by_user_id = NULL` (system import)

---

#### Implementation Priority

**Phase 6 (Foundation):**
- Add fields to results table
- Create disputes and corrections tables
- Basic admin dashboard for manual corrections

**Phase 7 (Workflows):**
- Athlete dispute submission forms
- Coach review interface
- Email notifications

**Phase 8 (Advanced):**
- Bulk operations
- Audit trail viewer
- Evidence attachment handling
- Rollback functionality

---

**Decision**: This is a MAJOR competitive differentiator. Build this right and coaches will migrate from Athletic.net.

---

### 7. Strategic Product Positioning & Data Sync Challenge

**IMPORTANT**: Mana XC is NOT competing with Athletic.net - it's a complementary analytics platform.

#### Product Strategy Clarification

**What Mana XC IS:**
- Analytics and insights layer on top of Athletic.net data
- Historical repository extending beyond Athletic.net's coverage (pre-2010s results)
- Advanced statistical tools (course ratings, predictive analytics, team optimization)
- Enhanced data interpretation and visualization

**What Mana XC is NOT:**
- Results hosting platform (Athletic.net does this well)
- Meet management system (leave that to Athletic.net/RunnerSpace)
- Nationwide coverage platform (focused on schools that opt-in)

**Value proposition:**
- "We make Athletic.net data more useful"
- Historical continuity (link modern results to pre-digital era)
- Advanced analytics not available on Athletic.net

---

#### The Incremental Update Challenge

**Problem**: How to detect when Athletic.net adds new results for tracked schools?

**Current approach**:
- Manual scraping when admin runs scraper
- Relies on admin knowing a new meet was added
- No automated detection of new data

**Challenges**:
1. **No API** - Athletic.net doesn't provide a data feed
2. **No change log** - Can't query "what's new since last week"
3. **Rate limiting** - Can't constantly poll all schools
4. **School count** - If tracking 50+ schools, manual monitoring doesn't scale

---

#### Proposed Solutions for Incremental Updates

**Option A: Scheduled Background Scraper (Automated Polling)**
```
Strategy:
- Cron job runs daily/weekly
- Scrapes "recent meets" for all tracked schools
- Only imports meets newer than last import date
- Uses duplicate detection to avoid re-importing

Implementation:
- Store last_scraped_at timestamp per school
- For each school: scrape Athletic.net → check for new meet IDs
- If new meet found → scrape and import automatically
- Email admin: "3 new meets imported for Westmont HS"

Pros:
- Fully automated
- Scales to many schools
- Admin doesn't need to manually check

Cons:
- Server costs (daily scraping for 50+ schools)
- Athletic.net might rate-limit
- Could scrape and find nothing new (wasted cycles)
```

**Option B: RSS/Change Detection Service**
```
Strategy:
- Use a change detection service (like ChangeDetection.io)
- Monitor each school's Athletic.net page
- When page changes → trigger scraper
- Only scrape when there's actually new data

Pros:
- More efficient than blind polling
- Only runs when data actually changes

Cons:
- Requires external service integration
- Athletic.net pages are JavaScript-heavy (may not detect changes reliably)
```

**Option C: User-Triggered + Smart Suggestions**
```
Strategy:
- Primarily manual: Coaches/admins request "Check for updates"
- System tracks patterns and suggests: "Westmont usually has a meet in September - check Athletic.net?"
- One-click "Re-scrape all my schools"

Implementation:
- Dashboard shows: "Last updated: 7 days ago" with "Check for Updates" button
- Scraper compares existing meet IDs with current Athletic.net data
- Shows preview: "Found 2 new meets - import them?"

Pros:
- No server costs for constant polling
- Admin stays in control
- Works with Athletic.net's rate limits

Cons:
- Requires manual action
- Might miss meets if admin doesn't check regularly
```

**Option D: Hybrid Approach (RECOMMENDED)**
```
Strategy:
1. **Weekly automated check** for "active season" schools (Aug-Nov)
2. **Monthly check** for off-season
3. **User-triggered** anytime via dashboard button
4. **Email digest**: "3 schools have potential new meets - review?"

Implementation:
- Track school season schedule (fall XC = Aug-Nov)
- During season: Check weekly for new meets
- Off-season: Light monthly check
- Admin can override: "Check now" or "Pause auto-check for this school"

Benefits:
- Balances automation with control
- Reduces unnecessary scraping
- Scales to many schools
- Respects Athletic.net servers
```

---

#### Data Freshness Strategy

**For each tracked school, store:**
```sql
CREATE TABLE tracked_schools (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id),
  ath_net_school_id TEXT,

  -- Scraping schedule
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'weekly',  -- 'daily', 'weekly', 'monthly', 'manual'
  last_scraped_at TIMESTAMP,
  next_scheduled_scrape TIMESTAMP,

  -- Season awareness
  active_season_start DATE,  -- Aug 1
  active_season_end DATE,    -- Nov 30

  -- Status
  last_sync_status TEXT,  -- 'success', 'no_new_data', 'error'
  last_sync_details JSONB,  -- { meets_found: 3, meets_imported: 2 }

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Dashboard view for admin:**
```
Tracked Schools:
┌─────────────────┬──────────────┬─────────────┬────────────┐
│ School          │ Last Updated │ Auto Sync   │ Actions    │
├─────────────────┼──────────────┼─────────────┼────────────┤
│ Westmont HS     │ 2 days ago   │ Weekly ✓    │ Check Now  │
│ Oak Ridge HS    │ 7 days ago   │ Monthly ✓   │ Check Now  │
│ Crystal Springs │ 14 days ago  │ Manual only │ Check Now  │
└─────────────────┴──────────────┴─────────────┴────────────┘

[Check All Schools for Updates] [Configure Auto-Sync Schedule]
```

---

#### Using Athletic.net as Source of Truth

**Best practice approach:**
```
1. Store Athletic.net meet/race IDs as foreign keys
2. Link to Athletic.net URLs in UI: "View on Athletic.net →"
3. Never claim to be authoritative source
4. Add value through analytics, not data hosting
5. Respect their robots.txt and rate limits
```

**Example UI:**
```
Result: John Smith - 16:45.2 at Crystal Springs Invitational
[View Official Results on Athletic.net] [See Advanced Analytics ↓]

Mana XC Analytics:
- Course-adjusted time: 16:32.1 (1-mile equivalent)
- Predicted 5K PR: 16:28.4
- Percentile rank: Top 5% nationally
- Improvement trajectory: +12% vs last year
```

**Value-add without competing:**
- They have the data → You make it insightful
- They host meets → You show trends over time
- They show results → You predict future performance

---

#### Recommendation for Next Phase

**Immediate (Phase 6):**
- Add `tracked_schools` table
- Build manual "Check for Updates" button in admin UI
- Store last_scraped_at timestamps

**Short-term (Phase 7):**
- Implement weekly auto-check during XC season
- Email digest: "New meets available for your schools"

**Long-term (Phase 8):**
- Intelligent scraping (only check during likely meet dates)
- Predictive scheduling: "Westmont usually has meets on Saturdays in October"

---

**Decision**: Start with Option C (manual + smart suggestions), evolve to Option D (hybrid) as school count grows.

---

### 8. [Your observations here]

---

## Data Quality Checks After Import - ACTUAL RESULTS

### Import Summary (2024 Season)
- **Total meets**: 8 ✅
- **Import time**: ~5-10 minutes
- **Errors**: None after courseId scoping fix

---

### Table-by-Table Analysis

#### 1. MEETS Table ✅ GOOD (with cleanup needed)

**Current state:**
- **Row count**: 8 meets ✅
- **season_year**: Populated correctly ✅
- **meet_date**: Correct dates ✅
- **athletic_net_id**: Populated ✅

**Fields to REMOVE:**
- ❌ **ath_net_id** - Duplicate field, never populated, serves no purpose
- ❌ **host_school_id** - Rarely known, not additive, adds complexity

**Rationale for removal:**
1. `ath_net_id` is redundant with `athletic_net_id`
2. `host_school_id` doesn't add value:
   - Meet location != hosting school (often neutral sites)
   - Data not reliably available from Athletic.net
   - Doesn't support any key queries or features
   - Adds foreign key complexity

**Schema cleanup SQL:**
```sql
-- Remove unused fields from meets table
ALTER TABLE meets DROP COLUMN IF EXISTS ath_net_id;
ALTER TABLE meets DROP COLUMN IF EXISTS host_school_id;
```

**Decision**: Remove both fields in schema cleanup phase

---

#### 2. COURSES Table ⚠️ NEEDS MAJOR REFACTOR

**Current state:**
- **Row count**: 4 records ✅
- **Course names**: Clean (e.g., "Crystal Springs") ✅
- **City field**: Duplicates course name ❌ (should be actual city like "Belmont")
- **State field**: Accurate ✅
- **distance_meters**: Constant 4409 for all ❌ (incorrect default, not venue-specific)

**CRITICAL ISSUE: Table name is semantically wrong**

This table is actually storing **VENUES** (physical locations), not courses (race configurations).

**Real-world model:**
```
VENUE: Crystal Springs XC Course
  ├─ COURSE 1: 2.95 mile layout (4748m)
  ├─ COURSE 2: 2.0 mile layout (3219m)
  └─ COURSE 3: 1.7 mile layout (2736m)
```

**Current schema conflates these concepts.**

---

**Proposed Schema Refactor:**

**Step 1: Rename table**
```sql
ALTER TABLE courses RENAME TO venues;
```

**Step 2: Remove incorrect field**
```sql
ALTER TABLE venues DROP COLUMN distance_meters;  -- This belongs in courses table
```

**Step 3: Fix city field logic**
- Current: `city = courseName` (wrong)
- Should be: Actual city where venue is located
- Options:
  - Manual correction after import
  - Geocoding API (Google Maps / OpenStreetMap)
  - Leave as venue name for now (acceptable placeholder)

**Step 4: Create new COURSES table**
```sql
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER REFERENCES venues(id),
  distance_meters INTEGER NOT NULL,
  layout_name TEXT,  -- Optional: "Varsity Layout", "JV Loop", etc.

  -- Course characteristics
  elevation_gain_meters INTEGER,
  surface_type TEXT,  -- 'grass', 'dirt', 'mixed'

  -- For course records
  boys_course_record_cs INTEGER,
  boys_record_holder_id INTEGER REFERENCES athletes(id),
  girls_course_record_cs INTEGER,
  girls_record_holder_id INTEGER REFERENCES athletes(id),

  created_at TIMESTAMP DEFAULT NOW(),

  -- Composite unique constraint
  UNIQUE(venue_id, distance_meters)
);
```

**Step 5: Update races table**
```sql
-- races.course_id currently points to venues table
-- After refactor, it should point to courses table
-- Migration will need to:
-- 1. Create course records (venue_id + distance_meters from races)
-- 2. Update races.course_id to point to new courses.id
```

---

**Migration Strategy:**

**Option A: Immediate refactor (RECOMMENDED)**
1. Rename `courses` → `venues`
2. Create new `courses` table with venue_id + distance_meters
3. Populate courses from existing race data
4. Update race.course_id foreign keys
5. Re-import 2024/2025 with corrected logic

**Option B: Gradual migration**
1. Keep `courses` table as-is for now
2. Create `venues` and `courses` as new tables
3. Dual-write during transition period
4. Migrate when ready

---

**Code changes needed:**

**Import code (batch-import/route.ts):**
```typescript
// OLD: Create one "course" per venue
const { data: newCourse } = await supabase
  .from('courses')
  .insert({ name: courseName, city: courseName, state: state })

// NEW: Create venue, then find/create course
const { data: venue } = await supabase
  .from('venues')
  .insert({
    name: courseName,
    city: 'TBD',  // Or geocode later
    state: state
  })

// Then for each race at this venue:
const { data: course } = await supabase
  .from('courses')
  .insert({
    venue_id: venue.id,
    distance_meters: distanceMeters  // From race name parsing
  })
  .onConflict('venue_id, distance_meters')  // Reuse if exists
```

---

**Decision**: Implement Option A - full refactor before 2025 import

**Benefits:**
- Clean data model from the start
- Supports course records properly
- Easier to query (venue vs course distinction is clear)

**Next steps:**
1. Finish table analysis (races, results, athletes, schools)
2. Write complete schema migration SQL
3. Clean database again
4. Fix import code for venues + courses
5. Re-import 2024 + 2025 with correct model

---

#### 3. RACES Table ✅ MOSTLY GOOD (with cleanup needed)

**Current state:**
- **Row count**: 75 races ✅
- **meet_id**: Properly populated ✅
- **name**: Accurate ✅
- **gender**: 'M' or 'F' strings ✅ (Fix worked!)
- **distance_meters**: Accurate ✅
- **athletic_net_id**: Populated with exact Athletic.net race number ✅ (Great for future race-level scraping!)
- **xc_time_rating**: 1.0 for all ✅ (Default, will adjust later via admin tool)

**Issues found:**
- **ath_net_id**: Blank ❌ (Will be resolved in scraper revision)
- **course_id**: Blank ❌ (Needs to link to new courses table after refactor)
- **total_participants**: 0 for all ❌ (Will calculate in Phase 4)
- **category**: NULL for all ❓ (Unclear purpose, likely not useful)

**Fields to REMOVE:**
- ❌ **category** - Purpose unclear, not being populated, no use case identified

---

**CRITICAL DISCOVERY: Course Layout Changes Over Time**

**Real-world scenario:**
- Montgomery Hill Park 2024: Original layout (difficulty rating: 1.05)
- Montgomery Hill Park 2025: Under construction, temporary layout (difficulty rating: 1.02 - easier)
- Same venue, same distance, **different physical course**

**Problem:**
- Athletic.net doesn't distinguish layout changes
- Both years show as "Montgomery Hill Park 2.95 Miles"
- Course records get mixed between different layouts
- Our rating system would treat them as the same course

**Impact on course records:**
- 2024 PR: 16:30 on harder layout
- 2025 PR: 16:25 on easier layout
- Which is the "true" course record? They're different courses!

---

**Proposed Solution: Course Versioning System**

**Enhanced COURSES schema:**
```sql
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER REFERENCES venues(id),
  distance_meters INTEGER NOT NULL,

  -- NEW: Course versioning
  layout_version TEXT DEFAULT 'standard',  -- 'standard', 'alternative', 'temp_2025', etc.
  layout_description TEXT,  -- "Original layout", "Construction detour", "New configuration"

  -- Date ranges for when this layout was used
  active_from DATE,
  active_to DATE,

  -- Course characteristics (specific to this layout)
  elevation_gain_meters INTEGER,
  surface_type TEXT,
  xc_time_rating NUMERIC(5,3) DEFAULT 1.000,  -- MOVED from races to courses

  -- Course records (specific to this layout version)
  boys_course_record_cs INTEGER,
  boys_record_holder_id INTEGER REFERENCES athletes(id),
  girls_course_record_cs INTEGER,
  girls_record_holder_id INTEGER REFERENCES athletes(id),

  created_at TIMESTAMP DEFAULT NOW(),

  -- Composite unique constraint including version
  UNIQUE(venue_id, distance_meters, layout_version)
);
```

**Example data:**
```sql
-- Montgomery Hill Park original layout
INSERT INTO courses VALUES (
  venue_id: 5,
  distance_meters: 4748,
  layout_version: 'standard',
  layout_description: 'Original layout through main trails',
  active_from: '2010-01-01',
  active_to: '2024-12-31',
  xc_time_rating: 1.050
);

-- Montgomery Hill Park 2025 temporary layout
INSERT INTO courses VALUES (
  venue_id: 5,
  distance_meters: 4748,
  layout_version: 'temp_2025',
  layout_description: 'Temporary layout due to trail construction - slightly easier',
  active_from: '2025-01-01',
  active_to: '2025-12-31',
  xc_time_rating: 1.020
);
```

---

**Admin Dashboard Feature: Course Layout Override**

**Use case workflow:**
```
1. Admin views race: "Montgomery Hill Park 2.95 Miles - 9/14/2025"
2. Clicks "Course Layout Options"
3. Dropdown shows:
   - ○ Standard layout (used 2010-2024)
   - ● Temporary 2025 layout (selected)
   - ○ Create new layout variant
4. If "Create new", form appears:
   - Layout name: "Temporary 2025"
   - Description: "Construction detour, slightly flatter"
   - Active dates: 2025-01-01 to 2025-12-31
   - Initial rating estimate: 1.000 (adjust later)
5. Save → All 2025 races auto-link to new course layout
```

**Benefits:**
- Separate course records per layout
- Independent difficulty ratings
- Historical accuracy (times comparable only within same layout)
- Admin can easily flag "this year was different"

---

**Query for course records (layout-aware):**
```sql
-- Get course record for CURRENT layout only
SELECT
  a.first_name,
  a.last_name,
  r.time_cs,
  ra.name as race_name,
  m.meet_date
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN races ra ON ra.id = r.race_id
JOIN courses c ON c.id = ra.course_id
JOIN meets m ON m.id = ra.meet_id
WHERE c.venue_id = 5  -- Montgomery Hill Park
  AND c.distance_meters = 4748
  AND c.layout_version = 'temp_2025'  -- Specific layout
  AND ra.gender = 'M'
ORDER BY r.time_cs ASC
LIMIT 1;
```

---

**Where should xc_time_rating live?**

**Answer: COURSES table, NOT races table**

**Rationale:**
- Rating is a property of the physical course layout
- Montgomery Hill "standard" layout: always 1.050 difficulty
- Montgomery Hill "temp_2025" layout: always 1.020 difficulty
- All races on same course layout share the same rating

**Move xc_time_rating from races → courses:**
```sql
-- Remove from races
ALTER TABLE races DROP COLUMN xc_time_rating;

-- Add to courses (already in proposed schema above)
ALTER TABLE courses ADD COLUMN xc_time_rating NUMERIC(5,3) DEFAULT 1.000;
```

---

**Course Rating Admin Tool Enhancement:**

**Current:**
- Select a race → Analyze rating → Update rating

**Enhanced:**
- Select a race →
- Shows current course layout assignment
- Analyze rating → Statistical test
- "Apply rating to this course layout" → Updates courses.xc_time_rating
- All races on same layout automatically use updated rating

---

**Migration Strategy:**

**Step 1: Default behavior (most venues)**
```
- Create one course per venue+distance
- layout_version = 'standard'
- All historical races link to this course
```

**Step 2: Admin identifies exceptions**
```
- "Montgomery Hill 2025 was different"
- Admin creates new layout variant
- Manually assigns 2025 races to new layout
- System suggests date range: "Apply to all races in 2025?"
```

**Step 3: Future automation**
```
- System detects significant rating anomaly
- "Warning: Montgomery Hill 2025 races are 3% faster than historical average"
- Suggests: "Was the course layout different this year?"
- One-click create new layout variant
```

---

**Decision**:
1. Remove `category` field from races (unused)
2. Move `xc_time_rating` from races → courses
3. Add course versioning (layout_version, active dates)
4. Build admin tool to manage course layout variants
5. This positions Mana XC as MORE accurate than Athletic.net for historical analysis

---

#### 4. RESULTS Table ✅ EXCELLENT (audit trail enhancements needed)

**Current state:**
- **Row count**: 5,733 records ✅
- **time_cs**: Proper centiseconds format ✅
- **season_year**: Correctly populated (2024) ✅
- **race_id**: Populated ✅
- **athlete_id**: Populated ✅
- **place_overall**: Populated ✅
- **Data quality**: No issues found ✅

**Enhancement needed: Complete Audit Trail System**

**Use cases requiring tracking:**
1. **Athlete reassignment**: "This result belongs to John Smith, not Jon Smith"
2. **Time corrections**: "Timer error - should be 16:45.2 not 16:54.2"
3. **Verification workflow**: Mark results as verified by coach/timer
4. **Dispute resolution**: Track original values when changes are made

---

**Proposed Schema Enhancement:**

```sql
ALTER TABLE results ADD COLUMN IF NOT EXISTS official BOOLEAN DEFAULT true;
ALTER TABLE results ADD COLUMN IF NOT EXISTS verified_by_coach BOOLEAN DEFAULT false;
ALTER TABLE results ADD COLUMN IF NOT EXISTS verified_by_timer BOOLEAN DEFAULT false;
ALTER TABLE results ADD COLUMN IF NOT EXISTS disputed BOOLEAN DEFAULT false;

-- Original values (preserved when corrections are made)
ALTER TABLE results ADD COLUMN IF NOT EXISTS orig_athlete_id INTEGER REFERENCES athletes(id);
ALTER TABLE results ADD COLUMN IF NOT EXISTS orig_time_cs INTEGER;
ALTER TABLE results ADD COLUMN IF NOT EXISTS orig_place_overall INTEGER;

-- Audit trail
ALTER TABLE results ADD COLUMN IF NOT EXISTS modified_by_user_id UUID REFERENCES user_profiles(id);
ALTER TABLE results ADD COLUMN IF NOT EXISTS modification_date TIMESTAMP;
ALTER TABLE results ADD COLUMN IF NOT EXISTS modification_reason TEXT;
ALTER TABLE results ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES user_profiles(id);
ALTER TABLE results ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP;

-- Timestamps
ALTER TABLE results ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
```

---

**Workflow Examples:**

**Example 1: Athlete Reassignment**
```
Initial state:
- athlete_id: 123 (John Smith)
- time_cs: 100520 (16:45.20)
- orig_athlete_id: NULL
- official: true

Admin corrects: "This should be athlete 456 (Jon Smith)"

After correction:
- athlete_id: 456 (Jon Smith)
- time_cs: 100520 (unchanged)
- orig_athlete_id: 123 (John Smith) ← PRESERVED
- official: false ← Until verified
- modification_date: 2025-10-19 14:32:00
- modification_reason: "Name spelling error - confirmed with coach"
- modified_by_user_id: admin_uuid

Coach verifies correction:
- verified_by_coach: true
- verified_by_user_id: coach_uuid
- verification_date: 2025-10-19 15:00:00
- official: true ← Now official again
```

**Example 2: Time Correction**
```
Initial state:
- athlete_id: 789 (Sarah Johnson)
- time_cs: 101420 (16:54.20)
- orig_time_cs: NULL

Timer reports error: "Should be 16:45.20 not 16:54.20"

After correction:
- time_cs: 100520 (16:45.20) ← CORRECTED
- orig_time_cs: 101420 (16:54.20) ← PRESERVED
- modification_reason: "Timer transpositio error - digits reversed"
- modified_by_user_id: timer_uuid
- verified_by_timer: true
- official: true (timer verification is authoritative)
```

---

**Admin UI for Result Corrections:**

**Edit Result Screen:**
```
┌─────────────────────────────────────────────────────┐
│ Edit Result: Sarah Johnson - Crystal Springs        │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Current Values:                                     │
│   Athlete: Sarah Johnson (#789) [Change]           │
│   Time: 16:54.20                [Edit]              │
│   Place: 5                      [Edit]              │
│                                                      │
│ Status:                                             │
│   ☑ Official Result                                 │
│   ☐ Verified by Coach                               │
│   ☐ Verified by Timer                               │
│   ☐ Disputed                                        │
│                                                      │
│ Modification History:                               │
│   (No modifications yet)                            │
│                                                      │
│ Make Changes:                                       │
│   ○ Reassign to different athlete                   │
│   ○ Correct time                                    │
│   ○ Update place                                    │
│   ○ Mark as unofficial                              │
│                                                      │
│ [Cancel] [Save Changes]                             │
└─────────────────────────────────────────────────────┘
```

**If "Reassign to different athlete" selected:**
```
┌─────────────────────────────────────────────────────┐
│ Reassign Result                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Current Athlete: Sarah Johnson (#789)               │
│                                                      │
│ Search for new athlete:                             │
│ [Sarah Jones________________] [Search]              │
│                                                      │
│ Results:                                            │
│   ○ Sarah Jones (#892) - Westmont HS, Class 2026   │
│   ○ Sarah Jones (#1043) - Oak Ridge HS, Class 2027 │
│                                                      │
│ Reason for change: (required)                       │
│ [Name misspelling - confirmed with coach_________] │
│                                                      │
│ ⚠ Warning: Result will be marked as UNOFFICIAL     │
│   until verified by coach or timer                  │
│                                                      │
│ Original athlete will be preserved in audit trail   │
│                                                      │
│ [Cancel] [Reassign Result]                          │
└─────────────────────────────────────────────────────┘
```

**After saving, show modification history:**
```
Modification History:
┌─────────────────────────────────────────────────────┐
│ Oct 19, 2025 2:32 PM - Admin (you)                  │
│ Changed athlete: Sarah Johnson → Sarah Jones        │
│ Reason: Name misspelling - confirmed with coach     │
│ Status: Awaiting verification                       │
└─────────────────────────────────────────────────────┘
```

---

**Query for Course Records (only verified results):**

```sql
SELECT
  a.first_name,
  a.last_name,
  r.time_cs,
  ra.name as race_name
FROM results r
JOIN athletes a ON a.id = r.athlete_id
JOIN races ra ON ra.id = r.race_id
JOIN courses c ON c.id = ra.course_id
WHERE c.venue_id = 5
  AND c.distance_meters = 4748
  AND c.layout_version = 'standard'
  AND ra.gender = 'M'
  AND r.official = true  -- Only official results
  AND r.disputed = false  -- No active disputes
  AND (
    -- Either verified OR unmodified import
    r.verified_by_coach = true
    OR r.verified_by_timer = true
    OR r.orig_athlete_id IS NULL  -- Never been modified
  )
ORDER BY r.time_cs ASC
LIMIT 1;
```

---

**Rollback Capability:**

**Admin can undo changes:**
```sql
-- Rollback athlete reassignment
UPDATE results
SET
  athlete_id = orig_athlete_id,
  orig_athlete_id = NULL,
  official = true,
  modification_reason = NULL,
  modified_by_user_id = NULL,
  modification_date = NULL,
  updated_at = NOW()
WHERE id = 12345;
```

**UI button:**
```
Modification History:
┌─────────────────────────────────────────────────────┐
│ Oct 19, 2025 2:32 PM - Admin                        │
│ Changed athlete: Sarah Johnson → Sarah Jones        │
│ Reason: Name misspelling                            │
│ [Undo This Change]                                  │
└─────────────────────────────────────────────────────┘
```

---

**Migration for existing results:**

```sql
-- All imported results start as official and unmodified
UPDATE results
SET
  official = true,
  verified_by_coach = false,
  verified_by_timer = false,
  disputed = false,
  orig_athlete_id = NULL,
  orig_time_cs = NULL,
  created_at = NOW(),
  updated_at = NOW()
WHERE orig_athlete_id IS NULL;
```

---

**Benefits:**
1. **Complete audit trail** - Every change is tracked
2. **Reversible operations** - Can undo mistakes
3. **Trust system** - Official vs unofficial results
4. **Verification workflow** - Coach/timer approval
5. **Course record integrity** - Only count verified results
6. **Legal protection** - Documented chain of custody for data

**Decision**: Add all audit trail fields to results table in schema refactor

---

#### 5. ATHLETES Table ⚠️ NEEDS ENHANCEMENTS

**Current state:**
- **Row count**: 3,828 athletes ✅
- **current_school_id**: Populated ✅
- **gender**: Populated as 'M'/'F' ✅ (Fix worked!)
- **first_name / last_name**: Populated but needs smart parsing ❌
- **graduation_year**: NOT populated ❌ CRITICAL MISSING DATA
- **ath_net_id**: NOT populated (acceptable - too expensive to scrape)

---

**CRITICAL ISSUE #1: Missing graduation_year**

**Impact:**
- Cannot distinguish athletes with same name at same school
- Cannot track athlete progression over 4 years
- Duplicate detection will fail
- Historical queries impossible

**Solution:**
Athletic.net provides **grade** in results. We need to calculate graduation year:

```typescript
// In batch-import code, extract grade from result
const grade = result.grade;  // 9, 10, 11, or 12
const seasonYear = new Date(meetDate).getFullYear();

// Calculate graduation year
// Grade 12 in 2024 season → graduates spring 2025
// Grade 9 in 2024 season → graduates spring 2028
const graduationYear = seasonYear + (13 - grade);
```

**Migration for existing athletes:**
- Re-import with grade → graduation_year calculation
- Or: Query first result for each athlete, extract grade from CSV, calculate

---

**CRITICAL ISSUE #2: Name Parsing Quality**

**Current logic:** Simple split, last word = last name
- Works for: "John Smith" → John / Smith
- Fails for: "Balery Del Cid Munoz" → Balery Del Cid / Munoz (wrong!)
- Fails for: "Mary Ann Smith-Jones" → Mary Ann Smith / Jones (wrong!)

**Solutions:**

**Option A: Enhanced parsing library**
```typescript
import { HumanName } from 'human-name';  // Or similar library

const parsed = HumanName.parse(result.fullName);
// Handles: compound last names, suffixes, middle names
```

**Option B: Store full_name + parsed + manual override**
```sql
ALTER TABLE athletes ADD COLUMN full_name TEXT;  -- "Balery Del Cid Munoz"
ALTER TABLE athletes ADD COLUMN name_verified BOOLEAN DEFAULT false;
ALTER TABLE athletes ADD COLUMN name_manually_corrected BOOLEAN DEFAULT false;

-- Admin can override incorrect parsing
```

**Option C: Flag for manual review**
```typescript
// During import, flag complex names
if (nameParts.length >= 3) {
  await supabase.from('name_review_queue').insert({
    athlete_id: athleteId,
    full_name: result.fullName,
    parsed_first: firstName,
    parsed_last: lastName,
    needs_review: true
  });
}
```

**Decision**: Implement Option B + C - store full_name, flag 3+ word names for admin review

---

**CRITICAL ISSUE #3: Performance - Athlete Rankings at Scale**

**Problem:**
Ranking thousands of athletes by normalized XC PR requires:
```sql
-- Slow query (has to calculate for every athlete)
SELECT
  a.id,
  a.first_name,
  a.last_name,
  MIN(r.time_cs * c.xc_time_rating) as best_xc_time
FROM athletes a
JOIN results r ON r.athlete_id = a.id
JOIN races ra ON ra.id = r.race_id
JOIN courses c ON c.id = ra.course_id
WHERE a.gender = 'M'
GROUP BY a.id
ORDER BY best_xc_time ASC
LIMIT 100;
```

This query:
- Scans 5,733 results
- Joins 4 tables
- Calculates ratings on-the-fly
- Takes seconds for thousands of athletes

---

**Solution: Denormalized PR Fields (Cache Strategy)**

**Add to athletes table:**
```sql
ALTER TABLE athletes ADD COLUMN xc_time_pr_cs INTEGER;  -- Best normalized time (all-time)
ALTER TABLE athletes ADD COLUMN xc_time_pr_race_id INTEGER REFERENCES races(id);  -- Which race
ALTER TABLE athletes ADD COLUMN xc_time_pr_updated_at TIMESTAMP;  -- When calculated

-- Seasonal PRs
ALTER TABLE athletes ADD COLUMN xc_time_pr_2024_cs INTEGER;
ALTER TABLE athletes ADD COLUMN xc_time_pr_2025_cs INTEGER;
-- Or better: separate table for seasonal PRs
```

**Alternative: Seasonal PRs Table**
```sql
CREATE TABLE athlete_seasonal_prs (
  id SERIAL PRIMARY KEY,
  athlete_id INTEGER REFERENCES athletes(id),
  season_year INTEGER,
  xc_time_pr_cs INTEGER,
  xc_time_pr_race_id INTEGER REFERENCES races(id),
  updated_at TIMESTAMP,

  UNIQUE(athlete_id, season_year)
);

CREATE INDEX idx_seasonal_prs_ranking ON athlete_seasonal_prs(season_year, xc_time_pr_cs);
```

---

**Fast ranking query becomes:**
```sql
-- All-time rankings (instant)
SELECT
  a.id,
  a.first_name,
  a.last_name,
  a.xc_time_pr_cs,
  r.name as pr_race_name
FROM athletes a
LEFT JOIN races r ON r.id = a.xc_time_pr_race_id
WHERE a.gender = 'M'
  AND a.xc_time_pr_cs IS NOT NULL
ORDER BY a.xc_time_pr_cs ASC
LIMIT 100;

-- Seasonal rankings (instant)
SELECT
  a.first_name,
  a.last_name,
  sp.xc_time_pr_cs,
  r.name as pr_race_name
FROM athlete_seasonal_prs sp
JOIN athletes a ON a.id = sp.athlete_id
LEFT JOIN races r ON r.id = sp.xc_time_pr_race_id
WHERE sp.season_year = 2024
  AND a.gender = 'M'
ORDER BY sp.xc_time_pr_cs ASC
LIMIT 100;
```

**Performance improvement:**
- Before: 2-5 seconds for 3,828 athletes
- After: < 100ms (indexed lookup)

---

**When to recalculate PRs:**

**Trigger 1: New result added**
```sql
-- After inserting result, update athlete PR if faster
CREATE OR REPLACE FUNCTION update_athlete_pr()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate normalized time
  DECLARE
    norm_time INTEGER;
    current_pr INTEGER;
  BEGIN
    SELECT NEW.time_cs * c.xc_time_rating INTO norm_time
    FROM races r
    JOIN courses c ON c.id = r.course_id
    WHERE r.id = NEW.race_id;

    -- Get current PR
    SELECT xc_time_pr_cs INTO current_pr
    FROM athletes
    WHERE id = NEW.athlete_id;

    -- Update if faster or first result
    IF current_pr IS NULL OR norm_time < current_pr THEN
      UPDATE athletes
      SET
        xc_time_pr_cs = norm_time,
        xc_time_pr_race_id = NEW.race_id,
        xc_time_pr_updated_at = NOW()
      WHERE id = NEW.athlete_id;
    END IF;

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER result_inserted_update_pr
AFTER INSERT ON results
FOR EACH ROW
EXECUTE FUNCTION update_athlete_pr();
```

**Trigger 2: Course rating updated**
```sql
-- When course rating changes, recalculate PRs for all athletes who raced there
CREATE OR REPLACE FUNCTION recalculate_prs_for_course()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all athletes who raced this course for PR recalculation
  INSERT INTO pr_recalc_queue (athlete_id)
  SELECT DISTINCT r.athlete_id
  FROM results r
  JOIN races ra ON ra.id = r.race_id
  WHERE ra.course_id = NEW.id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_rating_updated
AFTER UPDATE OF xc_time_rating ON courses
FOR EACH ROW
WHEN (OLD.xc_time_rating IS DISTINCT FROM NEW.xc_time_rating)
EXECUTE FUNCTION recalculate_prs_for_course();
```

**Background job processes queue:**
```typescript
// Cron job runs every 5 minutes
async function processPRRecalcQueue() {
  const { data: queue } = await supabase
    .from('pr_recalc_queue')
    .select('athlete_id')
    .limit(100);

  for (const { athlete_id } of queue) {
    await recalculateAthletePR(athlete_id);
    await supabase.from('pr_recalc_queue').delete().eq('athlete_id', athlete_id);
  }
}
```

---

**Athletic.net ID - Future Enhancement**

**Current:** Not scraped (too slow to fetch for all athletes)

**Future feature: User-claimed Athletic.net profiles**
```
Workflow:
1. Athlete logs in to Mana XC
2. "Link my Athletic.net profile"
3. Enters Athletic.net athlete ID
4. System validates (scrapes one page to confirm name matches)
5. Background job: Scrapes all historical results for this athlete
6. Imports any missing results
7. Athlete profile now shows: "Linked to Athletic.net"
```

**Benefits:**
- Opt-in (only scrapes for athletes who request it)
- Complete history for engaged users
- Cross-platform verification

**Schema:**
```sql
ALTER TABLE athletes ADD COLUMN ath_net_id TEXT;
ALTER TABLE athletes ADD COLUMN ath_net_verified BOOLEAN DEFAULT false;
ALTER TABLE athletes ADD COLUMN ath_net_last_synced TIMESTAMP;
```

---

**Schema Enhancements Summary:**

```sql
-- Critical additions
ALTER TABLE athletes ADD COLUMN graduation_year INTEGER;  -- REQUIRED
ALTER TABLE athletes ADD COLUMN full_name TEXT;  -- For name parsing
ALTER TABLE athletes ADD COLUMN name_verified BOOLEAN DEFAULT false;

-- Performance optimization
ALTER TABLE athletes ADD COLUMN xc_time_pr_cs INTEGER;
ALTER TABLE athletes ADD COLUMN xc_time_pr_race_id INTEGER REFERENCES races(id);
ALTER TABLE athletes ADD COLUMN xc_time_pr_updated_at TIMESTAMP;

-- Future: Athletic.net linking
ALTER TABLE athletes ADD COLUMN ath_net_id TEXT;
ALTER TABLE athletes ADD COLUMN ath_net_verified BOOLEAN DEFAULT false;
ALTER TABLE athletes ADD COLUMN ath_net_last_synced TIMESTAMP;

-- Seasonal PRs table
CREATE TABLE athlete_seasonal_prs (
  id SERIAL PRIMARY KEY,
  athlete_id INTEGER REFERENCES athletes(id),
  season_year INTEGER,
  xc_time_pr_cs INTEGER,
  xc_time_pr_race_id INTEGER REFERENCES races(id),
  updated_at TIMESTAMP,
  UNIQUE(athlete_id, season_year)
);

-- PR recalculation queue
CREATE TABLE pr_recalc_queue (
  athlete_id INTEGER PRIMARY KEY REFERENCES athletes(id),
  queued_at TIMESTAMP DEFAULT NOW()
);
```

**Decision:**
1. Add graduation_year calculation to import code (CRITICAL)
2. Store full_name for better name parsing
3. Add denormalized PR fields for performance
4. Create seasonal_prs table
5. Build PR recalculation triggers
6. Athletic.net linking as Phase 8+ feature

---

#### 6. SCHOOLS Table ⚠️ MINIMAL DATA (enhancement opportunities)

**Current state:**
- **Row count**: Multiple schools created ✅
- **name**: Populated ✅
- **ath_net_id**: NULL ❌ (Even for Westmont, the source school!)
- **city**: NULL ❌
- **state**: NULL ❌
- **cif_level_id**: NULL ❌
- **cif_division**: NULL ❌

**Issue:** School metadata is not being captured during import

---

**Missing Data Explanation:**

**Why fields are blank:**
1. **ath_net_id**: Not extracted from Athletic.net scraper
   - We scraped BY school ID (1076 for Westmont)
   - But didn't STORE that ID back to the schools table
   - Easy fix: Import code should capture this

2. **city/state/cif_division**: Not available in race results
   - Athletic.net results don't include school location metadata
   - Would need separate scraping of school profile pages
   - Or manual entry by coach/admin

---

**Solution: Coach-Managed School Profiles**

**Workflow:**
```
1. Coach creates account, claims school
2. "Complete School Profile" form:
   - Athletic.net School ID: [1076_________]
   - City: [Campbell________]
   - State: [CA_]
   - CIF Division: [Division II_]
   - League: [MHAL_________]

3. After saving Athletic.net ID:
   - System queues background scrape job
   - "Import all historical results for Westmont HS?"
   - Coach approves → scraper runs for that school
   - Results auto-imported and linked
```

---

**Enhanced Schema:**

```sql
ALTER TABLE schools ADD COLUMN IF NOT EXISTS ath_net_id TEXT;

-- Coach management
ALTER TABLE schools ADD COLUMN managed_by_user_id UUID REFERENCES user_profiles(id);
ALTER TABLE schools ADD COLUMN profile_completed BOOLEAN DEFAULT false;

-- Auto-sync configuration
ALTER TABLE schools ADD COLUMN auto_sync_enabled BOOLEAN DEFAULT false;
ALTER TABLE schools ADD COLUMN last_synced_at TIMESTAMP;
ALTER TABLE schools ADD COLUMN next_scheduled_sync TIMESTAMP;

-- Metadata (coach-entered)
ALTER TABLE schools ADD COLUMN city TEXT;
ALTER TABLE schools ADD COLUMN state TEXT DEFAULT 'CA';
ALTER TABLE schools ADD COLUMN cif_level_id INTEGER REFERENCES competitive_levels(id);
ALTER TABLE schools ADD COLUMN cif_division TEXT;
ALTER TABLE schools ADD COLUMN league_name TEXT;
ALTER TABLE schools ADD COLUMN mascot TEXT;
ALTER TABLE schools ADD COLUMN colors TEXT;
ALTER TABLE schools ADD COLUMN founded_year INTEGER;

-- Contact info
ALTER TABLE schools ADD COLUMN website_url TEXT;
ALTER TABLE schools ADD COLUMN xc_coach_name TEXT;
ALTER TABLE schools ADD COLUMN xc_coach_email TEXT;

-- Timestamps
ALTER TABLE schools ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE schools ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
```

---

**Admin Dashboard: School Profile Management**

```
┌─────────────────────────────────────────────────────┐
│ School Profile: Westmont High School                │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Basic Information:                                  │
│   School Name: Westmont High School                 │
│   City: [Campbell__________]                        │
│   State: [CA_]                                      │
│   Mascot: [Warriors________]                        │
│   Colors: [Blue & Gold_____]                        │
│                                                      │
│ Athletic.net Integration:                           │
│   School ID: [1076_________] [Verify]               │
│   Status: ✅ Linked and verified                    │
│   Last synced: 2 days ago                           │
│   Auto-sync: ☑ Enabled (weekly)                    │
│   [Check for New Results]                           │
│                                                      │
│ CIF Classification:                                 │
│   Division: [Division II_____] (dropdown)           │
│   League: [MHAL____________]                        │
│   Section: [CCS____________]                        │
│                                                      │
│ Contact Information:                                │
│   Head XC Coach: [________________]                 │
│   Email: [________________]                         │
│   Website: [________________]                       │
│                                                      │
│ Statistics:                                         │
│   Athletes: 42                                      │
│   Results: 1,234                                    │
│   Meets attended: 8 (this season)                   │
│                                                      │
│ [Save Changes] [View Team Page]                     │
└─────────────────────────────────────────────────────┘
```

---

**Auto-Import After ath_net_id Added:**

**Trigger workflow:**
```typescript
// When coach adds Athletic.net ID
async function onSchoolAthNetIdAdded(schoolId: number, athNetId: string) {
  // 1. Verify the ID is valid
  const isValid = await verifyAthleticNetSchoolId(athNetId);

  if (!isValid) {
    throw new Error('Invalid Athletic.net school ID');
  }

  // 2. Queue background scrape job
  await supabase.from('scrape_queue').insert({
    school_id: schoolId,
    ath_net_school_id: athNetId,
    scrape_type: 'historical_import',
    status: 'pending',
    seasons_to_scrape: [2024, 2023, 2022, 2021, 2020]  // Last 5 years
  });

  // 3. Notify coach
  await sendEmail({
    to: coach.email,
    subject: 'Historical Results Import Queued',
    body: `
      We're importing all Westmont HS results from Athletic.net.
      This may take 10-15 minutes.
      You'll receive an email when complete.
    `
  });

  // 4. Background worker processes queue
  // Scrapes all meets for school across all seasons
  // Imports results automatically
}
```

---

**Import Code Fix: Capture ath_net_id**

**Current:** Scraper is RUN with school ID but doesn't store it

**Fix in batch-import/route.ts:**
```typescript
// When processing meets from scraped JSON
// Extract the school ID from the scrape context

// Option 1: Pass as parameter to batch-import
const { csvFile, jsonFile, sourceSchoolId } = body;

// Option 2: Store in JSON file metadata
const jsonData = JSON.parse(jsonContent);
const sourceSchoolId = jsonData.metadata?.schoolId;  // Add to scraper output

// Create/update school with ath_net_id
const { data: school } = await supabase
  .from('schools')
  .upsert({
    name: 'Westmont High School',  // From results
    ath_net_id: sourceSchoolId,     // STORE THIS!
    last_synced_at: new Date().toISOString()
  }, {
    onConflict: 'ath_net_id'
  })
  .select()
  .single();
```

---

**Scraper Enhancement: Include School ID in Output**

**Update `athletic-net-scraper-v2.js`:**
```javascript
// At end of scraping, add metadata
const output = {
  metadata: {
    schoolId: schoolId,  // The 1076 we used to scrape
    schoolName: 'Westmont High School',  // Extract from page
    scrapedAt: new Date().toISOString(),
    season: season
  },
  meets: allMeets
};

fs.writeFileSync(jsonFile, JSON.stringify(output, null, 2));
```

---

**Decision Summary:**

1. **Immediate fix**: Update scraper to include school ID in JSON metadata
2. **Import fix**: Extract and store ath_net_id when importing
3. **Coach workflow**: Allow coaches to claim schools and add Athletic.net ID
4. **Auto-sync**: When ath_net_id added, queue historical import
5. **Manual entry**: City/state/division entered by coach (not scrapeable)
6. **Future**: School profile completion checklist

---

## Summary of ALL Table Analysis

**Tables analyzed:** 6/6 ✅
1. ✅ Meets - Good (remove 2 unused fields)
2. ⚠️ Courses → Rename to Venues + create true Courses table
3. ✅ Races - Good (remove 1 field, move rating to courses)
4. ✅ Results - Excellent (add audit trail fields)
5. ⚠️ Athletes - Critical missing data (graduation_year, PRs)
6. ⚠️ Schools - Minimal metadata (coach-managed profiles needed)

**Total rows imported:**
- 8 meets
- 4 venues ("courses")
- 75 races
- 5,733 results
- 3,828 athletes
- Multiple schools

**Import SUCCESS** - Data is in the system! ✅

**Next step:** Create comprehensive schema migration plan to implement all improvements before re-importing.
   - [ ] Any duplicate athletes?
   - [ ] Are names split correctly (first/last)?
   - [ ] Is gender stored as 'M'/'F' strings?

6. **Schools Table**
   - [ ] Any duplicate schools?
   - [ ] Are school names consistent?

---

## Next Iteration Plan

After completing Phase 5 verification:

1. **Document final schema decisions**
2. **Update scraper to extract race IDs**
3. **Refine course/venue data model**
4. **Add progress indicators to import UI**
5. **Clean database and re-import with improvements**
6. **Validate against real-world queries** (course records, team rankings, etc.)

---

**Goal**: Best-in-class data architecture for high school XC analytics platform
