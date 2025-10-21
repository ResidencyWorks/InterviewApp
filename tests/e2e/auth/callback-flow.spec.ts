import { expect, test } from "@playwright/test";

test.describe("Auth Callback E2E Tests", () => {
	test("should handle successful authentication callback", async ({ page }) => {
		// Mock successful auth callback
		await page.goto("/auth/callback?code=test-code&next=/dashboard");

		// Should redirect to dashboard after successful auth
		await expect(page).toHaveURL("/dashboard");
	});

	test("should handle authentication callback error", async ({ page }) => {
		// Mock auth callback with error
		await page.goto(
			"/auth/callback?error=access_denied&error_description=User%20denied%20access",
		);

		// Should redirect to login with error
		await expect(page).toHaveURL(/\/auth\/login\?error=/);
	});

	test("should handle missing code parameter", async ({ page }) => {
		// Navigate to callback without code
		await page.goto("/auth/callback");

		// Should redirect to login
		await expect(page).toHaveURL("/auth/login");
	});

	test("should preserve redirect URL after successful auth", async ({
		page,
	}) => {
		// Mock successful auth callback with custom redirect
		await page.goto("/auth/callback?code=test-code&next=/profile");

		// Should redirect to the specified next URL
		await expect(page).toHaveURL("/profile");
	});

	test("should handle malformed callback parameters", async ({ page }) => {
		// Navigate to callback with malformed parameters
		await page.goto("/auth/callback?code=&next=");

		// Should redirect to login
		await expect(page).toHaveURL("/auth/login");
	});
});
