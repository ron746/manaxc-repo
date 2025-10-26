# Single Race Import - Ideal Parsing Plan

## Goal
Import ONE race correctly with perfect data quality, then build web pages to view it.

## Race Selection
**Recommended**: Crystal Springs Invitational 2025 - Varsity Boys 2.95 Miles
- **Why**: Well-known course, good difficulty rating (1.177), recent data
- **Date**: Oct 11, 2025 (meet ID: 254535 from Athletic.net)
- **Athletes**: ~50 Westmont results available

## Data Requirements

### 1. Meet Data
```json
{
  "meet_id": "generated-uuid",
  "name": "Crystal Springs Invitational",
  "meet_date": "2025-10-11",
  "season_year": 2025,
  "athletic_net_id": 254535,  // For duplicate detection
  "host_school_id": null,     // Optional
  "notes": "Imported from Athletic.net scraper"
}
```

### 2. Course Data
```json
{
  "course_id": "existing-uuid",  // Use existing Crystal Springs | 2.95 Miles
  "name": "Crystal Springs | 2.95 Miles",
  "distance_meters": 4748,
  "difficulty_rating": 1.177,
  "location": "Belmont, CA"
}
```

### 3. Race Data
```json
{
  "race_id": "generated-uuid",
  "meet_id": "from-step-1",
  "course_id": "from-step-2",
  "name": "Varsity",
  "gender": "M",  // String, not boolean
  "division": "Varsity",
  "distance_meters": 4748,
  "total_participants": 150,  // Calculate from results
  "athletic_net_id": "254535_varsity_boys"  // Composite key for dedup
}
```

### 4. Athlete Data
```json
{
  "athlete_id": "uuid",
  "name": "Adrian Ketterer",  // Format: "First Last"
  "first_name": "Adrian",
  "last_name": "Ketterer",
  "grad_year": 2026,  // From Athletic.net suffix or calculation
  "gender": "M",      // From race or CSV
  "school_id": "westmont-uuid",
  "athletic_net_id": null  // Optional: from scraper
}
```

### 5. Results Data
```json
{
  "result_id": "uuid",
  "athlete_id": "from-step-4",
  "race_id": "from-step-3",
  "time_cs": 98770,  // 16:27.70 in centiseconds
  "place_overall": 7,
  "season_year": 2025  // Denormalized
}
```

## Parsing Rules

### Time Conversion
```python
def parse_time_to_centiseconds(time_str):
    """
    Parse "MM:SS.ss" to centiseconds

    Examples:
    "16:27.70" → 98770
    "15:30.00" → 93000
    "DNF" → None
    "NT" → None
    """
    if not time_str or time_str in ['DNF', 'NT', 'DNS']:
        return None

    match = re.match(r'(\d+):(\d+)\.(\d+)', time_str)
    if not match:
        return None

    minutes = int(match.group(1))
    seconds = int(match.group(2))
    centiseconds = int(match.group(3))

    return minutes * 6000 + seconds * 100 + centiseconds
```

### Name Parsing
```python
def parse_athlete_name(name_str):
    """
    Parse athlete name from various formats

    Formats supported:
    1. "Ketterer, Adrian | 2026" → ("Adrian Ketterer", "Adrian", "Ketterer", 2026)
    2. "Adrian Ketterer" → ("Adrian Ketterer", "Adrian", "Ketterer", None)
    3. "Ketterer, Adrian" → ("Adrian Ketterer", "Adrian", "Ketterer", None)

    Rules:
    - NO middle names (keep it simple)
    - NO suffixes (Jr., III, etc.) for now
    - Extract grad year if present (after "|")
    """
    if not name_str:
        return None, None, None, None

    # Extract grad year if present
    grad_year = None
    if '|' in name_str:
        parts = name_str.split('|')
        name_str = parts[0].strip()
        try:
            grad_year = int(parts[1].strip())
        except:
            pass

    # Handle "Last, First" format
    if ',' in name_str:
        parts = name_str.split(',', 1)
        last_name = parts[0].strip()
        first_name = parts[1].strip() if len(parts) > 1 else ''
        full_name = f"{first_name} {last_name}".strip()
    else:
        # Assume "First Last" format
        full_name = name_str.strip()
        parts = full_name.split(maxsplit=1)
        first_name = parts[0] if parts else ''
        last_name = parts[1] if len(parts) > 1 else ''

    return full_name, first_name, last_name, grad_year
```

### Gender Detection
```python
def determine_gender(race_name=None, athlete_name=None, gender_csv=None):
    """
    Determine gender with priority order

    Priority:
    1. Gender from CSV (if available)
    2. Race name keywords ("Boys", "Girls", "(M)", "(F)")
    3. Default to None (require manual input)

    DO NOT use a hardcoded list of female names - too error-prone
    """
    # Check CSV first
    if gender_csv:
        return gender_csv.upper()

    # Check race name
    if race_name:
        race_lower = race_name.lower()
        if 'boys' in race_lower or ' (m)' in race_lower:
            return 'M'
        if 'girls' in race_lower or ' (f)' in race_lower:
            return 'F'

    # Default: require manual input or fail
    return None  # Force user to specify
```

