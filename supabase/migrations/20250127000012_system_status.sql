-- Migration: 004_system_status.sql
-- Description: Create system_status table for tracking system health and fallback content status
-- Date: 2025-01-27
-- Feature: Content Pack Loader - User Story 3

CREATE TABLE public.system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_type VARCHAR(50) NOT NULL,
  status_value VARCHAR(100) NOT NULL,
  details JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(255) DEFAULT 'system',

  CONSTRAINT system_status_type_check CHECK (status_type IN (
    'content_pack_status',
    'fallback_mode',
    'database_connection',
    'analytics_service',
    'system_health',
    'performance_metrics'
  ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_status_type ON public.system_status(status_type);
CREATE INDEX IF NOT EXISTS idx_system_status_last_updated ON public.system_status(last_updated);
CREATE INDEX IF NOT EXISTS idx_system_status_type_value ON public.system_status(status_type, status_value);

-- RLS Policies
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view system status
CREATE POLICY "Users can view system status" ON public.system_status
    FOR SELECT USING (true);

-- Policy: Only authenticated users can insert system status (typically by system/service)
CREATE POLICY "Authenticated users can insert system status" ON public.system_status
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Admins can update system status, users can update their own entries
CREATE POLICY "Admins can update all system status, users their own" ON public.system_status
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        ) OR (updated_by = auth.uid()::text)
    );

-- Policy: Admins can delete system status entries
CREATE POLICY "Admins can delete system status entries" ON public.system_status
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Insert initial system status entries
INSERT INTO public.system_status (status_type, status_value, details, updated_by) VALUES
('content_pack_status', 'no_content_pack', '{"message": "No content pack is currently active", "fallback_active": true}', 'system'),
('fallback_mode', 'active', '{"message": "System is running in fallback mode", "default_content_loaded": true}', 'system'),
('database_connection', 'connected', '{"message": "Database connection is healthy", "response_time_ms": 0}', 'system'),
('analytics_service', 'inactive', '{"message": "Analytics service is not configured", "posthog_available": false}', 'system'),
('system_health', 'operational', '{"message": "System is operational with fallback content", "overall_status": "healthy"}', 'system'),
('performance_metrics', 'normal', '{"average_response_time_ms": 0, "error_rate_percent": 0, "request_count": 0}', 'system');

-- Create function to update system status
CREATE OR REPLACE FUNCTION public.update_system_status(
    p_status_type VARCHAR(50),
    p_status_value VARCHAR(100),
    p_details JSONB DEFAULT NULL,
    p_updated_by VARCHAR(255) DEFAULT 'system'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.system_status (status_type, status_value, details, updated_by)
    VALUES (p_status_type, p_status_value, p_details, p_updated_by)
    ON CONFLICT (status_type)
    DO UPDATE SET
        status_value = EXCLUDED.status_value,
        details = EXCLUDED.details,
        last_updated = NOW(),
        updated_by = EXCLUDED.updated_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current system status
CREATE OR REPLACE FUNCTION public.get_system_status()
RETURNS TABLE (
    status_type VARCHAR(50),
    status_value VARCHAR(100),
    details JSONB,
    last_updated TIMESTAMP WITH TIME ZONE,
    updated_by VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ss.status_type,
        ss.status_value,
        ss.details,
        ss.last_updated,
        ss.updated_by
    FROM public.system_status ss
    ORDER BY ss.status_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get system health summary
CREATE OR REPLACE FUNCTION public.get_system_health_summary()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'overall_status', (
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM public.system_status
                    WHERE status_type = 'system_health'
                    AND status_value = 'operational'
                ) THEN 'healthy'
                WHEN EXISTS (
                    SELECT 1 FROM public.system_status
                    WHERE status_type = 'fallback_mode'
                    AND status_value = 'active'
                ) THEN 'degraded'
                ELSE 'unhealthy'
            END
        ),
        'content_pack_status', (
            SELECT status_value FROM public.system_status
            WHERE status_type = 'content_pack_status'
        ),
        'fallback_mode', (
            SELECT status_value FROM public.system_status
            WHERE status_type = 'fallback_mode'
        ),
        'database_connection', (
            SELECT status_value FROM public.system_status
            WHERE status_type = 'database_connection'
        ),
        'analytics_service', (
            SELECT status_value FROM public.system_status
            WHERE status_type = 'analytics_service'
        ),
        'last_updated', (
            SELECT MAX(last_updated) FROM public.system_status
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old system status entries (keep last 100 entries per type)
CREATE OR REPLACE FUNCTION public.cleanup_old_system_status()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.system_status
    WHERE id IN (
        SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY status_type ORDER BY last_updated DESC) as rn
            FROM public.system_status
        ) ranked
        WHERE rn > 100
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for current system status
CREATE VIEW public.current_system_status AS
SELECT
    status_type,
    status_value,
    details,
    last_updated,
    updated_by
FROM public.system_status
ORDER BY status_type;

-- Create view for system health dashboard
CREATE VIEW public.system_health_dashboard AS
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

-- Comments for documentation
COMMENT ON TABLE public.system_status IS 'Tracks system health and status information including content pack status and fallback mode';
COMMENT ON COLUMN public.system_status.id IS 'Unique identifier for the system status entry';
COMMENT ON COLUMN public.system_status.status_type IS 'Type of status being tracked (content_pack_status, fallback_mode, etc.)';
COMMENT ON COLUMN public.system_status.status_value IS 'Current status value for the given type';
COMMENT ON COLUMN public.system_status.details IS 'Additional details about the status in JSON format';
COMMENT ON COLUMN public.system_status.last_updated IS 'Timestamp when the status was last updated';
COMMENT ON COLUMN public.system_status.updated_by IS 'User or system that last updated the status';

COMMENT ON FUNCTION public.update_system_status IS 'Updates or inserts system status information';
COMMENT ON FUNCTION public.get_system_status IS 'Retrieves current system status for all components';
COMMENT ON FUNCTION public.get_system_health_summary IS 'Returns a summary of overall system health';
COMMENT ON FUNCTION public.cleanup_old_system_status IS 'Cleans up old system status entries to prevent table bloat';

COMMENT ON VIEW public.current_system_status IS 'View of current system status information';
COMMENT ON VIEW public.system_health_dashboard IS 'Dashboard view of system health components';
