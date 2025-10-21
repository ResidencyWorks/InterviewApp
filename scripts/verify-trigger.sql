-- Verification script to check if the user profile trigger is working
-- Run this after applying the migration to verify everything is set up correctly

-- Check 1: Verify functions exist
SELECT
    'Functions Check' as test_type,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('handle_new_user', 'handle_user_update', 'handle_user_delete')
ORDER BY routine_name;

-- Check 2: Verify triggers exist
SELECT
    'Triggers Check' as test_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND event_object_table = 'users'
AND trigger_name LIKE '%user%'
ORDER BY trigger_name;

-- Check 3: Verify permissions for supabase_auth_admin
SELECT
    'Permissions Check' as test_type,
    grantee,
    privilege_type,
    table_name
FROM information_schema.table_privileges
WHERE grantee = 'supabase_auth_admin'
AND table_schema = 'public'
AND table_name IN ('users', 'user_preferences', 'user_profiles', 'user_entitlements')
ORDER BY table_name, privilege_type;

-- Check 4: Verify function permissions
SELECT
    'Function Permissions' as test_type,
    grantee,
    privilege_type,
    routine_name
FROM information_schema.routine_privileges
WHERE grantee = 'supabase_auth_admin'
AND routine_schema = 'public'
AND routine_name IN ('handle_new_user', 'handle_user_update', 'handle_user_delete')
ORDER BY routine_name, privilege_type;

-- Check 5: Verify RLS policies
SELECT
    'RLS Policies' as test_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_preferences', 'user_profiles')
ORDER BY tablename, policyname;

-- Check 6: Test the trigger with a simulated user (safe test)
-- This creates a temporary user to test the trigger without affecting real data
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'trigger-test@example.com';
    user_count_before INTEGER;
    user_count_after INTEGER;
    pref_count INTEGER;
    profile_count INTEGER;
    entitlement_count INTEGER;
BEGIN
    RAISE NOTICE '🧪 Testing user profile trigger...';

    -- Count existing users before test
    SELECT COUNT(*) INTO user_count_before FROM public.users;

    -- Insert a test user into auth.users (this should trigger our function)
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data,
        raw_app_meta_data,
        is_super_admin,
        last_sign_in_at,
        app_metadata,
        user_metadata,
        identities,
        factors
    ) VALUES (
        test_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        test_email,
        crypt('test-password', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"full_name": "Trigger Test User", "avatar_url": "https://example.com/test-avatar.jpg"}',
        '{"provider": "email", "providers": ["email"]}',
        false,
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Trigger Test User", "avatar_url": "https://example.com/test-avatar.jpg"}',
        '[]',
        '[]'
    );

    -- Count users after test
    SELECT COUNT(*) INTO user_count_after FROM public.users;

    -- Check if user profile was created
    SELECT COUNT(*) INTO pref_count FROM public.user_preferences WHERE user_id = test_user_id;
    SELECT COUNT(*) INTO profile_count FROM public.user_profiles WHERE user_id = test_user_id;
    SELECT COUNT(*) INTO entitlement_count FROM public.user_entitlements WHERE user_id = test_user_id;

    -- Report results
    IF user_count_after > user_count_before THEN
        RAISE NOTICE '✅ User created in public.users table';
    ELSE
        RAISE NOTICE '❌ User NOT created in public.users table';
    END IF;

    IF pref_count > 0 THEN
        RAISE NOTICE '✅ User preferences created (% records)', pref_count;
    ELSE
        RAISE NOTICE '❌ User preferences NOT created';
    END IF;

    IF profile_count > 0 THEN
        RAISE NOTICE '✅ User profile created';
    ELSE
        RAISE NOTICE '❌ User profile NOT created';
    END IF;

    IF entitlement_count > 0 THEN
        RAISE NOTICE '✅ User entitlement created';
    ELSE
        RAISE NOTICE '❌ User entitlement NOT created';
    END IF;

    -- Clean up test user
    DELETE FROM auth.users WHERE id = test_user_id;
    RAISE NOTICE '🧹 Test user cleaned up';

    -- Final verification
    IF user_count_after > user_count_before AND pref_count > 0 AND profile_count > 0 AND entitlement_count > 0 THEN
        RAISE NOTICE '🎉 SUCCESS: User profile trigger is working correctly!';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Some parts of the trigger may not be working correctly';
    END IF;

END $$;

-- Check 7: Show sample data structure
SELECT
    'Sample Data Structure' as test_type,
    'users' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

SELECT
    'Sample Data Structure' as test_type,
    'user_preferences' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_preferences'
ORDER BY ordinal_position;
