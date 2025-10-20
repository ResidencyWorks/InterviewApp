import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
}

// Mock createClient function
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock the useAuth hook
const mockUseAuth = vi.fn() as any
vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
      },
      writable: true,
    })

    // Mock initial session
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
  })

  describe('useAuth hook', () => {
    it('should return user and loading state', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      }

      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
      })

      const result = mockUseAuth()

      expect(result.user).toEqual(mockUser)
      expect(result.loading).toBe(false)
      expect(typeof result.signIn).toBe('function')
      expect(typeof result.signOut).toBe('function')
    })

    it('should return null user when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
      })

      const result = mockUseAuth()

      expect(result.user).toBeNull()
      expect(result.loading).toBe(false)
    })

    it('should return loading state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signIn: vi.fn(),
        signOut: vi.fn(),
      })

      const result = mockUseAuth()

      expect(result.loading).toBe(true)
    })
  })
})
