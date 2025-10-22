-- Migration: Fix Security Issues
-- Description: Fix all security vulnerabilities identified by database linter
-- Date: 2025-01-27
-- Security: Critical fixes for RLS, SECURITY DEFINER views, and auth.users exposure

-- ==============================================
-- 1. FIX SECURITY DEFINER VIEWS
-- ==============================================

-- Drop and recreate views with SECURITY INVOKER to respect RLS policies
DROP VIEW IF EXISTS public.validation_results_with_details CASCADE;
DROP VIEW IF EXISTS public.validation_stats_by_schema CASCADE;
DROP VIEW IF EXISTS public.upload_stats_by_user CASCADE;
DROP VIEW IF EXISTS public.current_system_status CASCADE;
DROP VIEW IF EXISTS public.system_health_dashboard CASCADE;

-- Recreate validation_results_with_details with SECURITY INVOKER
CREATE VIEW public.validation_results_with_details
WITH (security_invoker = true)
AS
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

-- Recreate validation_stats_by_schema with SECURITY INVOKER
CREATE VIEW public.validation_stats_by_schema
WITH (security_invoker = true)
AS
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

-- Recreate upload_stats_by_user with SECURITY INVOKER (removing direct auth.users access)
CREATE VIEW public.upload_stats_by_user
WITH (security_invoker = true)
AS
SELECT
    uq.user_id,
    -- Use a function to get user email safely without exposing auth.users
    get_user_email_safe(uq.user_id) as user_email,
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
GROUP BY uq.user_id
ORDER BY total_uploads DESC;

-- Recreate current_system_status with SECURITY INVOKER
CREATE VIEW public.current_system_status
WITH (security_invoker = true)
AS
SELECT
    status_type,
    status_value,
    details,
    last_updated,
    updated_by
FROM public.system_status
ORDER BY status_type;

-- Recreate system_health_dashboard with SECURITY INVOKER
CREATE VIEW public.system_health_dashboard
WITH (security_invoker = true)
AS
SELECT
    'Content Pack Status' as component,
    status_value as status,
    details->>'message' as message,
    last_updated
FROM public.system_status
WHERE status_type = 'content_pack_status'

UNION ALL

SELECT
    'Fallback Mode' as component,
    status_value as status,
    details->>'message' as message,
    last_updated
FROM public.system_status
WHERE status_type = 'fallback_mode'

UNION ALL

SELECT
    'Database Connection' as component,
    status_value as status,
    details->>'message' as message,
    last_updated
FROM public.system_status
WHERE status_type = 'database_connection'

UNION ALL

SELECT
    'Analytics Service' as component,
    status_value as status,
    details->>'message' as message,
    last_updated
FROM public.system_status
WHERE status_type = 'analytics_service'

UNION ALL

SELECT
    'System Health' as component,
    status_value as status,
    details->>'message' as message,
    last_updated
FROM public.system_status
WHERE status_type = 'system_health'

ORDER BY component;

-- ==============================================
-- 2. CREATE SAFE USER EMAIL FUNCTION
-- ==============================================

-- Create a SECURITY DEFINER function to safely get user email
CREATE OR REPLACE FUNCTION get_user_email_safe(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Only return email if the requesting user is the same user or an admin
    IF auth.uid() = user_uuid OR
       EXISTS (
           SELECT 1 FROM auth.users
           WHERE id = auth.uid()
           AND raw_user_meta_data->>'role' = 'admin'
       ) THEN
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = user_uuid;
    END IF;

    RETURN user_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_email_safe(UUID) TO authenticated;

-- ==============================================
-- 3. ENABLE RLS ON MISSING TABLES
-- ==============================================

-- Enable RLS on evaluation_scores table
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;

-- Enable RLS on evaluation_categories table
ALTER TABLE public.evaluation_categories ENABLE ROW LEVEL SECURITY;

-- Enable RLS on evaluation_analytics table
ALTER TABLE public.evaluation_analytics ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_progress table
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 4. CREATE RLS POLICIES FOR EVALUATION TABLES
-- ==============================================

-- RLS Policies for evaluation_scores
CREATE POLICY "Users can view their own evaluation scores" ON public.evaluation_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.evaluations e
            WHERE e.id = evaluation_scores.evaluation_id
            AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert evaluation scores for their evaluations" ON public.evaluation_scores
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evaluations e
            WHERE e.id = evaluation_scores.evaluation_id
            AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own evaluation scores" ON public.evaluation_scores
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.evaluations e
            WHERE e.id = evaluation_scores.evaluation_id
            AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own evaluation scores" ON public.evaluation_scores
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.evaluations e
            WHERE e.id = evaluation_scores.evaluation_id
            AND e.user_id = auth.uid()
        )
    );

