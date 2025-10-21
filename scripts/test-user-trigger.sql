-- Test script to verify user profile trigger works correctly
-- Run this after applying the migration to test the trigger

-- Test 1: Check if trigger function exists
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('handle_new_user', 'handle_user_update', 'handle_user_delete');

-- Test 2: Check if triggers exist
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND event_object_table = 'users'
AND trigger_name LIKE '%user%';

-- Test 3: Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_preferences', 'user_profiles')
ORDER BY tablename, policyname;

-- Test 4: Simulate a new user (this would normally be done by Supabase auth)
-- Note: This is just for testing the trigger logic, not for actual user creation
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
BEGIN
    -- Insert a test user into auth.users (simulating signup)
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
        crypt('password', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"full_name": "Test User", "avatar_url": "https://example.com/avatar.jpg"}',
        '{"provider": "email", "providers": ["email"]}',
        false,
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Test User", "avatar_url": "https://example.com/avatar.jpg"}',
        '[]',
        '[]'
    );

    -- Check if user profile was created
    RAISE NOTICE 'Checking if user profile was created...';

    -- Verify user exists in public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE id = test_user_id) THEN
        RAISE NOTICE '✅ User created in public.users';
    ELSE
        RAISE NOTICE '❌ User NOT created in public.users';
    END IF;

    -- Verify user preferences were created
    IF EXISTS (SELECT 1 FROM public.user_preferences WHERE user_id = test_user_id) THEN
        RAISE NOTICE '✅ User preferences created';
    ELSE
        RAISE NOTICE '❌ User preferences NOT created';
    END IF;

    -- Verify user profile was created
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = test_user_id) THEN
        RAISE NOTICE '✅ User profile created';
    ELSE
        RAISE NOTICE '❌ User profile NOT created';
    END IF;

    -- Verify user entitlement was created
    IF EXISTS (SELECT 1 FROM public.user_entitlements WHERE user_id = test_user_id) THEN
        RAISE NOTICE '✅ User entitlement created';
    ELSE
        RAISE NOTICE '❌ User entitlement NOT created';
    END IF;

    -- Clean up test user
    DELETE FROM auth.users WHERE id = test_user_id;
    RAISE NOTICE '🧹 Test user cleaned up';

END $$;

-- Test 5: Check default values
SELECT
    'Default Preferences' as test_type,
    preference_key,
    preference_value
FROM public.user_preferences
WHERE user_id IN (
    SELECT id FROM public.users LIMIT 1
)
ORDER BY preference_key;

-- Test 6: Check user profile defaults
SELECT
    'Default Profile' as test_type,
    language,
    notification_preferences,
    privacy_settings
FROM public.user_profiles
WHERE user_id IN (
    SELECT id FROM public.users LIMIT 1
)
LIMIT 1;
