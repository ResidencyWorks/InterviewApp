-- Fix evaluation_results table for AI/ASR evaluation feature
-- This migration resolves conflicts between the old evaluation_results schema
-- (used for user assessments) and the new AI/ASR evaluation schema

-- Drop the old evaluation_results table and its dependencies
DROP TRIGGER IF EXISTS update_evaluation_results_updated_at ON public.evaluation_results;
DROP POLICY IF EXISTS "Users can view own evaluation results" ON public.evaluation_results;
DROP POLICY IF EXISTS "Users can insert own evaluation results" ON public.evaluation_results;
DROP POLICY IF EXISTS "Users can update own evaluation results" ON public.evaluation_results;
DROP TABLE IF EXISTS public.evaluation_results CASCADE;

-- Create the new evaluation_results table for AI/ASR feature
-- This matches the schema defined in specs/001-ai-asr-eval/plan.md
CREATE TABLE public.evaluation_results (
  request_id UUID PRIMARY KEY,
  job_id TEXT NOT NULL,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  feedback TEXT NOT NULL,
  what_changed TEXT NOT NULL,
  practice_rule TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (full access)
-- The API uses service role credentials to read/write evaluation results
CREATE POLICY "Service role has full access to evaluation_results"
  ON public.evaluation_results
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add index on created_at for time-based queries
CREATE INDEX idx_evaluation_results_created_at ON public.evaluation_results(created_at DESC);

-- Add index on job_id for job status lookups
CREATE INDEX idx_evaluation_results_job_id ON public.evaluation_results(job_id);

-- Add comment
COMMENT ON TABLE public.evaluation_results IS 'AI/ASR evaluation results from the evaluation API (Feature 001-ai-asr-eval)';
COMMENT ON COLUMN public.evaluation_results.request_id IS 'Unique identifier for idempotency (matches the request ID from the API call)';
COMMENT ON COLUMN public.evaluation_results.job_id IS 'BullMQ job ID for tracking async processing';
COMMENT ON COLUMN public.evaluation_results.score IS 'Overall evaluation score (0-100)';
COMMENT ON COLUMN public.evaluation_results.feedback IS 'Detailed feedback from GPT-4 evaluator';
COMMENT ON COLUMN public.evaluation_results.what_changed IS 'Specific improvements made';
COMMENT ON COLUMN public.evaluation_results.practice_rule IS 'Best practice rule to follow';
COMMENT ON COLUMN public.evaluation_results.duration_ms IS 'Total processing time in milliseconds';
COMMENT ON COLUMN public.evaluation_results.tokens_used IS 'OpenAI tokens consumed (null if not available)';
