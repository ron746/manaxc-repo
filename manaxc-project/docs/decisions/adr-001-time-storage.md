# ADR-001: Time Storage in Centiseconds

**Date:** October 22, 2025
**Status:** ✅ ACCEPTED
**Decision Maker:** Ron Ernst (Head Coach, Domain Expert)

---

## Context

We need to decide how to store race times in the database. The choice affects:
- Data precision
- Record accuracy
- Sorting performance times
- Displaying PRs
- Course records

## Decision

**Store all times as INTEGER centiseconds (not seconds, not decimals)**

### Format
- Race time: 19:30.45
- Stored as: `117045` (centiseconds)
- Database type: `INTEGER`
- Field name: `time_cs`

### Examples
```
17:30.00 → 105000 centiseconds
19:30.45 → 117045 centiseconds
16:45.32 → 100532 centiseconds
```

---

## Rationale

### 1. **Domain Expert Requirement**
Ron's quote: "Runners and coaches want accurate course records, PRs and care deeply about data"

- In XC, 0.01 seconds matters for records
- PRs are celebrated to the hundredth
- Course records are tracked precisely
- Athletes care about every centisecond

### 2. **Data Precision**
- Centiseconds = 0.01 second precision
- Matches official race timing systems
- No rounding errors
- Preserves exact times from Athletic.net

### 3. **Technical Advantages**
- **INTEGER is fast** - Sorting, indexing, comparisons
- **No floating point errors** - 19.30 vs 19.299999
- **Database-friendly** - Standard SQL operations
- **Easy math** - MIN(), MAX(), AVG() work perfectly

### 4. **Proven Pattern**
- OLD project v2.4 used centiseconds successfully
- Battle-tested with thousands of results
- No issues encountered

### 5. **Industry Standard**
- Athletic.net stores centiseconds
- Professional timing systems use centiseconds
- NCAA/NFHS official results use centiseconds

---

## Consequences

### Positive
✅ Precise record keeping (0.01 second accuracy)
✅ Fast database operations (INTEGER indexing)
✅ No floating point rounding issues
✅ Matches official timing data
✅ Easy to sort and compare times
✅ Simple conversion for display (divide by 100)

### Negative
⚠️ Must convert for display (117045 → "19:30.45")
⚠️ All code must use this standard consistently
⚠️ Import data must convert to centiseconds

### Mitigation
- Create utility functions for conversion
- Document standard clearly
- Use consistent field naming: `time_cs`
- Validate imports convert correctly

---

## Implementation

### Database Schema
```sql
-- Results table
CREATE TABLE results (
  id UUID PRIMARY KEY,
  athlete_id UUID REFERENCES athletes(id),
  meet_id UUID REFERENCES meets(id),
  time_cs INTEGER NOT NULL CHECK (time_cs > 0),
  -- time_cs examples:
  -- 16:45.32 = 100532
  -- 19:30.00 = 117000
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast sorting
CREATE INDEX idx_results_time ON results(time_cs);
```

### Display Functions
```sql
-- Format for display: 117045 → "19:30.45"
CREATE OR REPLACE FUNCTION format_time_cs(cs INTEGER)
RETURNS TEXT AS $$
DECLARE
  total_seconds INTEGER;
  minutes INTEGER;
  seconds INTEGER;
  centis INTEGER;
BEGIN
  total_seconds := cs / 100;
  minutes := total_seconds / 60;
  seconds := total_seconds % 60;
  centis := cs % 100;

  RETURN LPAD(minutes::TEXT, 2, '0') || ':' ||
         LPAD(seconds::TEXT, 2, '0') || '.' ||
         LPAD(centis::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Example: SELECT format_time_cs(117045); → "19:30.45"
```

