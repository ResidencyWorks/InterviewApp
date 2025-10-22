-- Fix RLS policy for users table
-- This allows users to insert their own records

-- Add INSERT policy for users table
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant INSERT permission to authenticated users on users table
GRANT INSERT ON public.users TO authenticated;
