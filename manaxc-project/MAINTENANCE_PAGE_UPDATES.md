# Admin Maintenance Page Updates Needed

**Last Updated:** October 28, 2025 (Late Sprint)
**Status:** 🚧 IN PROGRESS - Foundation laid, UI implementation pending
**See also:** `/CLAUDE_PROMPT.md` for full context
**File Location:** `/Users/ron/manaxc/manaxc-project/website/app/admin/maintenance/page.tsx`

## Database Changes Required

### 1. Run this SQL in Supabase Dashboard

File created: `/Users/ron/manaxc/manaxc-project/website/ADD_SCHOOL_FIELDS.sql`

```sql
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS subleague TEXT,
ADD COLUMN IF NOT EXISTS cif_division TEXT;

CREATE INDEX IF NOT EXISTS idx_schools_league ON schools(league);
CREATE INDEX IF NOT EXISTS idx_schools_subleague ON schools(subleague);
CREATE INDEX IF NOT EXISTS idx_schools_cif_division ON schools(cif_division);
```

## Features to Add to `/app/admin/maintenance/page.tsx`

### 1. Schools Section (STARTED - needs completion)
**Status:** Interface and state added, needs UI implementation

**Features needed:**
- List all schools with search
- Inline editing for:
  - League (dropdown: BVAL, WCAL, etc.)
  - Subleague (dropdown: Mt Hamilton, Valley, etc.)
  - CIF Division (dropdown: Division 1, Division 2, Division 3, etc.)
- Save changes to Supabase

### 2. Venues Section (NEW - needs implementation)
**Features needed:**
- List all venues with search
- Add new venue button with form:
  - Name
  - Location
  - City
  - State
- Edit existing venues
- Delete venues (with warning if courses are assigned)

### 3. Course-Venue Assignment (Enhancement to existing Courses section)
**Features needed:**
- Add venue dropdown to each course row
- Allow assigning/changing course venue_id
- Show current venue name if assigned
- Filter: "Show only courses without venues"

## Implementation Priority

1. **FIRST**: Run the SQL migration to add school fields
2. **SECOND**: Complete Schools section UI (for league/division filtering on season page)
3. **THIRD**: Add Venues section
4. **FOURTH**: Add venue assignment to Courses section

## Current Progress

✅ School interface defined
✅ School state management added
✅ loadSchools() function added
✅ useEffect updated to load schools
✅ Select All/Deselect All added to Season page

⏳ Need to add Schools section UI with dropdown editors
⏳ Need to add updateSchool() function
⏳ Need to add Venues section (full CRUD)
⏳ Need to enhance Courses section with venue dropdown

## Common Dropdown Values

### Leagues
- BVAL (Blossom Valley Athletic League)
- WCAL (West Catholic Athletic League)
- SCVAL (Santa Clara Valley Athletic League)
- PAL (Peninsula Athletic League)
- PCAL (Pacific Coast Athletic League)

### BVAL Subleagues
- Mt Hamilton Division
- Valley Division
- West Valley Division

### CIF Divisions
- Division 1
- Division 2
- Division 3
- Division 4
- Division 5

## Next Steps for Claude

When you continue this work:

1. Add `updateSchool()` function to update league/subleague/cif_division
2. Add Schools section UI to the section selector (after line 371 in maintenance page)
3. Add Venues interface, state, and CRUD functions
4. Add Venues section UI
5. Enhance Courses section with venue dropdown

The foundation is laid - just needs the UI implementation!
