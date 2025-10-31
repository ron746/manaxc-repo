# Import Documentation Index

**Purpose**: Central index for all import-related documentation.

**Last Updated**: 2025-10-30

---

## Documentation Files

### 1. Large Meet Import Guide
**File**: `LARGE_MEET_IMPORT_GUIDE.md`

**Use when**: Importing meets with 2,000+ results

**Key topics**:
- Pre-import preparation
- Comprehensive missing results analysis
- Handling missing athletes and slug collisions
- Performance optimization
- Scaling to 10K+ results
- Post-import checklist

**Critical insight**: Always compare using `(athlete_name, race_id, time_cs)` - NOT just `(race_id, time_cs)`

---

### 2. Identify Missing Data Guide
**File**: `IDENTIFY_MISSING_DATA_GUIDE.md`

**Use when**: Scanning all imported meets to find issues

**Key topics**:
- Quick SQL checks for missing results
- Automated scanning scripts
- Red flag identification (critical vs low priority)
- Diagnostic scripts
- Common patterns in missing data

**Quick start**: Run `scan_all_meets.py` to find all meets with issues

---

### 3. Meet 254378 Case Study
**File**: `MEET_254378_COMPLETE.md`

**Use when**: Referencing a real-world example of complex import

**Key topics**:
- Complete import timeline for 4,655 result meet
- Challenges encountered and solutions
- 23 name capitalization variations (normal behavior)
- Slug collision handling for 11 athletes
- Performance metrics

**Key learning**: Name capitalization differences are NORMAL (~0.5% of results)

---

### 4. Batch System Summary
**File**: `BATCH_SYSTEM_SUMMARY.md`

**Use when**: Understanding trigger management and derived table rebuilds

**Key topics**:
- Disabling/enabling triggers for performance
- Batch rebuild functions
- Orphaned record detection and cleanup

**Critical commands**:
```sql
-- Before large import
ALTER TABLE results DISABLE TRIGGER USER;

-- After import
ALTER TABLE results ENABLE TRIGGER USER;
SELECT batch_rebuild_athlete_best_times();
```

---

### 5. Bulk Import Workflow
**File**: `BULK_IMPORT_WORKFLOW.md`

**Use when**: Importing multiple meets in sequence

**Key topics**:
- Standard import process
- Parallel import strategies
- Error handling and recovery

---

### 6. Optimized Import Logic
**File**: `OPTIMIZED_IMPORT_LOGIC.md`

**Use when**: Understanding performance optimizations in import scripts

**Key topics**:
- Batch insert strategies
- Database connection pooling
- Memory management

---

## Quick Start Guides

### Scenario 1: Importing a Large Meet (3K+ results)

1. **Before import**: Disable triggers
   ```sql
   ALTER TABLE results DISABLE TRIGGER USER;
   ```

2. **Run scraper**:
   ```bash
   python athletic_net_scraper_v2.py meet <MEET_ID>
   ```

3. **Check status**:
   ```bash
   python check_meet_status.py  # Enter meet ID when prompted
   ```

4. **If incomplete**: Run analysis
   ```bash
   # Create from template in LARGE_MEET_IMPORT_GUIDE.md
   python analyze_missing_<MEET_ID>.py
   ```

5. **Import missing data**:
   ```bash
   python import_missing_athletes.py
   python import_missing_results.py
   ```

6. **After import**: Re-enable triggers and rebuild
   ```sql
   ALTER TABLE results ENABLE TRIGGER USER;
   SELECT batch_rebuild_athlete_best_times();
   SELECT batch_rebuild_course_records();
   SELECT batch_rebuild_school_hall_of_fame();
   SELECT batch_rebuild_school_course_records();
   ```

7. **Verify complete**:
   ```bash
   python check_meet_status.py
   ```

---

### Scenario 2: Finding All Meets with Missing Data

1. **Run system scan**:
   ```bash
   # Create from template in IDENTIFY_MISSING_DATA_GUIDE.md
   python scan_all_meets.py
   ```

2. **Review output**: Focus on HIGH priority issues first

3. **Fix large incomplete meets**:
   - Follow Scenario 1 for each meet

4. **Update cached counts**:
   ```sql
   UPDATE meets
   SET result_count = (
       SELECT COUNT(*) FROM results WHERE meet_id = meets.id
   )
   WHERE id IN (...);
   ```

---

### Scenario 3: Verifying a Meet is Complete

**Quick SQL check**:
```sql
SELECT
    m.athletic_net_id,
    m.name,
    m.result_count as cached_count,
    COUNT(r.id) as actual_count,
    m.result_count - COUNT(r.id) as difference
FROM meets m
LEFT JOIN results r ON r.meet_id = m.id
WHERE m.athletic_net_id = '<ATHLETIC_NET_ID>'
GROUP BY m.id, m.name, m.result_count;
```

**If difference = 0**: ✓ Complete

**If difference > 0**: Run analysis (see Scenario 1)

---

## Critical Concepts

### 1. Triple-Key Comparison

