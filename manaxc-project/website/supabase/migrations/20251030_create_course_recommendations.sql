-- Create table to store course difficulty recommendations
-- This allows manual review and approval/dismissal of recommendations from multiple sources

CREATE TABLE course_difficulty_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  -- Difficulty values
  recommended_difficulty numeric(12,9) NOT NULL,
  current_difficulty numeric(12,9) NOT NULL,

  -- Source and confidence
  source text NOT NULL CHECK (source IN ('network_calibration', 'ai_analysis')),
  confidence float,

  -- Supporting data (for network calibration)
  shared_athletes_count int,
  median_ratio float,

  -- AI reasoning (for AI analysis)
  reasoning jsonb,

  -- Audit trail
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  applied_by text,
  dismissed_at timestamptz,
  dismissed_by text,
  notes text,

  -- Only one active recommendation per source per course
  UNIQUE(course_id, source)
);

-- Index for quick lookups
CREATE INDEX idx_course_recommendations_course_id ON course_difficulty_recommendations(course_id);
CREATE INDEX idx_course_recommendations_source ON course_difficulty_recommendations(source);
CREATE INDEX idx_course_recommendations_pending ON course_difficulty_recommendations(course_id)
  WHERE applied_at IS NULL AND dismissed_at IS NULL;

-- RLS policies
ALTER TABLE course_difficulty_recommendations ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to recommendations"
  ON course_difficulty_recommendations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read recommendations
CREATE POLICY "Authenticated users can read recommendations"
  ON course_difficulty_recommendations
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON course_difficulty_recommendations TO service_role;
GRANT SELECT ON course_difficulty_recommendations TO authenticated;

COMMENT ON TABLE course_difficulty_recommendations IS
'Stores course difficulty recommendations from network calibration and AI analysis for manual review and approval';

COMMENT ON COLUMN course_difficulty_recommendations.source IS
'Source of recommendation: network_calibration (uses shared athlete performance) or ai_analysis (uses Claude AI)';

COMMENT ON COLUMN course_difficulty_recommendations.reasoning IS
'For AI analysis: stores Claude reasoning as JSON. For network calibration: may store additional stats';
