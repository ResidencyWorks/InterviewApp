-- Create streaming_tips table for admin-configurable tips shown during evaluation
-- These tips help users understand what's happening while waiting for results

CREATE TABLE IF NOT EXISTS public.streaming_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_text TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'evaluation', 'technical', 'encouragement')),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_streaming_tips_active ON public.streaming_tips(is_active);
CREATE INDEX IF NOT EXISTS idx_streaming_tips_category ON public.streaming_tips(category);
CREATE INDEX IF NOT EXISTS idx_streaming_tips_order ON public.streaming_tips(display_order);

-- Enable RLS
ALTER TABLE public.streaming_tips ENABLE ROW LEVEL SECURITY;

-- RLS Policies - all authenticated users can read active tips
DROP POLICY IF EXISTS "Anyone can view active tips" ON public.streaming_tips;
CREATE POLICY "Anyone can view active tips"
ON public.streaming_tips
FOR SELECT
TO authenticated
USING (is_active = true);

-- Only admins can manage tips (will need admin role check in future)
DROP POLICY IF EXISTS "Service role has full access" ON public.streaming_tips;
CREATE POLICY "Service role has full access"
ON public.streaming_tips
FOR ALL
TO service_role
USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_streaming_tips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_streaming_tips_updated_at ON public.streaming_tips;
CREATE TRIGGER update_streaming_tips_updated_at
    BEFORE UPDATE ON public.streaming_tips
    FOR EACH ROW
    EXECUTE FUNCTION public.update_streaming_tips_updated_at();

-- Seed default tips
INSERT INTO public.streaming_tips (tip_text, category, display_order, is_active) VALUES
    ('Your response is being analyzed by our AI evaluation system...', 'evaluation', 1, true),
    ('We''re checking your answer against industry best practices...', 'evaluation', 2, true),
    ('Evaluations typically complete in 10-30 seconds...', 'technical', 3, true),
    ('Take a deep breath! You''re doing great.', 'encouragement', 4, true),
    ('Our AI considers multiple factors including clarity, completeness, and technical accuracy...', 'evaluation', 5, true),
    ('Pro tip: The more detailed your response, the better feedback you''ll receive.', 'general', 6, true),
    ('Remember, this is a learning experience. Every attempt helps you improve!', 'encouragement', 7, true),
    ('Your response is being compared against expert-level answers...', 'evaluation', 8, true),
    ('Hang tight! Quality evaluation takes a moment...', 'technical', 9, true),
    ('The evaluation considers both what you said and how you explained it.', 'general', 10, true)
ON CONFLICT DO NOTHING;

-- Add comments
COMMENT ON TABLE public.streaming_tips IS 'Admin-configurable tips shown to users during evaluation streaming';
COMMENT ON COLUMN public.streaming_tips.tip_text IS 'The tip message displayed to users';
COMMENT ON COLUMN public.streaming_tips.category IS 'Category of tip: general, evaluation, technical, encouragement';
COMMENT ON COLUMN public.streaming_tips.display_order IS 'Order in which tips should be displayed (lower = earlier)';
COMMENT ON COLUMN public.streaming_tips.is_active IS 'Whether this tip is currently active and should be shown';