-- RLS Policies for evaluation_categories (public read, admin write)
CREATE POLICY "Anyone can view evaluation categories" ON public.evaluation_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert evaluation categories" ON public.evaluation_categories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can update evaluation categories" ON public.evaluation_categories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can delete evaluation categories" ON public.evaluation_categories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- RLS Policies for evaluation_analytics
CREATE POLICY "Users can view their own evaluation analytics" ON public.evaluation_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own evaluation analytics" ON public.evaluation_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evaluation analytics" ON public.evaluation_analytics
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evaluation analytics" ON public.evaluation_analytics
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress" ON public.user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON public.user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.user_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON public.user_progress
    FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- 5. GRANT PERMISSIONS FOR NEW VIEWS
-- ==============================================

-- Grant permissions for the recreated views
GRANT SELECT ON public.validation_results_with_details TO authenticated;
GRANT SELECT ON public.validation_stats_by_schema TO authenticated;
GRANT SELECT ON public.upload_stats_by_user TO authenticated;
GRANT SELECT ON public.current_system_status TO authenticated;
GRANT SELECT ON public.system_health_dashboard TO authenticated;

-- ==============================================
-- 6. GRANT PERMISSIONS FOR EVALUATION TABLES
-- ==============================================

-- Grant permissions for evaluation tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;

-- ==============================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON FUNCTION get_user_email_safe(UUID) IS 'Safely retrieves user email with proper access control';
COMMENT ON VIEW public.validation_results_with_details IS 'Validation results with content pack details (SECURITY INVOKER)';
COMMENT ON VIEW public.validation_stats_by_schema IS 'Validation statistics grouped by schema version (SECURITY INVOKER)';
COMMENT ON VIEW public.upload_stats_by_user IS 'Upload statistics grouped by user (SECURITY INVOKER, no direct auth.users access)';
COMMENT ON VIEW public.current_system_status IS 'Current system status information (SECURITY INVOKER)';
COMMENT ON VIEW public.system_health_dashboard IS 'System health dashboard view (SECURITY INVOKER)';

-- ==============================================
-- 8. VERIFY SECURITY FIXES
-- ==============================================

-- Verify that views are now SECURITY INVOKER
DO $$
DECLARE
    view_name TEXT;
    view_def TEXT;
BEGIN
    FOR view_name IN
        SELECT schemaname||'.'||viewname
        FROM pg_views
        WHERE schemaname = 'public'
        AND viewname IN (
            'validation_results_with_details',
            'validation_stats_by_schema',
            'upload_stats_by_user',
            'current_system_status',
            'system_health_dashboard'
        )
    LOOP
        SELECT pg_get_viewdef(view_name::regclass) INTO view_def;
        IF view_def NOT LIKE '%security_invoker = true%' THEN
            RAISE EXCEPTION 'View % is not properly configured as SECURITY INVOKER', view_name;
        END IF;
    END LOOP;

    RAISE NOTICE 'All views successfully converted to SECURITY INVOKER';
END $$;

-- Verify RLS is enabled on all required tables
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT schemaname||'.'||tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'evaluation_scores',
            'evaluation_categories',
            'evaluation_analytics',
            'user_progress'
        )
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class
            WHERE relname = split_part(table_name, '.', 2)
            AND relrowsecurity = true
        ) THEN
            RAISE EXCEPTION 'RLS is not enabled on table %', table_name;
        END IF;
    END LOOP;

    RAISE NOTICE 'RLS successfully enabled on all required tables';
END $$;
