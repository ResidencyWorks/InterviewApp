-- Migration: Create recordings table for audio upload feature
-- Feature: 009-audio-upload-drill
-- Created: 2025-01-27

-- Create recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,

  -- Response type: audio or text
  response_type TEXT NOT NULL DEFAULT 'audio' CHECK (response_type IN ('audio', 'text')),

  -- File metadata (for audio responses)
  file_name TEXT,
  mime_type TEXT,
  file_size BIGINT,
  duration INT CHECK (duration IS NULL OR duration <= 90),
  storage_path TEXT,

  -- Text content (for text responses)
  text_content TEXT,

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

-- Add constraints to ensure data integrity
ALTER TABLE recordings
  ADD CONSTRAINT check_text_response_has_content
  CHECK (
    (response_type = 'audio' AND text_content IS NULL) OR
    (response_type = 'text' AND text_content IS NOT NULL AND text_content != '')
  );

ALTER TABLE recordings
  ADD CONSTRAINT check_audio_response_has_files
  CHECK (
    (response_type = 'text' AND file_name IS NULL) OR
    (response_type = 'audio' AND file_name IS NOT NULL)
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_expires_at ON recordings(expires_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_session_id ON recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_recordings_response_type ON recordings(response_type);

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