### Parse Function
```sql
-- Parse "19:30.45" → 117045
CREATE OR REPLACE FUNCTION parse_time_to_cs(time_str TEXT)
RETURNS INTEGER AS $$
DECLARE
  parts TEXT[];
  time_parts TEXT[];
  minutes INTEGER;
  seconds INTEGER;
  centiseconds INTEGER;
BEGIN
  -- Split on colon: "19:30.45" → ["19", "30.45"]
  parts := STRING_TO_ARRAY(time_str, ':');
  minutes := parts[1]::INTEGER;

  -- Split seconds on dot: "30.45" → ["30", "45"]
  time_parts := STRING_TO_ARRAY(parts[2], '.');
  seconds := time_parts[1]::INTEGER;
  centiseconds := COALESCE(time_parts[2]::INTEGER, 0);

  -- Calculate total centiseconds
  RETURN (minutes * 60 * 100) + (seconds * 100) + centiseconds;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Example: SELECT parse_time_to_cs('19:30.45'); → 117045
```

### JavaScript/TypeScript
```typescript
// Format: 117045 → "19:30.45"
export function formatTimeCs(centiseconds: number): string {
  const totalSeconds = Math.floor(centiseconds / 100);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const cs = centiseconds % 100;

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

// Parse: "19:30.45" → 117045
export function parseTimeToCs(timeStr: string): number {
  const [minutesStr, secondsStr] = timeStr.split(':');
  const [secsStr, centisStr] = secondsStr.split('.');

  const minutes = parseInt(minutesStr);
  const seconds = parseInt(secsStr);
  const centis = parseInt(centisStr || '0');

  return (minutes * 60 * 100) + (seconds * 100) + centis;
}
```

---

## Validation Rules

### Import Validation
```sql
-- Ensure time_cs is reasonable for XC (8:00 to 35:00)
ALTER TABLE results
ADD CONSTRAINT check_time_cs_range
CHECK (time_cs >= 48000 AND time_cs <= 210000);
-- 48000 cs = 8:00.00 (fast!)
-- 210000 cs = 35:00.00 (slow/walk)
```

### Field Naming Convention
- **Always use:** `time_cs` (not `time`, not `duration`, not `seconds`)
- **This signals:** Value is in centiseconds
- **Prevents:** Confusion and bugs

---

## Migration from OLD Project

The OLD project already used centiseconds, so:
- ✅ Database schema matches
- ✅ No data conversion needed
- ✅ Can reuse utility functions
- ✅ Import scripts work as-is

---

## Comparison with Alternatives

### Alternative 1: Store as SECONDS (INTEGER)
- ❌ Loses precision (can't store 19:30.45, only 19:30)
- ❌ Doesn't match official results
- ❌ Athletes would complain about lost PRs
- ✅ Slightly simpler (no conversion)

**Verdict:** Unacceptable. Precision matters to coaches and athletes.

### Alternative 2: Store as DECIMAL(6,2)
- ✅ Can store precision
- ❌ Floating point rounding errors
- ❌ Slower indexing than INTEGER
- ❌ More complex sorting
- ❌ Database type varies by system

**Verdict:** Technically inferior to INTEGER centiseconds.

### Alternative 3: Store as FLOAT/DOUBLE
- ❌ Floating point errors (19.30 != 19.299999)
- ❌ Comparison issues
- ❌ Sorting problems
- ❌ NOT recommended for currency/precision data

**Verdict:** Never use FLOAT for precise data.

---

## References

- **OLD Project:** Used centiseconds successfully in v2.4
- **Athletic.net:** Stores times in centiseconds
- **TFRRS:** Uses centiseconds
- **MileSplit:** Uses centiseconds
- **Industry Standard:** Centiseconds for timing

---

## Review & Approval

**Reviewed by:** Ron Ernst, Head XC/Track Coach (10+ years)
**Approved by:** Ron Ernst, Technical Lead
**Date:** October 22, 2025
**Status:** ✅ FINAL - DO NOT CHANGE

---

## Notes

This decision is **NON-NEGOTIABLE** because:
1. Domain expert requirement (Ron)
2. Athletes care about precision
3. Course records must be exact
4. Industry standard
5. Proven pattern from OLD project

**All code, imports, and displays MUST follow this standard.**

---

**END OF ADR-001**
