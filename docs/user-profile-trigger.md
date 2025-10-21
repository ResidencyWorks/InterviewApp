# User Profile Auto-Creation Trigger

## Overview

This document explains the automatic user profile creation system that runs when new users sign up with Supabase auth (including magic link authentication).

## Problem Solved

Previously, when users signed up with magic links:
- ✅ User was created in `auth.users` (Supabase handles this)
- ❌ No entry created in `public.users`
- ❌ No entry created in `public.user_preferences`
- ❌ No entry created in `public.user_profiles`
- ❌ No entry created in `public.user_entitlements`

This caused issues with:
- Admin features not working (no role data)
- User preferences not being available
- Content pack management failing
- Missing user profile data

## Solution

The migration `20250127000006_user_profile_trigger.sql` creates:

### 1. Database Functions

#### `handle_new_user()`
- **Triggered**: After INSERT on `auth.users`
- **Purpose**: Creates complete user profile when user signs up
- **Actions**:
  - Inserts into `public.users` with default values
  - Creates default preferences in `public.user_preferences`
  - Creates profile in `public.user_profiles`
  - Creates entitlement in `public.user_entitlements`

#### `handle_user_update()`
- **Triggered**: After UPDATE on `auth.users`
- **Purpose**: Syncs changes from auth to public tables
- **Actions**:
  - Updates `public.users` with new email/name/avatar

#### `handle_user_delete()`
- **Triggered**: After DELETE on `auth.users`
- **Purpose**: Cleans up user data
- **Actions**:
  - Deletes from `public.users` (CASCADE handles related tables)

### 2. Database Triggers

```sql
-- Creates user profiles on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Syncs updates from auth
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Cleans up on deletion
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();
```

### 3. Default Values Created

#### User Preferences (`public.user_preferences`)
```json
{
  "theme": "system",
  "notifications": "true",
  "language": "en",
  "email_notifications": "true",
  "push_notifications": "false"
}
```

#### User Profile (`public.user_profiles`)
```json
{
  "language": "en",
  "notification_preferences": {
    "email": true,
    "push": false,
    "marketing": false
  },
  "privacy_settings": {
    "profile_visibility": "private",
    "show_email": false
  }
}
```

#### User Entitlement (`public.user_entitlements`)
```json
{
  "entitlement_level": "FREE",
  "expires_at": "1 year from creation"
}
```

### 4. Row Level Security (RLS) Policies

The migration also sets up proper RLS policies:

- Users can only view/edit their own preferences
- Users can only view/edit their own profiles
- Proper permissions for authenticated users

## How to Apply

### ✅ **Migration Applied Successfully!**

The migration has been successfully applied to your Supabase database. The trigger is now active and will automatically create user profiles when new users sign up.

### Verification

To verify the trigger is working correctly, run:

```bash
# Run the verification script
psql -h localhost -p 54322 -U postgres -d postgres -f scripts/verify-trigger.sql
```

Or manually check in your Supabase SQL editor:

```sql
-- Check if triggers exist
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND event_object_table = 'users';

-- Check if functions exist
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'handle_%';
```

### Manual Application (if needed)
```bash
# Start Supabase (if not running)
supabase start

# Apply migration
supabase db push
```

## Testing

### Test the Trigger
```bash
# Run the test script
psql -h localhost -p 54322 -U postgres -d postgres -f scripts/test-user-trigger.sql
```

### Manual Testing
1. Sign up a new user with magic link
2. Check that entries exist in:
   - `public.users`
   - `public.user_preferences`
   - `public.user_profiles`
   - `public.user_entitlements`

### SQL Queries to Verify
```sql
-- Check if user profile exists
SELECT * FROM public.users WHERE email = 'user@example.com';

-- Check preferences
SELECT * FROM public.user_preferences WHERE user_id = 'user-uuid';

-- Check profile
SELECT * FROM public.user_profiles WHERE user_id = 'user-uuid';

-- Check entitlement
SELECT * FROM public.user_entitlements WHERE user_id = 'user-uuid';
```

## Benefits

### ✅ Automatic Profile Creation
- No manual intervention needed
- Works for all signup methods (magic link, OAuth, etc.)
- Handles edge cases automatically

### ✅ Consistent Default Values
- All users get the same starting preferences
- Proper entitlement levels set
- Sensible privacy defaults

### ✅ Data Integrity
- Atomic operations (all-or-nothing)
- Proper foreign key relationships
- CASCADE deletes handle cleanup

### ✅ Security
- Proper RLS policies
- Users can only access their own data
- Secure function execution

## Troubleshooting

### Trigger Not Firing
1. Check if triggers exist:
   ```sql
   SELECT * FROM information_schema.triggers
   WHERE event_object_table = 'users' AND trigger_schema = 'auth';
   ```

2. Check function exists:
   ```sql
   SELECT * FROM information_schema.routines
   WHERE routine_name = 'handle_new_user';
   ```

### RLS Issues
1. Check policies:
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

2. Verify user permissions:
   ```sql
   SELECT * FROM information_schema.role_table_grants
   WHERE grantee = 'authenticated';
   ```

### Data Not Created
1. Check for errors in Supabase logs
2. Verify the trigger function has proper permissions
3. Test with a simple INSERT to see if trigger fires

## Future Enhancements

### Potential Improvements
1. **Custom Default Preferences**: Allow admins to set default preferences
2. **Welcome Email**: Trigger welcome email on profile creation
3. **Analytics**: Track user signup events
4. **A/B Testing**: Different defaults for different user groups

### Monitoring
Consider adding:
- Logging for trigger execution
- Metrics on profile creation success/failure
- Alerts for trigger failures

## Related Files

- `supabase/migrations/20250127000006_user_profile_trigger.sql` - Main migration
- `scripts/apply-user-trigger.sh` - Application script
- `scripts/test-user-trigger.sql` - Test script
- `docs/user-profile-trigger.md` - This documentation
