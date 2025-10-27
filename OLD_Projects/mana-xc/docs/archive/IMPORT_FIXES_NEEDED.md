# Critical Import Fixes Needed

## Issues Identified (Oct 18, 2025)

### 1. **Course Data Issues**
- ❌ Course names contain full location (e.g., "Crystal Springs, CA  US")
- ❌ City field contains what should be the course name
- ❌ Missing distance_meters (should parse from race names)
- ✅ FIX: Parse location properly - "Crystal Springs" as name, "CA" as state

### 2. **Race Data Issues**
- ❌ Not linked to courses (course_id is NULL)
- ❌ Gender stored as boolean (true/false) instead of string ('M'/'F')
- ❌ total_participants is 0 (should count results)
- ❌ Has ath_net_id (not needed in race table)
- ✅ FIX: Link to courses, use proper gender format, calculate participants

### 3. **Meet Data Issues**
- ❌ Missing season_year field
- ✅ FIX: Extract year from meet_date

### 4. **Results Data Issues**
- ❌ Missing season_year field
- ✅ FIX: Extract year from meet date

### 5. **Athlete Name Parsing**
- ❌ AI is making errors parsing names
- ❌ CSV already has clean "Athlete" field with full name
- ✅ FIX: Use simple last-word-is-lastname parsing, no AI needed

### 6. **Schools Data Issues**
- ❌ Missing ath_net_id (Athletic.net school identifier)
- ✅ FIX: Would need separate scraping to get school IDs

## Recommended Fix Strategy

### Option 1: Clean Database & Re-import (RECOMMENDED)
1. Delete all imported data
2. Fix import code
3. Re-import with clean data

### Option 2: Update In-Place
1. Run SQL updates to fix existing data
2. More complex, risk of data loss

## New Import Code Requirements

```typescript
// Course parsing
const locationParts = location.split(',').map(s => s.trim());
const courseName = locationParts[0]; // "Crystal Springs"
const city = locationParts[0]; // "Crystal Springs"
const state = locationParts[1] || 'CA'; // "CA"

// Gender: Keep as string
gender: race.gender // 'M' or 'F', not boolean

// Athlete name parsing (simple, reliable)
const nameParts = fullName.trim().split(/\s+/);
const lastName = nameParts[nameParts.length - 1];
const firstName = nameParts.slice(0, -1).join(' ');

// Season year extraction
const seasonYear = new Date(meetDate).getFullYear();

// Total participants (after all results imported)
// Run UPDATE races SET total_participants = (SELECT COUNT(*) FROM results WHERE race_id = races.id)
```

## SQL to Clean Existing Data

```sql
-- Delete all imported data to start fresh
DELETE FROM results;
DELETE FROM races;
DELETE FROM meets;
DELETE FROM courses WHERE id IN (SELECT id FROM courses WHERE name LIKE '%,%'); -- Bad courses
DELETE FROM athletes WHERE id NOT IN (SELECT DISTINCT athlete_id FROM results); -- Orphaned athletes
DELETE FROM schools WHERE id NOT IN (SELECT DISTINCT current_school_id FROM athletes); -- Orphaned schools
```

## Schema Fixes Needed

```sql
-- Change gender back to TEXT in races table
ALTER TABLE races ALTER COLUMN gender TYPE TEXT;

-- Ensure season_year exists
ALTER TABLE meets ADD COLUMN IF NOT EXISTS season_year INTEGER;
ALTER TABLE results ADD COLUMN IF NOT EXISTS season_year INTEGER;

-- Add ath_net_id to schools (optional)
ALTER TABLE schools ADD COLUMN IF NOT EXISTS ath_net_id TEXT;
```
