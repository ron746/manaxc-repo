# Admin Import Workflow - Single Race with Course Verification

## Overview
Import a single race with admin verification at each step, especially for course matching and difficulty rating.

## Workflow Steps

### Step 1: Upload & Parse CSV
**Admin Action**: Upload CSV file (or paste Athletic.net data)

**System Action**:
- Parse CSV to extract:
  - Meet info (name, date)
  - Race info (distance, division, gender from race name)
  - Athlete results (name, time, place, grade)
- Display preview table with 5-10 sample rows

**UI Display**:
```
📄 CSV Parsed Successfully
───────────────────────────
Meet: Crystal Springs Invitational
Date: Oct 11, 2025
Distance: 2.95 Miles (4748 meters)
Division: Varsity
Athletes: 45 results found

Sample Results:
Place | Name              | Grade | Time     | School
─────────────────────────────────────────────────────
1     | Shane Dalziel     | 11    | 15:32.30 | Westmont
2     | Ojas Joshi        | 12    | 16:28.80 | Westmont
...

[Continue] [Cancel]
```

---

### Step 2: Match/Create Venue
**System Action**:
- Search venues table for match:
  - By name (fuzzy match on "Crystal Springs")
  - By Athletic.net ID (if available)
  - By location

**If venue found**:
```
✅ Venue Found
───────────────
Name: Crystal Springs
Location: Belmont, CA
Surface: Grass/Dirt
Terrain: Rolling hills
Courses at this venue: 3 (2.13mi, 2.95mi, 5K)

[Use This Venue] [Create New Venue]
```

**If venue NOT found**:
```
❓ Venue Not Found: "Crystal Springs"
──────────────────────────────────────
Create new venue?

Name: [Crystal Springs          ]
Location: [Belmont, CA          ]
City: [Belmont                  ]
State: [CA]
Surface Type: [Grass/Dirt ▼]
Terrain: [Rolling hills ▼]
  Options: Flat, Rolling hills, Hilly, Very hilly, Challenging

[Create Venue] [Search Again] [Cancel]
```

---

### Step 3: Match/Create Course
**System Action**:
- Search for course at this venue with matching distance (±10m tolerance)

**If course found with rating**:
```
✅ Course Found
───────────────
Venue: Crystal Springs
Course: Crystal Springs | 2.95 Miles
Distance: 4748 meters (2.95 miles)
Difficulty Rating: 1.177 (17.7% harder than track)
Last updated: Oct 18, 2025
Used in 15 previous races

[Use This Course] [Create New Course] [Edit Rating]
```

**If course found WITHOUT rating**:
```
⚠️  Course Found (No Difficulty Rating)
────────────────────────────────────────
Venue: Crystal Springs
Course: Crystal Springs | 2.95 Miles
Distance: 4748 meters
Difficulty Rating: NOT SET

How would you like to set the difficulty?

Option 1: Use Preset
[Fast ▼] [Easy] [Average] [Moderate] [Hard] [Slow]

Option 2: Enter Custom Value
Difficulty: [1.177] (1.0 = track speed)

Option 3: Estimate from Data
[Calculate from average times] (requires 20+ results)

Reason for rating: [Initial estimate for Crystal Springs 2.95mi course]

[Set Rating & Continue] [Skip for Now]
```

**If course NOT found**:
```
❓ Course Not Found at Crystal Springs
───────────────────────────────────────
Create new course?

Venue: Crystal Springs (Belmont, CA)
Course Name: [Crystal Springs | 2.95 Miles]
Distance: [4748] meters ([2.95] miles)

Set Difficulty Rating:
⚪ Fast (0.85) - Very fast, easier than track
⚪ Easy (0.95) - Mostly flat, minimal obstacles
⚪ Average (1.00) - Similar to flat track
⚪ Moderate (1.10) - Some hills or terrain ✓
⚪ Hard (1.20) - Significant hills
⚪ Slow (1.35) - Very challenging
⚪ Custom: [_____]

Reason: [New course at Crystal Springs, estimated based on venue terrain]

[Create Course] [Cancel]
```

---

### Step 4: Verify Race Details
**Admin Action**: Confirm/edit race information

**UI Display**:
```
🏁 Verify Race Details
──────────────────────
Meet: Crystal Springs Invitational
Date: Oct 11, 2025
Season Year: 2025

Course: Crystal Springs | 2.95 Miles
Venue: Crystal Springs (Belmont, CA)
Distance: 4748m (2.95 miles)
Difficulty: 1.177

Race Details:
Division: [Varsity ▼] (Varsity, JV, Frosh, Reserves)
Gender: [Boys ▼] (Boys, Girls, Mixed)
Name: [Varsity Boys] (auto-generated)

Results: 45 athletes
Schools: 8 schools

[Continue] [Edit] [Cancel]
```

---

### Step 5: Match/Create Athletes
**System Action**: For each athlete in results:

**If athlete found** (match by name + grad_year + school):
```
✅ Athlete Found
────────────────
Name: Adrian Ketterer
School: Westmont
Grad Year: 2026
Gender: M
Previous races: 12

[Use This Athlete] [Create New]
```

**If athlete NOT found**:
```
❓ New Athlete
──────────────
Name: [Adrian Ketterer]
First: [Adrian]
Last: [Ketterer]
School: Westmont
Grad Year: [2026] (calculated from grade 11 in 2025)
Gender: [M ▼] (from race division)

[Create Athlete] [Skip This Result]
```

