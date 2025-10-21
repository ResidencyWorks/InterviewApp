-- Migration: 006_user_profile_trigger.sql
-- Description: Create automatic user profile creation trigger
-- Date: 2025-01-27
-- Feature: User Profile Auto-Creation

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert into public.users table
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    entitlement_level,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'FREE',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();

  -- Create default user preferences
  INSERT INTO public.user_preferences (user_id, preference_key, preference_value)
  VALUES
    (NEW.id, 'theme', 'system'),
    (NEW.id, 'notifications', 'true'),
    (NEW.id, 'language', 'en'),
    (NEW.id, 'email_notifications', 'true'),
    (NEW.id, 'push_notifications', 'false')
  ON CONFLICT (user_id, preference_key) DO NOTHING;

  -- Create user profile
  INSERT INTO public.user_profiles (
    user_id,
    language,
    notification_preferences,
    privacy_settings,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'en',
    '{"email": true, "push": false, "marketing": false}',
    '{"profile_visibility": "private", "show_email": false}',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

  -- Create default entitlement entry
  INSERT INTO public.user_entitlements (
    user_id,
    entitlement_level,
    expires_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'FREE',
    NOW() + INTERVAL '1 year', -- Free tier doesn't expire, but set a far future date
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger to automatically create user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update public.users table when auth.users is updated
  UPDATE public.users SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', users.full_name),
    avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', users.avatar_url),
    updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- Create trigger to handle user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();

-- Create function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete from public.users (CASCADE will handle related tables)
  DELETE FROM public.users WHERE id = OLD.id;

  RETURN OLD;
END;
$$;

-- Create trigger to handle user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_delete();

-- Update RLS policies for user_preferences table
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own preferences" ON public.user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Update RLS policies for user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON public.user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_user_update() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_user_delete() TO supabase_auth_admin;

-- Grant permissions on tables to supabase_auth_admin
GRANT INSERT, UPDATE, DELETE ON public.users TO supabase_auth_admin;
GRANT INSERT, UPDATE, DELETE ON public.user_preferences TO supabase_auth_admin;
GRANT INSERT, UPDATE, DELETE ON public.user_profiles TO supabase_auth_admin;
GRANT INSERT, UPDATE, DELETE ON public.user_entitlements TO supabase_auth_admin;

-- Grant usage on schema to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile and preferences when a new user signs up';
COMMENT ON FUNCTION public.handle_user_update() IS 'Updates user profile when auth.users is updated';
COMMENT ON FUNCTION public.handle_user_delete() IS 'Cleans up user data when auth.users is deleted';
