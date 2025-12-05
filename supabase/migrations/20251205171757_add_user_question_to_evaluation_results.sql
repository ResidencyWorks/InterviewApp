-- Add user_id and question_id to evaluation_results table
-- This allows tracking which user completed which question

-- Add user_id column
ALTER TABLE public.evaluation_results
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add question_id column
ALTER TABLE public.evaluation_results
ADD COLUMN IF NOT EXISTS question_id TEXT NOT NULL DEFAULT 'unknown';

-- Add content_pack_id column for better tracking
ALTER TABLE public.evaluation_results
ADD COLUMN IF NOT EXISTS content_pack_id UUID REFERENCES public.content_packs(id) ON DELETE SET NULL;

-- Add response data columns
ALTER TABLE public.evaluation_results
ADD COLUMN IF NOT EXISTS response_text TEXT,
ADD COLUMN IF NOT EXISTS response_audio_url TEXT,
ADD COLUMN IF NOT EXISTS response_type TEXT CHECK (response_type IN ('text', 'audio')),
ADD COLUMN IF NOT EXISTS transcription TEXT;

-- Add updated_at for tracking changes
ALTER TABLE public.evaluation_results
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_evaluation_results_user_id ON public.evaluation_results(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_question_id ON public.evaluation_results(question_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_user_question ON public.evaluation_results(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_content_pack ON public.evaluation_results(content_pack_id);

-- Update RLS policies to allow users to view their own results
DROP POLICY IF EXISTS "Users can view their own evaluation results" ON public.evaluation_results;
CREATE POLICY "Users can view their own evaluation results"
ON public.evaluation_results
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to insert their own results
DROP POLICY IF EXISTS "Users can insert their own evaluation results" ON public.evaluation_results;
CREATE POLICY "Users can insert their own evaluation results"
ON public.evaluation_results
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_evaluation_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_evaluation_results_updated_at ON public.evaluation_results;
CREATE TRIGGER update_evaluation_results_updated_at
    BEFORE UPDATE ON public.evaluation_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_evaluation_results_updated_at();

-- Add comments
COMMENT ON COLUMN public.evaluation_results.user_id IS 'User who submitted the response';
COMMENT ON COLUMN public.evaluation_results.question_id IS 'Question ID from the content pack';
COMMENT ON COLUMN public.evaluation_results.content_pack_id IS 'Content pack this evaluation belongs to';
COMMENT ON COLUMN public.evaluation_results.response_text IS 'Text response submitted by user';
COMMENT ON COLUMN public.evaluation_results.response_audio_url IS 'URL to audio response submitted by user';
COMMENT ON COLUMN public.evaluation_results.response_type IS 'Type of response (text or audio)';
COMMENT ON COLUMN public.evaluation_results.transcription IS 'Transcription of audio response (if applicable)';
