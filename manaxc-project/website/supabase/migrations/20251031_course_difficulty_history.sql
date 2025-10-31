-- Track historical changes to course difficulty ratings
-- Includes both automated recommendations and manual adjustments

CREATE TABLE IF NOT EXISTS course_difficulty_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  -- Change details
  old_difficulty numeric(12,9) NOT NULL,
  new_difficulty numeric(12,9) NOT NULL,
  difficulty_change_pct numeric GENERATED ALWAYS AS (
    ((new_difficulty / old_difficulty) - 1.0) * 100.0
  ) STORED,

  -- Metadata
  change_type text NOT NULL CHECK (change_type IN ('automated_recommendation', 'manual_adjustment')),
  comment text,

  -- Anomaly detection context (if from automated recommendation)
  elite_athlete_count int,
  outlier_percentage numeric,
  difference_seconds_per_mile numeric,
  suspicion_level text,

  -- Audit
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by text  -- Could be 'system', 'admin', or user ID in future
);

-- Index for fast lookups by course
CREATE INDEX IF NOT EXISTS idx_course_difficulty_history_course_id ON course_difficulty_history(course_id);
CREATE INDEX IF NOT EXISTS idx_course_difficulty_history_changed_at ON course_difficulty_history(changed_at DESC);

-- Grant permissions
GRANT SELECT, INSERT ON course_difficulty_history TO service_role, authenticated;

COMMENT ON TABLE course_difficulty_history IS
'Tracks all changes to course difficulty ratings with context about why the change was made. Supports both automated recommendations from anomaly detection and manual adjustments with custom comments.';

COMMENT ON COLUMN course_difficulty_history.change_type IS
'Either "automated_recommendation" (accepted from anomaly detection) or "manual_adjustment" (user-specified value with comment)';

COMMENT ON COLUMN course_difficulty_history.comment IS
'Optional explanation for why the change was made. Required for manual adjustments, optional for automated recommendations.';
