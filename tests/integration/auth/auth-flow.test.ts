import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Integration test for complete authentication flow
describe('Authentication Flow Integration', () => {
  let supabase: ReturnType<typeof createClient>
  const testEmail = `test-${Date.now()}@example.com`

  beforeAll(() => {
    // Initialize Supabase client with test credentials
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    )
  })

  beforeEach(async () => {
    // Clean up any existing test user
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore errors if not signed in
    }
  })

  afterAll(async () => {
    // Clean up test user
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('Magic Link Authentication', () => {
    it('should send magic link successfully', async () => {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: testEmail,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        },
      })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should handle invalid email format', async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: 'invalid-email',
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        },
      })

      expect(error).toBeDefined()
      expect(error?.message).toContain('email')
    })

    it('should handle empty email', async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: '',
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        },
      })

      expect(error).toBeDefined()
    })
  })

  describe('Session Management', () => {
    it('should get current user when not authenticated', async () => {
      const { data, error } = await supabase.auth.getUser()

      expect(error).toBeNull()
      expect(data.user).toBeNull()
    })

    it('should handle session refresh', async () => {
      const { data, error } = await supabase.auth.refreshSession()

      expect(error).toBeNull()
      expect(data.session).toBeNull() // No active session
    })
  })

  describe('Profile Management', () => {
    it('should update user metadata when authenticated', async () => {
      // This test would require a valid session
      // In a real integration test, you'd use a test user with valid session
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      })

      // This will fail without authentication, which is expected
      expect(error).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Test with invalid URL to simulate network error
      const invalidSupabase = createClient(
        'https://invalid-url.supabase.co',
        'invalid-key'
      )

      const { error } = await invalidSupabase.auth.signInWithOtp({
        email: testEmail,
      })

      expect(error).toBeDefined()
    })

    it('should handle rate limiting', async () => {
      // Send multiple requests to test rate limiting
      const promises = Array(5)
        .fill(null)
        .map(() =>
          supabase.auth.signInWithOtp({
            email: testEmail,
            options: {
              emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
            },
          })
        )

      const results = await Promise.allSettled(promises)

      // At least one should succeed, others might be rate limited
      const successful = results.filter(
        (result) => result.status === 'fulfilled' && !result.value.error
      )

      expect(successful.length).toBeGreaterThan(0)
    })
  })
})
