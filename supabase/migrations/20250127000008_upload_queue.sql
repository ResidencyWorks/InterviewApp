-- Migration: 003_upload_queue.sql
-- Description: Create upload_queue table for managing content pack uploads
-- Date: 2025-01-27
-- Feature: Content Pack Loader

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create upload_queue table
CREATE TABLE IF NOT EXISTS public.upload_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued',
    progress INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    content_pack_id UUID REFERENCES public.content_packs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints
ALTER TABLE public.upload_queue ADD CONSTRAINT upload_queue_status_check
    CHECK (status IN ('queued', 'uploading', 'validating', 'completed', 'failed'));

ALTER TABLE public.upload_queue ADD CONSTRAINT upload_queue_progress_check
    CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE public.upload_queue ADD CONSTRAINT upload_queue_file_size_check
    CHECK (file_size > 0 AND file_size <= 10485760); -- 10MB max

ALTER TABLE public.upload_queue ADD CONSTRAINT upload_queue_file_name_check
    CHECK (length(file_name) > 0 AND length(file_name) <= 255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_upload_queue_user_id ON public.upload_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_queue_status ON public.upload_queue(status);
CREATE INDEX IF NOT EXISTS idx_upload_queue_started_at ON public.upload_queue(started_at);
CREATE INDEX IF NOT EXISTS idx_upload_queue_completed_at ON public.upload_queue(completed_at);
CREATE INDEX IF NOT EXISTS idx_upload_queue_content_pack_id ON public.upload_queue(content_pack_id);
CREATE INDEX IF NOT EXISTS idx_upload_queue_created_at ON public.upload_queue(created_at);

-- Create composite index for user status queries
CREATE INDEX IF NOT EXISTS idx_upload_queue_user_status ON public.upload_queue(user_id, status);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_upload_queue_updated_at
    BEFORE UPDATE ON public.upload_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to get active uploads for a user
CREATE OR REPLACE FUNCTION get_active_uploads(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    file_name VARCHAR(255),
    file_size BIGINT,
    status VARCHAR(20),
    progress INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    content_pack_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        uq.id,
        uq.file_name,
        uq.file_size,
        uq.status,
        uq.progress,
        uq.started_at,
        uq.content_pack_id
    FROM public.upload_queue uq
    WHERE uq.user_id = user_uuid
    AND uq.status IN ('queued', 'uploading', 'validating')
    ORDER BY uq.started_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get upload statistics
CREATE OR REPLACE FUNCTION get_upload_statistics()
RETURNS TABLE (
    total_uploads INTEGER,
    completed_uploads INTEGER,
    failed_uploads INTEGER,
    queued_uploads INTEGER,
    uploading_uploads INTEGER,
    validating_uploads INTEGER,
    success_rate NUMERIC,
    avg_file_size NUMERIC,
    recent_uploads_24h INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_uploads,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_uploads,
        COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_uploads,
        COUNT(*) FILTER (WHERE status = 'queued')::INTEGER as queued_uploads,
        COUNT(*) FILTER (WHERE status = 'uploading')::INTEGER as uploading_uploads,
        COUNT(*) FILTER (WHERE status = 'validating')::INTEGER as validating_uploads,
        ROUND(
            (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC /
             NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed')), 0)::NUMERIC) * 100,
            2
        ) as success_rate,
        ROUND(AVG(file_size), 2) as avg_file_size,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::INTEGER as recent_uploads_24h
    FROM public.upload_queue;
END;
$$ LANGUAGE plpgsql;

-- Create function to get upload history for a user
CREATE OR REPLACE FUNCTION get_upload_history(user_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    file_name VARCHAR(255),
    file_size BIGINT,
    status VARCHAR(20),
    progress INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    content_pack_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        uq.id,
        uq.file_name,
        uq.file_size,
        uq.status,
        uq.progress,
        uq.started_at,
        uq.completed_at,
        uq.error_message,
        uq.content_pack_id
    FROM public.upload_queue uq
    WHERE uq.user_id = user_uuid
    ORDER BY uq.started_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update upload status
CREATE OR REPLACE FUNCTION update_upload_status(
    upload_id UUID,
    new_status VARCHAR(20),
    new_progress INTEGER DEFAULT NULL,
    error_msg TEXT DEFAULT NULL,
    pack_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE public.upload_queue
    SET
        status = new_status,
        progress = COALESCE(new_progress, progress),
        error_message = COALESCE(error_msg, error_message),
        content_pack_id = COALESCE(pack_id, content_pack_id),
        completed_at = CASE
            WHEN new_status IN ('completed', 'failed') THEN NOW()
            ELSE completed_at
        END,
        updated_at = NOW()
    WHERE id = upload_id;

    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old completed uploads
CREATE OR REPLACE FUNCTION cleanup_old_uploads(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.upload_queue
    WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - INTERVAL '1 day' * days_to_keep;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for upload queue with user details
CREATE VIEW upload_queue_with_details AS
SELECT
    uq.id,
    uq.user_id,
    u.email as user_email,
    uq.file_name,
    uq.file_size,
    uq.status,
    uq.progress,
    uq.started_at,
    uq.completed_at,
    uq.error_message,
    uq.content_pack_id,
    cp.name as content_pack_name,
    cp.version as content_pack_version,
    uq.created_at,
    uq.updated_at
FROM public.upload_queue uq
LEFT JOIN auth.users u ON uq.user_id = u.id
LEFT JOIN public.content_packs cp ON uq.content_pack_id = cp.id
ORDER BY uq.started_at DESC;

-- Create view for upload statistics by user
CREATE VIEW upload_stats_by_user AS
SELECT
    uq.user_id,
    u.email as user_email,
    COUNT(*) as total_uploads,
    COUNT(*) FILTER (WHERE uq.status = 'completed') as completed_uploads,
    COUNT(*) FILTER (WHERE uq.status = 'failed') as failed_uploads,
    COUNT(*) FILTER (WHERE uq.status = 'queued') as queued_uploads,
    COUNT(*) FILTER (WHERE uq.status = 'uploading') as uploading_uploads,
    COUNT(*) FILTER (WHERE uq.status = 'validating') as validating_uploads,
    ROUND(
        (COUNT(*) FILTER (WHERE uq.status = 'completed')::NUMERIC /
         NULLIF(COUNT(*) FILTER (WHERE uq.status IN ('completed', 'failed')), 0)::NUMERIC) * 100,
        2
    ) as success_rate,
    ROUND(AVG(uq.file_size), 2) as avg_file_size,
    MAX(uq.started_at) as last_upload_at
FROM public.upload_queue uq
LEFT JOIN auth.users u ON uq.user_id = u.id
GROUP BY uq.user_id, u.email
ORDER BY total_uploads DESC;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upload_queue TO authenticated;
GRANT SELECT ON upload_queue_with_details TO authenticated;
GRANT SELECT ON upload_stats_by_user TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_uploads(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_upload_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_upload_history(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_upload_status(UUID, VARCHAR, INTEGER, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_uploads(INTEGER) TO authenticated;

-- Create RLS (Row Level Security) policies
ALTER TABLE public.upload_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own uploads
CREATE POLICY "Users can view their uploads" ON public.upload_queue
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Only authenticated users can insert uploads
CREATE POLICY "Authenticated users can insert uploads" ON public.upload_queue
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Policy: Users can update their own uploads
CREATE POLICY "Users can update their uploads" ON public.upload_queue
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete their uploads" ON public.upload_queue
    FOR DELETE USING (auth.uid() = user_id);

-- Policy: Admins can view all uploads
CREATE POLICY "Admins can view all uploads" ON public.upload_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.upload_queue IS 'Manages content pack upload queue and status tracking';
COMMENT ON COLUMN public.upload_queue.id IS 'Unique identifier for the upload item';
COMMENT ON COLUMN public.upload_queue.user_id IS 'ID of the user who initiated the upload';
COMMENT ON COLUMN public.upload_queue.file_name IS 'Original name of the uploaded file';
COMMENT ON COLUMN public.upload_queue.file_size IS 'Size of the uploaded file in bytes';
COMMENT ON COLUMN public.upload_queue.status IS 'Current status of the upload (queued, uploading, validating, completed, failed)';
COMMENT ON COLUMN public.upload_queue.progress IS 'Upload progress percentage (0-100)';
COMMENT ON COLUMN public.upload_queue.started_at IS 'When the upload processing started';
COMMENT ON COLUMN public.upload_queue.completed_at IS 'When the upload processing completed';
COMMENT ON COLUMN public.upload_queue.error_message IS 'Error message if upload failed';
COMMENT ON COLUMN public.upload_queue.content_pack_id IS 'ID of the created content pack (if successful)';

COMMENT ON FUNCTION get_active_uploads(UUID) IS 'Returns active uploads for a user';
COMMENT ON FUNCTION get_upload_statistics() IS 'Returns overall upload statistics';
COMMENT ON FUNCTION get_upload_history(UUID, INTEGER) IS 'Returns upload history for a user';
COMMENT ON FUNCTION update_upload_status(UUID, VARCHAR, INTEGER, TEXT, UUID) IS 'Updates upload status and related fields';
COMMENT ON FUNCTION cleanup_old_uploads(INTEGER) IS 'Cleans up old completed uploads';
COMMENT ON VIEW upload_queue_with_details IS 'Upload queue with user and content pack details';
COMMENT ON VIEW upload_stats_by_user IS 'Upload statistics grouped by user';
