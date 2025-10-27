-- Migration: Create recordings table for audio upload feature
-- Feature: 009-audio-upload-drill
-- Created: 2025-01-27

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,

  -- File metadata
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration INT NOT NULL CHECK (duration <= 90),
  storage_path TEXT NOT NULL,

  -- Timestamps
  recorded_at TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('recording', 'uploading', 'completed', 'failed', 'expired')),
  error_message TEXT,

  -- Analytics
  upload_attempts INT NOT NULL DEFAULT 0,
  upload_duration_ms INT,

  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_expires_at ON recordings(expires_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_session_id ON recordings(session_id);

-- Enable Row Level Security
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only access their own recordings
CREATE POLICY "Users can view own recordings"
  ON recordings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings"
  ON recordings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings"
  ON recordings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recordings_updated_at
  BEFORE UPDATE ON recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
