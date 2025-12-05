-- Add user_id column to evaluation_results table
-- This allows the dashboard to filter evaluation results by user
-- and enables user-specific analytics and progress tracking

-- Add user_id column (nullable to allow existing records)
ALTER TABLE public.evaluation_results
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_evaluation_results_user_id ON public.evaluation_results(user_id);

-- Update RLS policy to allow authenticated users to view their own results
DROP POLICY IF EXISTS "Users can view own evaluation results" ON public.evaluation_results;
CREATE POLICY "Users can view own evaluation results"
  ON public.evaluation_results
  FOR SELECT
  USING (
    auth.role() = 'service_role' OR
    (auth.role() = 'authenticated' AND auth.uid() = user_id)
  );

-- Add comment
COMMENT ON COLUMN public.evaluation_results.user_id IS 'User ID who owns this evaluation result. Nullable for backward compatibility with existing records.';
