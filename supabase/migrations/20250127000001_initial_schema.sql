-- Initial database schema for Interview Drills application
-- This migration sets up the core tables for user management, evaluations, and content packs

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_entitlement_level AS ENUM ('FREE', 'TRIAL', 'PRO');
CREATE TYPE evaluation_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  entitlement_level user_entitlement_level DEFAULT 'FREE',
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User entitlements cache table
CREATE TABLE public.user_entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  entitlement_level user_entitlement_level NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content packs table
CREATE TABLE public.content_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  content JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evaluation results table
CREATE TABLE public.evaluation_results (
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

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_stripe_customer_id ON public.users(stripe_customer_id);
CREATE INDEX idx_user_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX idx_user_entitlements_expires_at ON public.user_entitlements(expires_at);
CREATE INDEX idx_content_packs_is_active ON public.content_packs(is_active);
CREATE INDEX idx_evaluation_results_user_id ON public.evaluation_results(user_id);
CREATE INDEX idx_evaluation_results_created_at ON public.evaluation_results(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_entitlements_updated_at BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_packs_updated_at BEFORE UPDATE ON public.content_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluation_results_updated_at BEFORE UPDATE ON public.evaluation_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- User entitlements policies
CREATE POLICY "Users can view own entitlements" ON public.user_entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- Content packs are readable by all authenticated users
CREATE POLICY "Authenticated users can view content packs" ON public.content_packs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage content packs (for now, all authenticated users)
CREATE POLICY "Authenticated users can manage content packs" ON public.content_packs
  FOR ALL USING (auth.role() = 'authenticated');

-- Users can only see their own evaluation results
CREATE POLICY "Users can view own evaluation results" ON public.evaluation_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evaluation results" ON public.evaluation_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evaluation results" ON public.evaluation_results
  FOR UPDATE USING (auth.uid() = user_id);
