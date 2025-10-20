/**
 * Test setup file for Vitest
 * Configures test environment and global test utilities
 */

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { vi } from 'vitest'

// Mock environment variables for tests
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
  process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only'
  process.env.SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  process.env.PLAYWRIGHT_BASE_URL = 'http://localhost:3000'
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Global test cleanup
afterAll(() => {
  vi.restoreAllMocks()
})
