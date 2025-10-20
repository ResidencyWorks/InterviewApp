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
  Object.assign(process.env, {
    NODE_ENV: 'test',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    PLAYWRIGHT_BASE_URL: 'http://localhost:3000',
  })
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
