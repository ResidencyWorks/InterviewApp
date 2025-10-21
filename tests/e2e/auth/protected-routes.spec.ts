import { expect, test } from "@playwright/test";

test.describe("Protected Routes E2E Tests", () => {
	test("should redirect unauthenticated users to login", async ({ page }) => {
		// Try to access protected route without authentication
		await page.goto("/dashboard");

		// Should redirect to login page
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test("should allow access to protected routes when authenticated", async ({
		page,
	}) => {
		// Mock authentication state
		await page.addInitScript(() => {
			// Mock localStorage with auth token
			localStorage.setItem(
				"supabase.auth.token",
				JSON.stringify({
					access_token: "mock-token",
					expires_at: Date.now() + 3600000, // 1 hour from now
					refresh_token: "mock-refresh-token",
					user: {
						email: "test@example.com",
						id: "123",
						user_metadata: { full_name: "Test User" },
					},
				}),
			);
		});

		// Mock API responses for authenticated user
		await page.route("**/api/auth", async (route) => {
			if (route.request().method() === "GET") {
				await route.fulfill({
					body: JSON.stringify({
						authenticated: true,
						user: {
							email: "test@example.com",
							id: "123",
							user_metadata: { full_name: "Test User" },
						},
					}),
					contentType: "application/json",
					status: 200,
				});
			}
		});

		// Navigate to protected route
		await page.goto("/dashboard");

		// Should not redirect to login
		await expect(page).not.toHaveURL(/\/auth\/login/);
	});

	test("should show user menu when authenticated", async ({ page }) => {
		// Mock authentication state
		await page.addInitScript(() => {
			localStorage.setItem(
				"supabase.auth.token",
				JSON.stringify({
					access_token: "mock-token",
					user: {
						email: "test@example.com",
						id: "123",
						user_metadata: { full_name: "Test User" },
					},
				}),
			);
		});

		// Mock API responses
		await page.route("**/api/auth", async (route) => {
			if (route.request().method() === "GET") {
				await route.fulfill({
					body: JSON.stringify({
						authenticated: true,
						user: {
							email: "test@example.com",
							id: "123",
							user_metadata: { full_name: "Test User" },
						},
					}),
					contentType: "application/json",
					status: 200,
				});
			}
		});

		await page.goto("/dashboard");

		// Should show user menu
		await expect(
			page.getByRole("button", { name: /user menu/i }),
		).toBeVisible();
	});

	test("should handle logout from protected route", async ({ page }) => {
		// Mock authentication state
		await page.addInitScript(() => {
			localStorage.setItem(
				"supabase.auth.token",
				JSON.stringify({
					access_token: "mock-token",
					user: {
						email: "test@example.com",
						id: "123",
						user_metadata: { full_name: "Test User" },
					},
				}),
			);
		});

		// Mock API responses
		await page.route("**/api/auth", async (route) => {
			if (route.request().method() === "GET") {
				await route.fulfill({
					body: JSON.stringify({
						authenticated: true,
						user: {
							email: "test@example.com",
							id: "123",
							user_metadata: { full_name: "Test User" },
						},
					}),
					contentType: "application/json",
					status: 200,
				});
			}
		});

		await page.goto("/dashboard");

		// Click user menu
		await page.getByRole("button", { name: /user menu/i }).click();

		// Click logout
		await page.getByText("Log out").click();

		// Should redirect to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test("should handle session expiration", async ({ page }) => {
		// Mock expired session
		await page.addInitScript(() => {
			localStorage.setItem(
				"supabase.auth.token",
				JSON.stringify({
					access_token: "mock-token",
					expires_at: Date.now() - 3600000, // 1 hour ago
					user: {
						email: "test@example.com",
						id: "123",
						user_metadata: { full_name: "Test User" },
					},
				}),
			);
		});

		// Mock API response for expired session
		await page.route("**/api/auth", async (route) => {
			if (route.request().method() === "GET") {
				await route.fulfill({
					body: JSON.stringify({
						error: "Session expired",
						success: false,
					}),
					contentType: "application/json",
					status: 401,
				});
			}
		});

		await page.goto("/dashboard");

		// Should redirect to login due to expired session
		await expect(page).toHaveURL(/\/auth\/login/);
	});
});