**Batch processing**:
```
👥 Processing Athletes (45 total)
─────────────────────────────────
✅ Found: 32 existing athletes
🆕 New: 13 athletes to create

Show details for:
[All] [New Only] [Conflicts Only]

[Create All New Athletes] [Review Individually]
```

---

### Step 6: Review & Import
**Admin Action**: Final review before import

**UI Display**:
```
📊 Import Summary
─────────────────
✅ Ready to Import

Meet:
  • Crystal Springs Invitational (Oct 11, 2025)
  • Season: 2025

Course:
  • Crystal Springs | 2.95 Miles
  • Venue: Crystal Springs (Belmont, CA)
  • Difficulty: 1.177 (17.7% harder than track)

Race:
  • Varsity Boys
  • Distance: 4748m
  • 45 results

Athletes:
  • 32 existing
  • 13 new (will be created)

Results:
  • 45 total
  • Times: 15:32.30 (fastest) to 24:40.13 (slowest)
  • All times validated ✓

[Import Race] [Back] [Cancel]
```

---

### Step 7: Post-Import Actions
**System Action**: After successful import

**UI Display**:
```
✅ Import Complete!
───────────────────
Race ID: abc123-def456

Imported:
✓ 1 meet
✓ 1 race
✓ 13 new athletes
✓ 45 results

Next Actions:
[View Race Results] [Import Another Race] [Done]

Optional:
[Refresh Materialized Views]
[Update Course Rating] (if you have comparison data)
```

---

## Database Operations

### Import Transaction
All operations wrapped in a single transaction:

```python
def import_single_race_transaction(race_data):
    with database.transaction():
        # 1. Create/find venue
        venue = create_or_find_venue(race_data['venue_info'])

        # 2. Create/find course
        course = create_or_find_course(
            venue_id=venue['id'],
            distance_meters=race_data['distance_meters'],
            difficulty_rating=race_data['difficulty_rating'],
            rating_reason=race_data['rating_reason']
        )

        # 3. Create/find meet
        meet = create_or_find_meet(
            name=race_data['meet_name'],
            date=race_data['meet_date'],
            season_year=race_data['season_year']
        )

        # 4. Create race
        race = create_race(
            meet_id=meet['id'],
            course_id=course['id'],
            name=race_data['race_name'],
            gender=race_data['gender'],
            division=race_data['division'],
            distance_meters=race_data['distance_meters']
        )

        # 5. Create/find athletes and results
        for athlete_result in race_data['results']:
            athlete = create_or_find_athlete(
                name=athlete_result['name'],
                grad_year=athlete_result['grad_year'],
                school_id=athlete_result['school_id'],
                gender=athlete_result['gender']
            )

            create_result(
                athlete_id=athlete['id'],
                race_id=race['id'],
                time_cs=athlete_result['time_cs'],
                place_overall=athlete_result['place'],
                season_year=race_data['season_year']
            )

        # 6. Update race stats
        update_race_stats(race['id'])

        return race
```

---

## Difficulty Rating Decision Tree

```
When creating/matching a course:

1. Does course exist with rating?
   YES → Use existing rating
          Option to update if needed
   NO → Go to step 2

2. Is there a similar course at same venue?
   YES → Suggest copying that rating
          "Crystal Springs 5K has difficulty 1.20,
           use similar for 2.95 mile?"
   NO → Go to step 3

3. Admin chooses:
   A. Preset (Fast/Easy/Average/Moderate/Hard/Slow)
   B. Custom value (enter number)
   C. Calculate from data (if 20+ comparison results)
   D. Leave blank (will default to 1.0)

4. Log the rating with reason:
   - "Admin preset: Moderate"
   - "Admin custom: 1.177"
   - "Calculated from 67 overlapping athletes"
   - "Default - not yet rated"
```

---

## UI Component Specs

### Course Difficulty Picker
```jsx
<CourseDifficultyPicker
  onSelect={(difficulty, reason) => {}}
  currentRating={1.177}
  referenceCourses={[
    { name: "Crystal Springs 5K", difficulty: 1.20 },
    { name: "Crystal Springs 2.13mi", difficulty: 1.10 }
  ]}
/>

Display:
- Visual slider (0.7 to 1.5)
- Preset buttons with descriptions
- Custom input field
- Reference courses comparison
- "Why this rating?" text field
```

### Athlete Matcher
```jsx
<AthleteMatcher
  csvAthlete={{
    name: "Ketterer, Adrian | 2026",
    grade: 11,
    school: "Westmont"
  }}
  possibleMatches={[
    { id: "uuid", name: "Adrian Ketterer", grad_year: 2026, matches: 3 },
    { id: "uuid2", name: "Adrian Ketterer", grad_year: 2027, matches: 1 }
  ]}
  onSelect={(athleteId) => {}}
  onCreate={(athleteData) => {}}
/>

Display:
- Fuzzy matches with confidence score
- Previous results count
- "Create new athlete" option
- Side-by-side comparison
```

---

## Next Steps

1. **Run database cleanup**:
   - Export course ratings backup
   - Run `clean_database.sql`
   - Verify clean state

2. **Create venue table**:
   - Run `create_venue_table.sql`
   - Create initial venues

3. **Build import workflow**:
   - Step-by-step UI components
   - CSV parser with validation
   - Course/venue matching logic
   - Admin review screens

4. **Test with single race**:
   - Crystal Springs Varsity 2025
   - Verify all data imported correctly

5. **Build web pages**:
   - Race results view
   - Athlete profile
   - Course profile

Ready to proceed?
