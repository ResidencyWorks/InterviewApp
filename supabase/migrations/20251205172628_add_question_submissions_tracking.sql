-- Create a table to track question submissions (even before evaluation completes)
-- This allows us to show "In Progress" status and preserve submission data

CREATE TABLE IF NOT EXISTS public.question_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    content_pack_id UUID REFERENCES public.content_packs(id) ON DELETE SET NULL,
    drill_id TEXT NOT NULL,

    -- Submission data
    response_text TEXT,
    response_audio_url TEXT,
    response_type TEXT NOT NULL CHECK (response_type IN ('text', 'audio')),

    -- Evaluation tracking
    evaluation_job_id TEXT,
    evaluation_request_id UUID,
    evaluation_status TEXT DEFAULT 'pending' CHECK (evaluation_status IN ('pending', 'processing', 'completed', 'failed')),

    -- Timestamps
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evaluation_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one active submission per user per question
    UNIQUE(user_id, question_id, drill_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_question_submissions_user_id ON public.question_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_question_submissions_question_id ON public.question_submissions(question_id);
CREATE INDEX IF NOT EXISTS idx_question_submissions_drill_id ON public.question_submissions(drill_id);
CREATE INDEX IF NOT EXISTS idx_question_submissions_user_question ON public.question_submissions(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_question_submissions_job_id ON public.question_submissions(evaluation_job_id);
CREATE INDEX IF NOT EXISTS idx_question_submissions_status ON public.question_submissions(evaluation_status);

-- Enable RLS
ALTER TABLE public.question_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.question_submissions;
CREATE POLICY "Users can view their own submissions"
ON public.question_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own submissions" ON public.question_submissions;
CREATE POLICY "Users can insert their own submissions"
ON public.question_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own submissions" ON public.question_submissions;
CREATE POLICY "Users can update their own submissions"
ON public.question_submissions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full access" ON public.question_submissions;
CREATE POLICY "Service role has full access"
ON public.question_submissions
FOR ALL
TO service_role
USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_question_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_question_submissions_updated_at ON public.question_submissions;
CREATE TRIGGER update_question_submissions_updated_at
    BEFORE UPDATE ON public.question_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_question_submissions_updated_at();

-- Add comments
COMMENT ON TABLE public.question_submissions IS 'Tracks question submissions immediately when user submits, before evaluation completes';
COMMENT ON COLUMN public.question_submissions.user_id IS 'User who submitted the response';
COMMENT ON COLUMN public.question_submissions.question_id IS 'Question ID from the content pack';
COMMENT ON COLUMN public.question_submissions.drill_id IS 'Drill/evaluation ID this submission belongs to';
COMMENT ON COLUMN public.question_submissions.response_text IS 'Text response submitted by user';
COMMENT ON COLUMN public.question_submissions.response_audio_url IS 'URL to audio response';
COMMENT ON COLUMN public.question_submissions.response_type IS 'Type of response (text or audio)';
COMMENT ON COLUMN public.question_submissions.evaluation_job_id IS 'BullMQ job ID for tracking evaluation';
COMMENT ON COLUMN public.question_submissions.evaluation_status IS 'Status of evaluation: pending, processing, completed, failed';
COMMENT ON COLUMN public.question_submissions.submitted_at IS 'When the user submitted their response';
COMMENT ON COLUMN public.question_submissions.evaluation_completed_at IS 'When the evaluation was completed';
