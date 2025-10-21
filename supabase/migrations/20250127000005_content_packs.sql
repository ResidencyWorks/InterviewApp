-- Migration: 001_content_packs.sql
-- Description: Create content_packs table for storing content pack configurations
-- Date: 2025-01-27
-- Feature: Content Pack Loader

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add additional columns to existing content_packs table
ALTER TABLE public.content_packs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.content_packs ADD COLUMN IF NOT EXISTS schema_version VARCHAR(50) NOT NULL DEFAULT '1.0.0';
ALTER TABLE public.content_packs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.content_packs ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'uploaded';
ALTER TABLE public.content_packs ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.content_packs ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.content_packs ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);
ALTER TABLE public.content_packs ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE public.content_packs ADD COLUMN IF NOT EXISTS checksum VARCHAR(64);

-- Update existing is_active column to use status instead
UPDATE public.content_packs SET status = CASE WHEN is_active THEN 'activated' ELSE 'uploaded' END WHERE status = 'uploaded';

-- Add constraints (only if they don't exist)
DO $$
BEGIN
    -- Add status constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_packs_status_check') THEN
        ALTER TABLE public.content_packs ADD CONSTRAINT content_packs_status_check CHECK (status IN ('uploaded', 'validating', 'valid', 'invalid', 'activated', 'archived'));
    END IF;

    -- Add version constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_packs_version_check') THEN
        ALTER TABLE public.content_packs ADD CONSTRAINT content_packs_version_check CHECK (version ~ '^\d+\.\d+\.\d+$');
    END IF;

    -- Add file size constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_packs_file_size_check') THEN
        ALTER TABLE public.content_packs ADD CONSTRAINT content_packs_file_size_check CHECK (file_size > 0 AND file_size <= 10485760); -- 10MB max
    END IF;

    -- Add checksum constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_packs_checksum_check') THEN
        ALTER TABLE public.content_packs ADD CONSTRAINT content_packs_checksum_check CHECK (length(checksum) = 64); -- SHA-256 length
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_packs_status ON public.content_packs(status);
CREATE INDEX IF NOT EXISTS idx_content_packs_activated_at ON public.content_packs(activated_at);
CREATE INDEX IF NOT EXISTS idx_content_packs_uploaded_by ON public.content_packs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_content_packs_created_at ON public.content_packs(created_at);
CREATE INDEX IF NOT EXISTS idx_content_packs_updated_at ON public.content_packs(updated_at);

-- GIN index for JSONB content field for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_content_packs_content_gin ON public.content_packs USING GIN(content);

-- GIN index for JSONB metadata field
CREATE INDEX IF NOT EXISTS idx_content_packs_metadata_gin ON public.content_packs USING GIN(metadata);

-- Unique index to ensure only one active content pack at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_packs_active ON public.content_packs(status) WHERE status = 'activated';

-- Index for version lookups
CREATE INDEX IF NOT EXISTS idx_content_packs_version ON public.content_packs(version);

-- Index for schema version lookups
CREATE INDEX IF NOT EXISTS idx_content_packs_schema_version ON public.content_packs(schema_version);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_content_packs_updated_at') THEN
        CREATE TRIGGER update_content_packs_updated_at
            BEFORE UPDATE ON public.content_packs
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create function to validate content pack structure
CREATE OR REPLACE FUNCTION validate_content_pack_structure(content_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if content has required top-level fields
    IF NOT (content_data ? 'version' AND content_data ? 'name' AND content_data ? 'content') THEN
        RETURN FALSE;
    END IF;

    -- Check if content.content has required fields
    IF NOT (content_data->'content' ? 'evaluations' AND content_data->'content' ? 'categories') THEN
        RETURN FALSE;
    END IF;

    -- Check if evaluations is an array
    IF jsonb_typeof(content_data->'content'->'evaluations') != 'array' THEN
        RETURN FALSE;
    END IF;

    -- Check if categories is an array
    IF jsonb_typeof(content_data->'content'->'categories') != 'array' THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get active content pack
CREATE OR REPLACE FUNCTION get_active_content_pack()
RETURNS TABLE (
    id UUID,
    version VARCHAR(50),
    name VARCHAR(255),
    description TEXT,
    schema_version VARCHAR(50),
    content JSONB,
    metadata JSONB,
    activated_at TIMESTAMP WITH TIME ZONE,
    activated_by UUID,
    uploaded_by UUID,
    file_size BIGINT,
    checksum VARCHAR(64)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cp.id,
        cp.version,
        cp.name,
        cp.description,
        cp.schema_version,
        cp.content,
        cp.metadata,
        cp.activated_at,
        cp.activated_by,
        cp.uploaded_by,
        cp.file_size,
        cp.checksum
    FROM public.content_packs cp
    WHERE cp.status = 'activated'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to archive all content packs except specified one
CREATE OR REPLACE FUNCTION archive_content_packs_except(exclude_id UUID)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE public.content_packs
    SET status = 'archived', updated_at = NOW()
    WHERE id != exclude_id
    AND status IN ('valid', 'activated');

    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to activate content pack
CREATE OR REPLACE FUNCTION activate_content_pack(content_pack_id UUID, user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    previous_pack_id UUID
) AS $$
DECLARE
    pack_record RECORD;
    previous_pack_id UUID;
BEGIN
    -- Get the content pack
    SELECT * INTO pack_record
    FROM public.content_packs
    WHERE id = content_pack_id;

    -- Check if content pack exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Content pack not found', NULL::UUID;
        RETURN;
    END IF;

    -- Check if content pack is valid
    IF pack_record.status != 'valid' THEN
        RETURN QUERY SELECT FALSE, 'Content pack must be valid before activation', NULL::UUID;
        RETURN;
    END IF;

    -- Get current active content pack
    SELECT id INTO previous_pack_id
    FROM public.content_packs
    WHERE status = 'activated'
    LIMIT 1;

    -- Archive all other content packs
    PERFORM archive_content_packs_except(content_pack_id);

    -- Activate the specified content pack
    UPDATE public.content_packs
    SET
        status = 'activated',
        activated_at = NOW(),
        activated_by = user_id,
        updated_at = NOW()
    WHERE id = content_pack_id;

    RETURN QUERY SELECT TRUE, 'Content pack activated successfully', previous_pack_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for content pack statistics
CREATE VIEW content_pack_stats AS
SELECT
    COUNT(*) as total_packs,
    COUNT(*) FILTER (WHERE status = 'activated') as active_packs,
    COUNT(*) FILTER (WHERE status = 'valid') as valid_packs,
    COUNT(*) FILTER (WHERE status = 'invalid') as invalid_packs,
    COUNT(*) FILTER (WHERE status = 'uploaded') as uploaded_packs,
    COUNT(*) FILTER (WHERE status = 'validating') as validating_packs,
    COUNT(*) FILTER (WHERE status = 'archived') as archived_packs,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as recent_uploads,
    AVG(file_size) as avg_file_size,
    MAX(file_size) as max_file_size,
    MIN(file_size) as min_file_size
FROM public.content_packs;

-- Create view for recent activity
CREATE VIEW recent_content_pack_activity AS
SELECT
    cp.id,
    cp.name,
    cp.version,
    cp.status,
    cp.created_at,
    cp.updated_at,
    cp.activated_at,
    u.email as uploaded_by_email,
    a.email as activated_by_email
FROM public.content_packs cp
LEFT JOIN auth.users u ON cp.uploaded_by = u.id
LEFT JOIN auth.users a ON cp.activated_by = a.id
ORDER BY cp.updated_at DESC
LIMIT 50;

-- Insert sample content pack for testing (optional)
-- This can be removed in production
INSERT INTO public.content_packs (
    version,
    name,
    description,
    schema_version,
    content,
    metadata,
    status,
    uploaded_by,
    file_size,
    checksum
) VALUES (
    '1.0.0',
    'Sample Interview Questions',
    'A sample content pack for testing the system',
    '1.0.0',
    '{
        "version": "1.0.0",
        "name": "Sample Interview Questions",
        "description": "A sample content pack for testing",
        "content": {
            "evaluations": [
                {
                    "id": "eval-001",
                    "title": "Technical Skills Assessment",
                    "description": "Evaluate technical programming skills",
                    "criteria": [
                        {
                            "id": "crit-001",
                            "name": "Code Quality",
                            "weight": 0.4,
                            "description": "Quality of code written"
                        },
                        {
                            "id": "crit-002",
                            "name": "Problem Solving",
                            "weight": 0.6,
                            "description": "Ability to solve problems"
                        }
                    ],
                    "questions": [
                        {
                            "id": "q-001",
                            "text": "Write a function to reverse a string",
                            "type": "text"
                        },
                        {
                            "id": "q-002",
                            "text": "What is the time complexity of binary search?",
                            "type": "multiple-choice",
                            "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"]
                        }
                    ]
                }
            ],
            "categories": [
                {
                    "id": "cat-001",
                    "name": "Programming",
                    "description": "Programming-related questions"
                },
                {
                    "id": "cat-002",
                    "name": "Algorithms",
                    "description": "Algorithm and data structure questions"
                }
            ]
        },
        "metadata": {
            "author": "System",
            "tags": ["sample", "testing"],
            "compatibility": {
                "minVersion": "1.0.0"
            }
        }
    }',
    '{
        "author": "System",
        "tags": ["sample", "testing"],
        "compatibility": {
            "minVersion": "1.0.0"
        }
    }',
    'valid',
    (SELECT id FROM auth.users LIMIT 1), -- Use first available user
    2048, -- 2KB sample size
    'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456' -- Sample checksum
);

