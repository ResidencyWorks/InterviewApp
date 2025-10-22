-- Migration: 007_fix_users_insert_policy.sql
-- Description: Add INSERT policy for users table to allow users to create their own records
-- Date: 2025-01-27
-- Feature: Fix RLS Policy for User Creation

-- Add INSERT policy for users table
-- This allows users to create their own user record if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'users'
        AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile" ON public.users
          FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Also add a policy to allow users to insert their own entitlements
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'user_entitlements'
        AND policyname = 'Users can insert own entitlements'
    ) THEN
        CREATE POLICY "Users can insert own entitlements" ON public.user_entitlements
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Grant INSERT permission to authenticated users on users table
GRANT INSERT ON public.users TO authenticated;

-- Add comment for documentation
COMMENT ON POLICY "Users can insert own profile" ON public.users IS 'Allows users to create their own user record if it does not exist';
