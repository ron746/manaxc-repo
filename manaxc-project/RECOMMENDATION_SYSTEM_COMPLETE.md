# Course Difficulty Recommendation System - Complete

**Status:** ✅ READY FOR TESTING
**Date:** October 30, 2025
**Session:** Continuation from evening session

## What Was Built

A complete recommendation storage and approval system that allows you to:

1. **Run network calibration** - saves 20+ recommendations to database
2. **Run AI analysis** - saves individual course recommendations to database
3. **Review recommendations side-by-side** - network vs AI on course analysis page
4. **Manually approve or dismiss** - course-by-course basis
5. **Track audit trail** - who applied what, when, and why

## Files Created

### 1. Database Migration
**File:** `website/supabase/migrations/20251030_create_course_recommendations.sql`

Creates table: `course_difficulty_recommendations`

**Fields:**
- `id` - UUID primary key
- `course_id` - References courses table
- `recommended_difficulty` - numeric(12,9)
- `current_difficulty` - numeric(12,9)
- `source` - 'network_calibration' or 'ai_analysis'
- `confidence` - float (0.0 to 1.0)
- `shared_athletes_count` - int
- `median_ratio` - float
- `reasoning` - jsonb (stores detailed analysis)
- `created_at` - timestamptz
- `applied_at` - timestamptz (nullable)
- `applied_by` - text (nullable)
- `dismissed_at` - timestamptz (nullable)
- `dismissed_by` - text (nullable)
- `notes` - text (nullable)

**Unique constraint:** (course_id, source) - only one active recommendation per source per course

### 2. API Endpoint for Recommendations
**File:** `website/app/api/admin/course-recommendations/route.ts`

**GET endpoint:**
- Fetch all recommendations
- Query params:
  - `?pending=true` - only pending (not applied/dismissed)
  - `?course_id=uuid` - filter by course
- Returns grouped by course_id with both network and AI recommendations

**POST endpoint:**
- Apply or dismiss a recommendation
- Body: `{ recommendation_id, action: 'apply' | 'dismiss', notes?, applied_by? }`
- When applying: updates course difficulty AND marks recommendation as applied
- When dismissing: just marks recommendation as dismissed

## Files Modified

### 1. Network Calibration Endpoint
**File:** `website/app/api/admin/network-course-calibration-optimized/route.ts`

**Added:** Automatic saving of recommendations after calibration runs

```typescript
// After calculating calibrations
const recommendationsToSave = formattedCalibrations
  .filter((cal: any) => cal.anchor_course !== 'ANCHOR')
  .map((cal: any) => ({
    course_id: cal.course_id,
    recommended_difficulty: cal.implied_difficulty,
    current_difficulty: cal.current_difficulty,
    source: 'network_calibration',
    confidence: cal.confidence,
    shared_athletes_count: cal.shared_athletes_count,
    median_ratio: cal.median_ratio,
    reasoning: { method: 'anchor_based', anchor_course: ... }
  }))

await supabase
  .from('course_difficulty_recommendations')
  .upsert(recommendationsToSave, { onConflict: 'course_id,source' })
```

### 2. AI Course Analysis Endpoint
**File:** `website/app/api/admin/ai-course-analysis/route.ts`

**Added:** Automatic saving of AI recommendations after analysis completes

```typescript
// After getting AI response
const recommendationToSave = {
  course_id: course.id,
  recommended_difficulty: analysis.recommended_difficulty,
  current_difficulty: course.difficulty_rating,
  source: 'ai_analysis',
  confidence: confidenceMap[analysis.confidence] || 0.5,
  shared_athletes_count: athleteComparisons.length,
  median_ratio: medianRatio,
  reasoning: {
    provider,
    confidence_level: analysis.confidence,
    reasoning: analysis.reasoning || [],
    key_findings: analysis.key_findings || {},
    ...
  }
}

await supabase
  .from('course_difficulty_recommendations')
  .upsert(recommendationToSave, { onConflict: 'course_id,source' })
```

### 3. Course Analysis Page
**File:** `website/app/admin/course-analysis/page.tsx`

**Added:**

1. **State for saved recommendations:**
   ```typescript
   const [savedRecommendations, setSavedRecommendations] = useState<...>({})
   ```

2. **Load function:**
   ```typescript
   const loadSavedRecommendations = async () => {
     const response = await fetch('/api/admin/course-recommendations?pending=true')
     // Groups by course_id
   }
   ```

