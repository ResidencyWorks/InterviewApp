-- Create drill_progress table to track user progress through drills
CREATE TABLE IF NOT EXISTS public.drill_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    drill_id TEXT NOT NULL,
    current_question_id TEXT NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    completed_questions INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one progress record per user per drill
    UNIQUE(user_id, drill_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drill_progress_user_id ON public.drill_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_progress_drill_id ON public.drill_progress(drill_id);
CREATE INDEX IF NOT EXISTS idx_drill_progress_completed ON public.drill_progress(completed_at) WHERE completed_at IS NULL;

-- Enable RLS
ALTER TABLE public.drill_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own progress
CREATE POLICY "Users can view their own drill progress"
ON public.drill_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own progress
CREATE POLICY "Users can create their own drill progress"
ON public.drill_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own progress
CREATE POLICY "Users can update their own drill progress"
ON public.drill_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own progress
CREATE POLICY "Users can delete their own drill progress"
ON public.drill_progress
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_drill_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_drill_progress_updated_at
    BEFORE UPDATE ON public.drill_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_drill_progress_updated_at();

-- Add comment
COMMENT ON TABLE public.drill_progress IS 'Tracks user progress through interview drills';
