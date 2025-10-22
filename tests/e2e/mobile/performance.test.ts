import { expect, test } from "@playwright/test";

test.describe("Mobile performance", () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test("loads home within 3s on slow 3G emulation", async ({ page }) => {
		// Simulate slow 3G like conditions
		await page.route("**/*", async (route) => {
			await new Promise((r) => setTimeout(r, 100));
			route.continue();
		});
		const start = Date.now();
		await page.goto("/", { waitUntil: "domcontentloaded" });
		// Wait for main content
		await page.waitForSelector("main, [role='main']", { timeout: 3000 });
		const elapsed = Date.now() - start;
		expect(elapsed).toBeLessThanOrEqual(3000);
	});
});