3. **Apply function:**
   ```typescript
   const applyRecommendation = async (recommendationId: string) => {
     // Confirms with user
     // Posts to API with action: 'apply'
     // Reloads data
   }
   ```

4. **Dismiss function:**
   ```typescript
   const dismissRecommendation = async (recommendationId: string) => {
     // Prompts for reason
     // Posts to API with action: 'dismiss'
     // Reloads data
   }
   ```

5. **UI sections for each course:**
   - **Network Calibration Recommendation** (blue box)
     - Shows recommended difficulty, confidence, shared athletes, median ratio
     - Apply/Dismiss buttons
   - **AI Analysis Recommendation** (purple box)
     - Shows recommended difficulty, confidence, reasoning preview
     - Apply/Dismiss buttons

## Testing Instructions

### Step 1: Apply the Database Migration

```bash
# In Supabase SQL Editor, run:
/Users/ron/manaxc/manaxc-project/website/supabase/migrations/20251030_create_course_recommendations.sql
```

**Expected result:** Table `course_difficulty_recommendations` created successfully

### Step 2: Run Network Calibration

1. Navigate to: http://localhost:3000/admin/network-calibration
2. Click "Run Calibration"
3. Wait 5-10 seconds for completion
4. Check the response in browser console

**Expected result:**
- Summary should show `recommendations_saved: 22` (or similar number)
- Console should log: "Saved 22 recommendations to database"

### Step 3: Verify Recommendations Saved

In Supabase SQL Editor:
```sql
SELECT
  c.name,
  r.source,
  r.recommended_difficulty,
  r.confidence,
  r.shared_athletes_count,
  r.created_at
FROM course_difficulty_recommendations r
JOIN courses c ON r.course_id = c.id
WHERE r.source = 'network_calibration'
ORDER BY r.created_at DESC;
```

**Expected result:** 20+ rows, one per course, all with `source = 'network_calibration'`

### Step 4: View Recommendations on Course Analysis Page

1. Navigate to: http://localhost:3000/admin/course-analysis
2. Wait for page to load
3. Look for courses with blue "Network Calibration Recommendation" boxes

**Expected result:**
- Courses that need review should show blue recommendation boxes
- Each box shows:
  - Recommended difficulty (9 decimals)
  - Confidence percentage
  - Shared athletes count
  - Median ratio
  - Apply and Dismiss buttons

### Step 5: Test Apply Workflow

1. Pick a course with a recommendation
2. Note the current difficulty rating
3. Click "Apply" button
4. Confirm in dialog
5. Wait for success message

**Expected result:**
- Alert: "Recommendation applied successfully!"
- Page refreshes
- Course difficulty updated to new value
- Blue recommendation box disappears (no longer pending)

Verify in database:
```sql
SELECT
  difficulty_rating,
  name
FROM courses
WHERE name = 'YourCourseName';

SELECT
  applied_at,
  applied_by,
  recommended_difficulty
FROM course_difficulty_recommendations
WHERE course_id = 'YourCourseId';
```

### Step 6: Test Dismiss Workflow

1. Pick a different course with a recommendation
2. Click "Dismiss" button
3. Enter a reason (optional)
4. Wait for success message

**Expected result:**
- Alert: "Recommendation dismissed"
- Blue recommendation box disappears
- Course difficulty unchanged

Verify in database:
```sql
SELECT
  dismissed_at,
  dismissed_by,
  notes
FROM course_difficulty_recommendations
WHERE course_id = 'YourCourseId';
```

### Step 7: Test AI Analysis

1. Pick a course with many results (e.g., Crystal Springs)
2. Click "AI Analysis" button
3. Wait for Claude to analyze (3-5 seconds)

**Expected result:**
- Two boxes appear:
  1. "AI Analysis Recommendation" (purple, with Apply/Dismiss)
  2. "AI Deep Analysis (Just Run)" (purple, no buttons - for immediate viewing)
- The recommendation box should show saved data from database
- Can now apply or dismiss the AI recommendation

### Step 8: Compare Network vs AI

1. Find a course that has BOTH network and AI recommendations
2. Compare the two recommended difficulties
3. Check which has higher confidence
4. Review the reasoning

**Expected decision process:**
- If both agree (within 0.01): High confidence → Apply
- If both high confidence but disagree: Review reasoning → Choose one
- If one low confidence: Trust the higher confidence one
- If both low confidence: Manual investigation needed

## Workflow Summary

### Normal Operation Flow

1. **Bulk Analysis:**
   ```
   Run Network Calibration
   → 20+ recommendations saved to database
   → Don't auto-apply anything
   ```

