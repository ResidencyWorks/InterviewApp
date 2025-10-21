-- Database Schema Verification Script
-- Run this to check for duplicate tables, missing triggers, and schema issues

-- Check 1: List all tables in public schema
SELECT
    'Tables in public schema' as check_type,
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check 2: Check for duplicate table names
SELECT
    'Potential Duplicate Tables' as check_type,
    tablename,
    COUNT(*) as table_count
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 1
ORDER BY tablename;

-- Check 3: List all triggers
SELECT
    'All Triggers' as check_type,
    trigger_schema,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth')
ORDER BY trigger_schema, event_object_table, trigger_name;

-- Check 4: Check for missing triggers on core tables
WITH expected_triggers AS (
    SELECT 'public.users' as table_name, 'update_users_updated_at' as trigger_name
    UNION ALL SELECT 'public.user_entitlements', 'update_user_entitlements_updated_at'
    UNION ALL SELECT 'public.content_packs', 'update_content_packs_updated_at'
    UNION ALL SELECT 'public.evaluation_results', 'update_evaluation_results_updated_at'
    UNION ALL SELECT 'auth.users', 'on_auth_user_created'
    UNION ALL SELECT 'auth.users', 'on_auth_user_updated'
    UNION ALL SELECT 'auth.users', 'on_auth_user_deleted'
),
actual_triggers AS (
    SELECT
        trigger_schema || '.' || event_object_table as table_name,
        trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema IN ('public', 'auth')
)
SELECT
    'Missing Triggers' as check_type,
    et.table_name,
    et.trigger_name,
    CASE WHEN at.trigger_name IS NULL THEN 'MISSING' ELSE 'EXISTS' END as status
FROM expected_triggers et
LEFT JOIN actual_triggers at ON et.table_name = at.table_name AND et.trigger_name = at.trigger_name
ORDER BY et.table_name, et.trigger_name;

-- Check 5: Check table structures for consistency
SELECT
    'Table Structure Check' as check_type,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('users', 'content_packs', 'evaluation_results', 'user_entitlements')
ORDER BY table_name, ordinal_position;

-- Check 6: Check for foreign key constraints
SELECT
    'Foreign Key Constraints' as check_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Check 7: Check RLS policies
SELECT
    'RLS Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check 8: Check for functions
SELECT
    'Functions' as check_type,
    routine_schema,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%'
ORDER BY routine_name;

-- Check 9: Check for indexes
SELECT
    'Indexes' as check_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'content_packs', 'evaluation_results', 'user_entitlements')
ORDER BY tablename, indexname;

-- Check 10: Check for any orphaned data
SELECT
    'Orphaned Data Check' as check_type,
    'user_entitlements' as table_name,
    COUNT(*) as orphaned_records
FROM public.user_entitlements ue
LEFT JOIN public.users u ON ue.user_id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT
    'Orphaned Data Check' as check_type,
    'evaluation_results' as table_name,
    COUNT(*) as orphaned_records
FROM public.evaluation_results er
LEFT JOIN public.users u ON er.user_id = u.id
WHERE u.id IS NULL;
