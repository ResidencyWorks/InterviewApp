-- Migration: 002_validation_results.sql
-- Description: Create validation_results table for storing content pack validation results
-- Date: 2025-01-27
-- Feature: Content Pack Loader

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create validation_results table
CREATE TABLE IF NOT EXISTS public.validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_pack_id UUID NOT NULL REFERENCES public.content_packs(id) ON DELETE CASCADE,
    is_valid BOOLEAN NOT NULL,
    errors JSONB,
    warnings JSONB,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_by VARCHAR(255) NOT NULL,
    schema_version VARCHAR(50) NOT NULL,
    validation_time_ms INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints
ALTER TABLE public.validation_results ADD CONSTRAINT validation_results_validation_time_check
    CHECK (validation_time_ms >= 0);

ALTER TABLE public.validation_results ADD CONSTRAINT validation_results_schema_version_check
    CHECK (schema_version ~ '^\d+\.\d+\.\d+$');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_validation_results_content_pack_id ON public.validation_results(content_pack_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_validated_at ON public.validation_results(validated_at);
CREATE INDEX IF NOT EXISTS idx_validation_results_validated_by ON public.validation_results(validated_by);
CREATE INDEX IF NOT EXISTS idx_validation_results_is_valid ON public.validation_results(is_valid);
CREATE INDEX IF NOT EXISTS idx_validation_results_schema_version ON public.validation_results(schema_version);

-- GIN index for JSONB errors field for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_validation_results_errors_gin ON public.validation_results USING GIN(errors);

-- GIN index for JSONB warnings field
CREATE INDEX IF NOT EXISTS idx_validation_results_warnings_gin ON public.validation_results USING GIN(warnings);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_validation_results_updated_at
    BEFORE UPDATE ON public.validation_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to get latest validation result for a content pack
CREATE OR REPLACE FUNCTION get_latest_validation_result(pack_id UUID)
RETURNS TABLE (
    id UUID,
    content_pack_id UUID,
    is_valid BOOLEAN,
    errors JSONB,
    warnings JSONB,
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by VARCHAR(255),
    schema_version VARCHAR(50),
    validation_time_ms INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        vr.id,
        vr.content_pack_id,
        vr.is_valid,
        vr.errors,
        vr.warnings,
        vr.validated_at,
        vr.validated_by,
        vr.schema_version,
        vr.validation_time_ms
    FROM public.validation_results vr
    WHERE vr.content_pack_id = pack_id
    ORDER BY vr.validated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to get validation statistics
CREATE OR REPLACE FUNCTION get_validation_statistics()
RETURNS TABLE (
    total_validations INTEGER,
    successful_validations INTEGER,
    failed_validations INTEGER,
    success_rate NUMERIC,
    avg_validation_time_ms NUMERIC,
    min_validation_time_ms INTEGER,
    max_validation_time_ms INTEGER,
    recent_validations_24h INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_validations,
        COUNT(*) FILTER (WHERE is_valid = true)::INTEGER as successful_validations,
        COUNT(*) FILTER (WHERE is_valid = false)::INTEGER as failed_validations,
        ROUND(
            (COUNT(*) FILTER (WHERE is_valid = true)::NUMERIC / COUNT(*)::NUMERIC) * 100,
            2
        ) as success_rate,
        ROUND(AVG(validation_time_ms), 2) as avg_validation_time_ms,
        MIN(validation_time_ms) as min_validation_time_ms,
        MAX(validation_time_ms) as max_validation_time_ms,
        COUNT(*) FILTER (WHERE validated_at >= NOW() - INTERVAL '24 hours')::INTEGER as recent_validations_24h
    FROM public.validation_results;
END;
$$ LANGUAGE plpgsql;

-- Create function to get validation history for a content pack
CREATE OR REPLACE FUNCTION get_validation_history(pack_id UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    is_valid BOOLEAN,
    errors JSONB,
    warnings JSONB,
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by VARCHAR(255),
    schema_version VARCHAR(50),
    validation_time_ms INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        vr.id,
        vr.is_valid,
        vr.errors,
        vr.warnings,
        vr.validated_at,
        vr.validated_by,
        vr.schema_version,
        vr.validation_time_ms
    FROM public.validation_results vr
    WHERE vr.content_pack_id = pack_id
    ORDER BY vr.validated_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for validation results with content pack details
CREATE VIEW validation_results_with_details AS
SELECT
    vr.id,
    vr.content_pack_id,
    cp.name as content_pack_name,
    cp.version as content_pack_version,
    vr.is_valid,
    vr.errors,
    vr.warnings,
    vr.validated_at,
    vr.validated_by,
    vr.schema_version,
    vr.validation_time_ms,
    vr.created_at,
    vr.updated_at
FROM public.validation_results vr
JOIN public.content_packs cp ON vr.content_pack_id = cp.id
ORDER BY vr.validated_at DESC;

-- Create view for validation statistics by schema version
CREATE VIEW validation_stats_by_schema AS
SELECT
    schema_version,
    COUNT(*) as total_validations,
    COUNT(*) FILTER (WHERE is_valid = true) as successful_validations,
    COUNT(*) FILTER (WHERE is_valid = false) as failed_validations,
    ROUND(
        (COUNT(*) FILTER (WHERE is_valid = true)::NUMERIC / COUNT(*)::NUMERIC) * 100,
        2
    ) as success_rate,
    ROUND(AVG(validation_time_ms), 2) as avg_validation_time_ms,
    MIN(validation_time_ms) as min_validation_time_ms,
    MAX(validation_time_ms) as max_validation_time_ms
FROM public.validation_results
GROUP BY schema_version
ORDER BY schema_version;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.validation_results TO authenticated;
GRANT SELECT ON validation_results_with_details TO authenticated;
GRANT SELECT ON validation_stats_by_schema TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_validation_result(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_validation_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_validation_history(UUID, INTEGER) TO authenticated;

-- Create RLS (Row Level Security) policies
ALTER TABLE public.validation_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all validation results
CREATE POLICY "Users can view validation results" ON public.validation_results
    FOR SELECT USING (true);

-- Policy: Only authenticated users can insert validation results
CREATE POLICY "Authenticated users can insert validation results" ON public.validation_results
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update validation results they created or if they are admin
CREATE POLICY "Users can update their validation results" ON public.validation_results
    FOR UPDATE USING (
        validated_by = auth.email() OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy: Users can delete validation results they created or if they are admin
CREATE POLICY "Users can delete their validation results" ON public.validation_results
    FOR DELETE USING (
        validated_by = auth.email() OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.validation_results IS 'Stores validation results for content packs';
COMMENT ON COLUMN public.validation_results.id IS 'Unique identifier for the validation result';
COMMENT ON COLUMN public.validation_results.content_pack_id IS 'ID of the content pack that was validated';
COMMENT ON COLUMN public.validation_results.is_valid IS 'Whether the validation was successful';
COMMENT ON COLUMN public.validation_results.errors IS 'JSON array of validation errors';
COMMENT ON COLUMN public.validation_results.warnings IS 'JSON array of validation warnings';
COMMENT ON COLUMN public.validation_results.validated_at IS 'When the validation was performed';
COMMENT ON COLUMN public.validation_results.validated_by IS 'Who or what performed the validation';
COMMENT ON COLUMN public.validation_results.schema_version IS 'Schema version used for validation';
COMMENT ON COLUMN public.validation_results.validation_time_ms IS 'Time taken for validation in milliseconds';

COMMENT ON FUNCTION get_latest_validation_result(UUID) IS 'Returns the most recent validation result for a content pack';
COMMENT ON FUNCTION get_validation_statistics() IS 'Returns overall validation statistics';
COMMENT ON FUNCTION get_validation_history(UUID, INTEGER) IS 'Returns validation history for a content pack';
COMMENT ON VIEW validation_results_with_details IS 'Validation results with content pack details';
COMMENT ON VIEW validation_stats_by_schema IS 'Validation statistics grouped by schema version';
