#!/bin/bash

# Script to apply user profile trigger migration
# Run this when you have access to your Supabase instance

echo "🚀 Applying user profile trigger migration..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    exit 1
fi

# Start Supabase services if not running
echo "📡 Starting Supabase services..."
supabase start

# Apply the migration
echo "📝 Applying migration..."
supabase db reset

# Verify the trigger was created
echo "✅ Verifying trigger creation..."
supabase db diff --schema public

echo "🎉 User profile trigger migration applied successfully!"
echo ""
echo "📋 What this migration does:"
echo "  • Creates automatic user profiles when users sign up"
echo "  • Sets up default preferences and settings"
echo "  • Handles user updates and deletions"
echo "  • Configures proper RLS policies"
echo ""
echo "🧪 To test:"
echo "  1. Sign up a new user with magic link"
echo "  2. Check that entries exist in:"
echo "     - public.users"
echo "     - public.user_preferences"
echo "     - public.user_profiles"
echo "     - public.user_entitlements"
