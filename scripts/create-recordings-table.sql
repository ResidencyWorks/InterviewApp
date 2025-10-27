-- Create recordings table for audio upload metadata
-- Run this in Supabase SQL editor or via migration

CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,

  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration INT NOT NULL CHECK (duration <= 90),
  storage_path TEXT NOT NULL,

  recorded_at TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'uploading', 'completed', 'failed', 'expired')),
  error_message TEXT,

  upload_attempts INT NOT NULL DEFAULT 0,
  upload_duration_ms INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_expires_at ON recordings(expires_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_session_id ON recordings(session_id);

-- RLS Policies
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recordings
CREATE POLICY "Users can view their own recordings"
  ON recordings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for API routes)
CREATE POLICY "Service role has full access"
  ON recordings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated at timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recordings_updated_at
  BEFORE UPDATE ON recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