**Always use all three fields when comparing CSV to database:**

```python
key = (athlete_name, race_id, time_cs)  # CORRECT
```

**Never use only two fields:**

```python
key = (race_id, time_cs)  # WRONG - Will miss tied times
```

**Why**: Cross country has many tied times. Meet 254378 had 86 different (race_id, time_cs) pairs with 2+ athletes.

---

### 2. Name Variations Are Normal

**Expected patterns** (~0.5% of results):
- Capitalization: `DANIEL SANTANA` vs `Daniel Santana`
- Prefix case: `Christian DePrat` vs `Christian Deprat`
- Multi-part names: `De la Rionda` vs `De La Rionda`

**Action**: None needed - these are the same athlete

**Do NOT**: Flag as duplicates or try to "fix" capitalization

---

### 3. Slug Collisions Require Matching

Athletes with special characters often generate duplicate slugs:
- Apostrophes: `O'Brien`, `D'Ambrosia`
- Hyphens: `Casalins-DeBoskey`
- Accents: `José`, `María`

**Strategy**:
1. Try direct insert
2. If collision, find similar athlete (school + grad year + gender)
3. Use existing if found, otherwise force with custom slug
4. Flag in `potential_duplicate_athletes` for admin review

---

### 4. Disable Triggers for Performance

For imports of 1,000+ results:

**Before**: `ALTER TABLE results DISABLE TRIGGER USER;`

**After**: `ALTER TABLE results ENABLE TRIGGER USER;`

**Impact**: 5-10x faster inserts

**Remember**: Must rebuild derived tables after re-enabling

---

## Common Issues Quick Reference

| Issue | Symptoms | Solution | Priority |
|-------|----------|----------|----------|
| Large meet incomplete | 3K+ meet, >100 missing | Run comprehensive analysis | HIGH |
| Zero results | cached > 0, actual = 0 | Re-import meet | HIGH |
| 1-50 missing | Small percentage missing | Manual analysis + import | MEDIUM |
| Slug collisions | Insert fails with duplicate key | Use matching strategy | MEDIUM |
| Name variations | Comparison shows false missing | Ignore - normal behavior | LOW |
| Orphaned best times | Best times without results | Run cleanup query | LOW |

---

## Performance Benchmarks

**From meet 254378 (4,655 results)**:

| Operation | Time | Memory |
|-----------|------|--------|
| Initial scrape | ~30 min | ~100 MB |
| Bulk import (triggers off) | ~10 min | ~150 MB |
| Analysis (missing results) | ~2 min | ~80 MB |
| Manual cleanup (26 results) | ~30 min | ~50 MB |
| Rebuild derived tables | ~5 min | ~200 MB |
| **Total** | **~75 min** | **~200 MB peak** |

**Scaling estimates**:

| Meet Size | Total Time | Peak Memory |
|-----------|------------|-------------|
| 1K | 20-30 min | ~100 MB |
| 5K | 60-90 min | ~200 MB |
| 10K | 2-3 hours | ~400 MB |
| 20K | 4-6 hours | ~800 MB |

---

## Database Schema Considerations

### Key Tables

**Core tables**:
- `meets` - Meet metadata, cached result_count
- `races` - Individual races within meets
- `results` - Race results (athlete performance)
- `athletes` - Athlete profiles
- `schools` - School information

**Derived tables** (rebuilt after imports):
- `athlete_best_times` - Best times per athlete/distance
- `course_records` - Course records
- `school_hall_of_fame` - Top school performances
- `school_course_records` - School records by course

**Quality tables**:
- `potential_duplicates` - Results with conflicting data
- `potential_duplicate_athletes` - Athletes with ambiguous matches

### Key Constraints

**Results table unique constraint**:
```sql
UNIQUE (athlete_id, meet_id, race_id, time_cs, data_source)
```

**Why**: Prevents duplicate results for same athlete in same race with same time

**Impact**: Can't insert identical result twice (good), but tied times need different athlete_id

---

## Next Steps

After reading this index:

1. **For large meet imports**: Read `LARGE_MEET_IMPORT_GUIDE.md` first
2. **For system scanning**: Read `IDENTIFY_MISSING_DATA_GUIDE.md`
3. **For real examples**: Review `MEET_254378_COMPLETE.md`
4. **For batch operations**: Check `BATCH_SYSTEM_SUMMARY.md`

---

## Maintenance

**Update this documentation when**:
- New import patterns emerge
- Performance improves significantly
- New error types discovered
- Database schema changes

**Document location**: `/Users/ron/manaxc/manaxc-project/code/importers/`

---

## Support

If you encounter issues not covered in these guides:

1. Check error message against common issues
2. Search previous import logs
3. Review case studies (like meet 254378)
4. Document new patterns for future reference

---

## Changelog

- **2025-10-30**: Initial documentation set created based on meet 254378 import
  - LARGE_MEET_IMPORT_GUIDE.md
  - IDENTIFY_MISSING_DATA_GUIDE.md
  - MEET_254378_COMPLETE.md
  - This index file
