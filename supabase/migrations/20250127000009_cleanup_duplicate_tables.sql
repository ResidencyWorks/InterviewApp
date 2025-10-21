-- Migration: 009_cleanup_duplicate_tables.sql
-- Description: Clean up duplicate table definitions and ensure proper schema
-- Date: 2025-01-27
-- Feature: Database Schema Cleanup

-- Drop duplicate tables from migration 002 (initial_schema_ts.sql)
-- These tables conflict with the proper schema in migration 001

-- Drop sessions table (not needed with Supabase auth)
DROP TABLE IF EXISTS public.sessions CASCADE;

-- Drop the duplicate users table from migration 002
-- Keep the one from migration 001 that properly references auth.users
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop the duplicate content_packs table from migration 002
-- Keep the one from migration 001 that has proper structure
DROP TABLE IF EXISTS public.content_packs CASCADE;

-- Drop the duplicate evaluations table from migration 002
-- Keep the evaluation_results table from migration 001
DROP TABLE IF EXISTS public.evaluations CASCADE;

-- Drop audit_logs table (not currently used)
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Recreate the proper users table if it was dropped
-- This ensures we have the correct schema that references auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  entitlement_level user_entitlement_level DEFAULT 'FREE',
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate the proper content_packs table if it was dropped
-- This ensures we have the correct schema with all necessary columns
CREATE TABLE IF NOT EXISTS public.content_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  schema_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  content JSONB NOT NULL,
  metadata JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'uploaded',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_by UUID REFERENCES auth.users(id),
  uploaded_by UUID REFERENCES auth.users(id),
  file_size BIGINT,
  checksum VARCHAR(64)
);

-- Recreate the proper evaluation_results table if it was dropped
CREATE TABLE IF NOT EXISTS public.evaluation_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content_pack_id UUID REFERENCES public.content_packs(id) ON DELETE SET NULL,
  response_text TEXT,
  response_audio_url TEXT,
  response_type TEXT NOT NULL CHECK (response_type IN ('text', 'audio')),
  duration_seconds INTEGER,
  word_count INTEGER,
  wpm DECIMAL(5,2),
  categories JSONB NOT NULL DEFAULT '{}',
  feedback TEXT,
  score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
  status evaluation_status DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate the user_entitlements table if it was dropped
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  entitlement_level user_entitlement_level NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all necessary triggers exist
-- Update trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for user_entitlements table
DROP TRIGGER IF EXISTS update_user_entitlements_updated_at ON public.user_entitlements;
CREATE TRIGGER update_user_entitlements_updated_at
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for content_packs table
DROP TRIGGER IF EXISTS update_content_packs_updated_at ON public.content_packs;
CREATE TRIGGER update_content_packs_updated_at
  BEFORE UPDATE ON public.content_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update trigger for evaluation_results table
DROP TRIGGER IF EXISTS update_evaluation_results_updated_at ON public.evaluation_results;
CREATE TRIGGER update_evaluation_results_updated_at
  BEFORE UPDATE ON public.evaluation_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Ensure RLS is enabled on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;

-- Recreate essential RLS policies
-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- User entitlements policies
DROP POLICY IF EXISTS "Users can view own entitlements" ON public.user_entitlements;
CREATE POLICY "Users can view own entitlements" ON public.user_entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- Content packs policies
DROP POLICY IF EXISTS "Authenticated users can view content packs" ON public.content_packs;
CREATE POLICY "Authenticated users can view content packs" ON public.content_packs
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can manage content packs" ON public.content_packs;
CREATE POLICY "Authenticated users can manage content packs" ON public.content_packs
  FOR ALL USING (auth.role() = 'authenticated');

-- Evaluation results policies
DROP POLICY IF EXISTS "Users can view own evaluation results" ON public.evaluation_results;
CREATE POLICY "Users can view own evaluation results" ON public.evaluation_results
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own evaluation results" ON public.evaluation_results;
CREATE POLICY "Users can insert own evaluation results" ON public.evaluation_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own evaluation results" ON public.evaluation_results;
CREATE POLICY "Users can update own evaluation results" ON public.evaluation_results
  FOR UPDATE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.user_entitlements IS 'User subscription and entitlement levels';
COMMENT ON TABLE public.content_packs IS 'Content packs for interview questions and evaluations';
COMMENT ON TABLE public.evaluation_results IS 'Results from user evaluations and assessments';