-- Grant necessary permissions
-- Note: Adjust these permissions based on your security requirements
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_packs TO authenticated;
GRANT SELECT ON content_pack_stats TO authenticated;
GRANT SELECT ON recent_content_pack_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_content_pack() TO authenticated;
GRANT EXECUTE ON FUNCTION activate_content_pack(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_content_packs_except(UUID) TO authenticated;

-- Create RLS (Row Level Security) policies
ALTER TABLE public.content_packs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all content packs
CREATE POLICY "Users can view content packs" ON public.content_packs
    FOR SELECT USING (true);

-- Policy: Only authenticated users can insert content packs
CREATE POLICY "Authenticated users can insert content packs" ON public.content_packs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update content packs they uploaded or if they are admin
CREATE POLICY "Users can update their content packs" ON public.content_packs
    FOR UPDATE USING (
        auth.uid() = uploaded_by OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy: Users can delete content packs they uploaded or if they are admin
CREATE POLICY "Users can delete their content packs" ON public.content_packs
    FOR DELETE USING (
        auth.uid() = uploaded_by OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.content_packs IS 'Stores content pack configurations for the interview system';
COMMENT ON COLUMN public.content_packs.id IS 'Unique identifier for the content pack';
COMMENT ON COLUMN public.content_packs.version IS 'Semantic version of the content pack (e.g., 1.2.3)';
COMMENT ON COLUMN public.content_packs.name IS 'Human-readable name of the content pack';
COMMENT ON COLUMN public.content_packs.description IS 'Optional description of the content pack';
COMMENT ON COLUMN public.content_packs.schema_version IS 'Version of the schema used to validate this content pack';
COMMENT ON COLUMN public.content_packs.content IS 'The actual content pack data in JSON format';
COMMENT ON COLUMN public.content_packs.metadata IS 'Additional metadata about the content pack';
COMMENT ON COLUMN public.content_packs.status IS 'Current status of the content pack (uploaded, validating, valid, invalid, activated, archived)';
COMMENT ON COLUMN public.content_packs.created_at IS 'When the content pack was created';
COMMENT ON COLUMN public.content_packs.updated_at IS 'When the content pack was last updated';
COMMENT ON COLUMN public.content_packs.activated_at IS 'When the content pack was activated';
COMMENT ON COLUMN public.content_packs.activated_by IS 'User ID who activated this content pack';
COMMENT ON COLUMN public.content_packs.uploaded_by IS 'User ID who uploaded this content pack';
COMMENT ON COLUMN public.content_packs.file_size IS 'Original file size in bytes';
COMMENT ON COLUMN public.content_packs.checksum IS 'SHA-256 hash of the content for integrity verification';

COMMENT ON FUNCTION get_active_content_pack() IS 'Returns the currently active content pack';
COMMENT ON FUNCTION activate_content_pack(UUID, UUID) IS 'Activates a content pack and archives others';
COMMENT ON FUNCTION archive_content_packs_except(UUID) IS 'Archives all content packs except the specified one';
COMMENT ON VIEW content_pack_stats IS 'Provides statistics about content packs';
COMMENT ON VIEW recent_content_pack_activity IS 'Shows recent content pack activity with user information';
