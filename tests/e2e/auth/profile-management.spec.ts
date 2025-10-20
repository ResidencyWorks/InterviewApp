import { expect, test } from '@playwright/test'

test.describe('Profile Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication state
    await page.addInitScript(() => {
      localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({
          access_token: 'mock-token',
          user: {
            id: '123',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Test User',
              avatar_url: 'https://example.com/avatar.jpg',
              entitlement_level: 'PREMIUM',
            },
          },
        })
      )
    })

    // Mock API responses
    await page.route('**/api/auth', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: '123',
              email: 'test@example.com',
              user_metadata: {
                full_name: 'Test User',
                avatar_url: 'https://example.com/avatar.jpg',
                entitlement_level: 'PREMIUM',
              },
            },
            authenticated: true,
          }),
        })
      }
    })
  })

  test('should display user profile form', async ({ page }) => {
    await page.goto('/profile')

    // Check that profile form elements are present
    await expect(page.getByRole('textbox', { name: /email/i })).toHaveValue(
      'test@example.com'
    )
    await expect(page.getByRole('textbox', { name: /full name/i })).toHaveValue(
      'Test User'
    )
    await expect(page.getByRole('textbox', { name: /avatar/i })).toHaveValue(
      'https://example.com/avatar.jpg'
    )
    await expect(page.getByText('PREMIUM')).toBeVisible()
  })

  test('should update profile successfully', async ({ page }) => {
    // Mock profile update API
    await page.route('**/api/auth/profile', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Profile updated successfully',
          }),
        })
      }
    })

    await page.goto('/profile')

    // Update profile fields
    await page.getByRole('textbox', { name: /full name/i }).fill('Updated Name')
    await page
      .getByRole('textbox', { name: /avatar/i })
      .fill('https://new-avatar.com/image.jpg')

    // Submit form
    await page.getByRole('button', { name: 'Update Profile' }).click()

    // Check for success message
    await expect(page.getByText('Profile updated successfully!')).toBeVisible()
  })

  test('should handle profile update error', async ({ page }) => {
    // Mock profile update API error
    await page.route('**/api/auth/profile', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Profile update failed',
          }),
        })
      }
    })

    await page.goto('/profile')

    // Update profile fields
    await page.getByRole('textbox', { name: /full name/i }).fill('Updated Name')

    // Submit form
    await page.getByRole('button', { name: 'Update Profile' }).click()

    // Check for error message
    await expect(page.getByText('Profile update failed')).toBeVisible()
  })

  test('should show loading state during profile update', async ({ page }) => {
    // Mock delayed profile update API
    await page.route('**/api/auth/profile', async (route) => {
      if (route.request().method() === 'PUT') {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Profile updated successfully',
          }),
        })
      }
    })

    await page.goto('/profile')

    // Update profile fields
    await page.getByRole('textbox', { name: /full name/i }).fill('Updated Name')

    // Submit form
    await page.getByRole('button', { name: 'Update Profile' }).click()

    // Check for loading state
    await expect(page.getByText('Updating...')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Updating...' })
    ).toBeDisabled()
  })

  test('should show upgrade button for FREE users', async ({ page }) => {
    // Mock FREE user
    await page.addInitScript(() => {
      localStorage.setItem(
        'supabase.auth.token',
        JSON.stringify({
          access_token: 'mock-token',
          user: {
            id: '123',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Test User',
              entitlement_level: 'FREE',
            },
          },
        })
      )
    })

    await page.route('**/api/auth', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: '123',
              email: 'test@example.com',
              user_metadata: {
                full_name: 'Test User',
                entitlement_level: 'FREE',
              },
            },
            authenticated: true,
          }),
        })
      }
    })

    await page.goto('/profile')

    // Should show upgrade button
    await expect(page.getByText('Upgrade')).toBeVisible()
    await expect(page.getByText('FREE')).toBeVisible()
  })

  test('should not show upgrade button for PREMIUM users', async ({ page }) => {
    await page.goto('/profile')

    // Should not show upgrade button
    await expect(page.getByText('Upgrade')).not.toBeVisible()
    await expect(page.getByText('PREMIUM')).toBeVisible()
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Clear authentication state
    await page.addInitScript(() => {
      localStorage.clear()
    })

    // Mock unauthenticated API response
    await page.route('**/api/auth', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Not authenticated',
          }),
        })
      }
    })

    await page.goto('/profile')

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