### Graduation Year Calculation
```python
def calculate_grad_year(grade=None, season_year=None, name_suffix_year=None):
    """
    Calculate graduation year

    Priority:
    1. Grad year from name suffix (e.g., "| 2026")
    2. Calculation from grade level (grade 9 in 2025 → 2029)
    3. Return None if insufficient data

    Formula: grad_year = season_year + (13 - grade)
    Examples:
    - Grade 9 in 2025 → 2025 + 4 = 2029
    - Grade 12 in 2025 → 2025 + 1 = 2026
    """
    # Priority 1: Name suffix
    if name_suffix_year:
        return name_suffix_year

    # Priority 2: Calculate from grade
    if grade and season_year:
        return season_year + (13 - int(grade))

    # Insufficient data
    return None
```

## Import Workflow

### Step 1: Prepare Data Source
```bash
# Use existing CSV from Athletic.net scraper
CSV_FILE="/Users/ron/manaxc/2025-westmont/athletic-net-1076-2025-results.csv"

# Filter to single race
python3 << 'EOF'
import csv

# Read and filter
with open('athletic-net-1076-2025-results.csv', 'r') as f:
    reader = csv.DictReader(f)
    results = [row for row in reader
               if row['meet_athletic_net_id'] == '254535'
               and row['race_name'] == '2.95 Miles Varsity'
               and row['school_name'] == 'Westmont']

# Write filtered results
with open('crystal_springs_varsity_2025.csv', 'w') as f:
    if results:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

print(f"Extracted {len(results)} results for Westmont Varsity at Crystal Springs")
EOF
```

### Step 2: Validate Data
```python
# Check for:
# 1. All required columns present
# 2. Valid times (no DNF, NT in time_cs column)
# 3. Valid graduation years (2024-2030 range)
# 4. No duplicate athletes in same race
# 5. Course exists in database
```

### Step 3: Import to Database
```python
def import_single_race(csv_file):
    """Import single race with perfect data quality"""

    # 1. Create/find meet
    meet = create_or_find_meet(
        name="Crystal Springs Invitational",
        date="2025-10-11",
        season_year=2025,
        athletic_net_id=254535
    )

    # 2. Find course
    course = find_course(
        name="Crystal Springs | 2.95 Miles"
    )

    # 3. Create race
    race = create_race(
        meet_id=meet['id'],
        course_id=course['id'],
        name="Varsity",
        gender="M",
        distance_meters=4748
    )

    # 4. Process athletes
    for row in read_csv(csv_file):
        athlete = create_or_find_athlete(
            name=parse_name(row['athlete_full_name']),
            grad_year=int(row['graduation_year']),
            school_name="Westmont"
        )

        # 5. Create result
        create_result(
            athlete_id=athlete['id'],
            race_id=race['id'],
            time_cs=int(row['time_cs']),
            place_overall=int(row['place_overall']),
            season_year=2025
        )

    print(f"✅ Imported race: {race['name']} ({len(results)} results)")
```

## Web Pages to Build

### Page 1: Meet Results (`/meets/[id]`)
Display:
- Meet name and date
- Course name and distance
- All races at the meet
- Link to each race's detailed results

### Page 2: Race Results (`/races/[id]`)
Display:
- Race details (division, gender, distance, course)
- Results table: Place, Name, School, Grade, Time
- Split time stats (if available)
- Course record indicator
- Link to athlete profiles

### Page 3: Athlete Profile (`/athletes/[id]`)
Display:
- Athlete name, school, grad year
- Season best times
- All race results (chronological)
- PR progression chart
- Normalized XC time (using difficulty ratings)

### Page 4: Course Profile (`/courses/[id]`)
Display:
- Course name, location, distance
- Difficulty rating (with history)
- All-time records (by gender)
- Recent races at this course
- Statistical analysis (mean times, distribution)

## Validation Checklist

Before building web pages, verify:
- [ ] Meet exists in database
- [ ] Course exists with correct difficulty rating
- [ ] Race linked to meet and course
- [ ] All athletes have valid grad years (2024-2030)
- [ ] All times are in centiseconds (5-digit to 6-digit numbers)
- [ ] No duplicate results for same athlete in same race
- [ ] Season year is 2025 for all results
- [ ] Gender is "M" (string, not boolean)
- [ ] Total participants matches result count

## Questions for User

1. **Which race should we import first?**
   - Crystal Springs Varsity 2025 (recommended)
   - Montgomery Hill STAL #1 2025
   - Baylands 4K 2025
   - Other?

2. **Data source?**
   - Use existing CSV from Athletic.net scraper
   - Create new filtered CSV
   - Enter data manually for testing?

3. **Gender data?**
   - Trust race name ("Varsity" → infer from division)
   - Require gender column in CSV
   - Manual entry for each athlete?

4. **Athlete deduplication?**
   - Match by name + grad year + school
   - Match by Athletic.net ID (if available)
   - Create new athlete every time (fix later)?

5. **Web framework preference?**
   - Build pages in existing Next.js app (mana-xc)
   - Create standalone Flask/Django app
   - Simple static HTML first?

