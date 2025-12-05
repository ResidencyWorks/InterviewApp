-- Reinstate user-specific access for evaluation_results
-- Adds user_id column, supporting index, and authenticated read policy

ALTER TABLE public.evaluation_results
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_evaluation_results_user_id
  ON public.evaluation_results(user_id);

DROP POLICY IF EXISTS "Users can view own evaluation results" ON public.evaluation_results;
CREATE POLICY "Users can view own evaluation results"
  ON public.evaluation_results
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id IS NOT NULL
    AND auth.uid() = user_id
  );

COMMENT ON COLUMN public.evaluation_results.user_id IS
  'Owner of the evaluation result; enables personalized dashboards.';