2. **Review:**
   ```
   Go to Course Analysis page
   → See all pending recommendations
   → Compare network vs AI (if available)
   → Review confidence scores
   ```

3. **Apply Selectively:**
   ```
   For each course:
   → High confidence + large discrepancy = Apply
   → Low confidence = Dismiss or run AI analysis first
   → Controversial = Discuss with coaching staff
   ```

4. **Audit Trail:**
   ```
   Database tracks:
   → When recommendation created
   → When applied (and by whom)
   → When dismissed (and why)
   → What the old/new values were
   ```

## Data Flow Diagram

```
┌─────────────────────────────────────────────┐
│ Run Network Calibration                      │
│ /admin/network-calibration                  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Calculate implied difficulties for all      │
│ courses using anchor-based method           │
│ (Crystal Springs = anchor)                  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ UPSERT to course_difficulty_recommendations │
│ source = 'network_calibration'              │
│ One row per course                          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Course Analysis Page loads                  │
│ /admin/course-analysis                      │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Fetch pending recommendations via API       │
│ GET /api/admin/course-recommendations       │
│ ?pending=true                               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ Display blue boxes with Apply/Dismiss       │
│ User reviews and makes decision             │
└─────────────────┬───────────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
    ┌────────┐        ┌─────────┐
    │ APPLY  │        │ DISMISS │
    └────┬───┘        └────┬────┘
         │                 │
         ▼                 ▼
┌──────────────────┐  ┌────────────────────┐
│ Update course    │  │ Mark dismissed_at  │
│ difficulty       │  │ Keep course same   │
│ Mark applied_at  │  │                    │
└──────────────────┘  └────────────────────┘
```

## Key Design Decisions

### 1. Upsert Strategy
Using `onConflict: 'course_id,source'` means:
- Running network calibration TWICE will UPDATE existing recommendations
- Old recommendations are replaced, not duplicated
- Applied/dismissed recommendations remain in database for audit trail

### 2. Separate Network and AI
Each course can have TWO pending recommendations:
- One from network_calibration
- One from ai_analysis

This allows you to:
- Compare both methods
- Choose the more confident one
- Or choose based on your coaching intuition

### 3. Apply Updates Course Directly
When you click "Apply":
1. Course difficulty is IMMEDIATELY updated in database
2. Recommendation is marked as applied
3. All derived tables (athlete_best_times, etc.) will auto-update via triggers

### 4. Dismiss Keeps Recommendation
When you click "Dismiss":
- Recommendation stays in database (for audit)
- Just marked as dismissed_at
- Won't show up in "pending" queries

## Troubleshooting

### Issue: No recommendations showing on course analysis page

**Check:**
1. Did network calibration actually save recommendations?
   ```sql
   SELECT COUNT(*) FROM course_difficulty_recommendations WHERE source = 'network_calibration';
   ```
2. Are they marked as pending?
   ```sql
   SELECT COUNT(*) FROM course_difficulty_recommendations
   WHERE applied_at IS NULL AND dismissed_at IS NULL;
   ```
3. Check browser console for API errors

### Issue: Apply button not working

**Check:**
1. Browser console for errors
2. Network tab - is API call succeeding?
3. Database permissions - does service role have UPDATE access to courses table?

### Issue: Recommendations show but no Apply/Dismiss buttons

**Check:**
- UI logic - buttons only show for pending recommendations
- If applied_at or dismissed_at is set, buttons won't appear

## Next Steps

### Immediate Testing
1. Apply migration
2. Run network calibration
3. Apply 2-3 high-confidence recommendations
4. Verify course ratings updated
5. Run a meet import to see if normalized times recalculate correctly

### Future Enhancements (Optional)
1. **Bulk apply:** Button to apply all high-confidence recommendations at once
2. **Comparison view:** Side-by-side diff view of old vs new normalized times
3. **Rollback:** Undo an applied recommendation
4. **History:** View all applied/dismissed recommendations over time
5. **Email notifications:** Alert when calibration finds major discrepancies

## Success Criteria

✅ Migration applied without errors
✅ Network calibration saves 20+ recommendations
✅ Course analysis page displays recommendations
✅ Apply button updates course difficulty
✅ Dismiss button marks recommendation as dismissed
✅ Audit trail tracks who did what when

---

**Status:** Implementation complete, ready for production testing
**Risk Level:** LOW - changes are opt-in (must click Apply)
**Rollback Plan:** Recommendations don't auto-apply, so no rollback needed
