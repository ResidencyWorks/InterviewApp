-- Migration: Add stripe_event_id column and indexes to user_entitlements table
-- Purpose: Support idempotent webhook processing for Stripe checkout events
-- Date: 2025-01-27
-- Feature: 011-stripe-checkout-entitlements

-- Add stripe_event_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_entitlements'
        AND column_name = 'stripe_event_id'
    ) THEN
        ALTER TABLE public.user_entitlements
        ADD COLUMN stripe_event_id TEXT;
    END IF;
END $$;

-- Add UNIQUE constraint on stripe_event_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_entitlements_stripe_event_id_key'
    ) THEN
        ALTER TABLE public.user_entitlements
        ADD CONSTRAINT user_entitlements_stripe_event_id_key UNIQUE (stripe_event_id);
    END IF;
END $$;

-- Create index on user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id
ON public.user_entitlements(user_id);

-- Create index on stripe_event_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_entitlements_stripe_event_id
ON public.user_entitlements(stripe_event_id);

-- Create index on expires_at if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_entitlements_expires_at
ON public.user_entitlements(expires_at);
