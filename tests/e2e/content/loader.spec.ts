import { expect, test } from "@playwright/test";

test.describe("Content Loader Page", () => {
	test("renders and has upload input", async ({ page }) => {
		await page.goto("/ (dashboard)/loader".replace(" ", ""));
		// Fallback if route group is different in deployment; try canonical path
		if (!(await page.getByText("Content Pack Loader").isVisible())) {
			await page.goto("/app/(dashboard)/loader");
		}

		await expect(page.getByText("Content Pack Loader")).toBeVisible();
		const fileInput = page.locator(
			'input[type="file"][accept="application/json"]',
		);
		await expect(fileInput).toBeVisible();
	});
});
