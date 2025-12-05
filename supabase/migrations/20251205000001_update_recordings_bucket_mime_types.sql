-- Update the recordings bucket to allow all audio MIME types
-- This fixes the issue with audio/webm;codecs=opus not being supported

UPDATE storage.buckets
SET allowed_mime_types = NULL  -- NULL means allow all MIME types
WHERE id = 'recordings';

-- Alternatively, if you want to be more restrictive but still allow common audio formats:
-- UPDATE storage.buckets
-- SET allowed_mime_types = ARRAY[
--   'audio/wav',
--   'audio/wave',
--   'audio/x-wav',
--   'audio/mpeg',
--   'audio/mp3',
--   'audio/webm',
--   'audio/ogg',
--   'audio/opus',
--   'audio/x-m4a',
--   'audio/mp4'
-- ]
-- WHERE id = 'recordings';
