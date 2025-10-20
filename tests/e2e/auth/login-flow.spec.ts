import { expect, test } from '@playwright/test'

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/auth/login')
  })

  test('should display login form', async ({ page }) => {
    // Check that login form elements are present
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Send magic link' })
    ).toBeVisible()
    await expect(
      page.getByText(
        "Enter your email address and we'll send you a magic link to sign in"
      )
    ).toBeVisible()
  })

  test('should validate email input', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: 'Send magic link' })

    // Submit button should be disabled when email is empty
    await expect(submitButton).toBeDisabled()

    // Enter invalid email
    await page.getByLabel('Email address').fill('invalid-email')
    await expect(submitButton).toBeDisabled()

    // Enter valid email
    await page.getByLabel('Email address').fill('test@example.com')
    await expect(submitButton).toBeEnabled()
  })

  test('should handle magic link submission', async ({ page }) => {
    // Mock the API response
    await page.route('**/api/auth', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Magic link sent successfully',
          }),
        })
      }
    })

    // Fill in email and submit
    await page.getByLabel('Email address').fill('test@example.com')
    await page.getByRole('button', { name: 'Send magic link' }).click()

    // Check for success message
    await expect(
      page.getByText('Check your email for the magic link!')
    ).toBeVisible()
  })

  test('should handle magic link submission error', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/auth', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid email format',
          }),
        })
      }
    })

    // Fill in email and submit
    await page.getByLabel('Email address').fill('invalid-email')
    await page.getByRole('button', { name: 'Send magic link' }).click()

    // Check for error message
    await expect(page.getByText('Invalid email format')).toBeVisible()
  })

  test('should show loading state during submission', async ({ page }) => {
    // Mock delayed API response
    await page.route('**/api/auth', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Magic link sent successfully',
          }),
        })
      }
    })

    // Fill in email and submit
    await page.getByLabel('Email address').fill('test@example.com')
    await page.getByRole('button', { name: 'Send magic link' }).click()

    // Check for loading state
    await expect(page.getByText('Sending magic link...')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Sending magic link...' })
    ).toBeDisabled()
  })

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/auth', (route) => route.abort())

    // Fill in email and submit
    await page.getByLabel('Email address').fill('test@example.com')
    await page.getByRole('button', { name: 'Send magic link' }).click()

    // Check for error message
    await expect(page.getByText(/failed to send magic link/i)).toBeVisible()
  })
})
