import { LoginForm } from '@/components/auth/LoginForm'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock useAuth hook
const mockSignIn = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: mockSignIn,
    signOut: vi.fn(),
  }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send magic link/i })
    ).toBeInTheDocument()
  })

  it('should handle form submission', async () => {
    const email = 'test@example.com'
    mockSignIn.mockResolvedValue(undefined)

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    })

    fireEvent.change(emailInput, { target: { value: email } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(email)
    })
  })

  it('should show loading state during submission', async () => {
    const email = 'test@example.com'
    mockSignIn.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    })

    fireEvent.change(emailInput, { target: { value: email } })
    fireEvent.click(submitButton)

    expect(screen.getByText(/sending magic link/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('should show success message after successful submission', async () => {
    const email = 'test@example.com'
    mockSignIn.mockResolvedValue(undefined)

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    })

    fireEvent.change(emailInput, { target: { value: email } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/check your email for the magic link/i)
      ).toBeInTheDocument()
    })
  })

  it('should show error message on submission failure', async () => {
    const email = 'test@example.com'
    const errorMessage = 'Sign in failed'
    mockSignIn.mockRejectedValue(new Error(errorMessage))

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    })

    fireEvent.change(emailInput, { target: { value: email } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('should disable submit button when email is empty', () => {
    render(<LoginForm />)

    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    })
    expect(submitButton).toBeDisabled()
  })

  it('should call onSuccess callback when provided', async () => {
    const email = 'test@example.com'
    const onSuccess = vi.fn()
    mockSignIn.mockResolvedValue(undefined)

    render(<LoginForm onSuccess={onSuccess} />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', {
      name: /send magic link/i,
    })

    fireEvent.change(emailInput, { target: { value: email } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
