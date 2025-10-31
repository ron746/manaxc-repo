# Merge Lincoln Schools in Database

## Issue
Two entries exist for the same school:
- **Abraham Lincoln (SJ)** - Correct name (matches Athletic.net: `school_abraham_lincoln_(sj)`)
- **Lincoln** - Duplicate entry to be merged

## Action Required
Merge all data from "Lincoln" into "Abraham Lincoln (SJ)" and delete the duplicate.

## Steps to Merge:

### 1. Check what data exists for each:
```sql
-- Check Lincoln school
SELECT id, name, athletic_net_id, league, subleague
FROM schools
WHERE name LIKE '%Lincoln%';

-- Check athletes for each school
SELECT s.name as school_name, COUNT(*) as athlete_count
FROM schools s
LEFT JOIN athletes a ON a.school_id = s.id
WHERE s.name LIKE '%Lincoln%'
GROUP BY s.id, s.name;

-- Check results for each school
SELECT s.name as school_name, COUNT(*) as result_count
FROM schools s
LEFT JOIN athletes a ON a.school_id = s.id
LEFT JOIN results r ON r.athlete_id = a.id
WHERE s.name LIKE '%Lincoln%'
GROUP BY s.id, s.name;
```

### 2. Merge athletes:
```sql
-- Get IDs
-- Abraham Lincoln (SJ) ID: (get from query above)
-- Lincoln ID: (get from query above)

-- Update athletes to point to Abraham Lincoln (SJ)
UPDATE athletes
SET school_id = 'abraham-lincoln-sj-id-here'
WHERE school_id = 'lincoln-id-here';
```

### 3. Delete duplicate school:
```sql
-- After all athletes are moved
DELETE FROM schools
WHERE id = 'lincoln-id-here';
```

### 4. Verify:
```sql
-- Should only see one Lincoln school
SELECT name, COUNT(*) as count
FROM schools
WHERE name LIKE '%Lincoln%'
GROUP BY name;
```

## Why This Happened
- Different naming conventions between data sources
- Manual entries vs Athletic.net imports
- Need consistent school name validation

## Prevention
- Always check for existing school before creating
- Use Athletic.net naming as canonical source
- Implement fuzzy matching for school names
