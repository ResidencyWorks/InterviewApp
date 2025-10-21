import { expect, test } from "@playwright/test";

test.describe("Drill Interface", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to a drill page
		await page.goto("/drill/1");
	});

	test("should display drill question and interface", async ({ page }) => {
		// Check that the question is displayed
		await expect(page.getByText("JavaScript Fundamentals")).toBeVisible();
		await expect(
			page.getByText("Explain the difference between"),
		).toBeVisible();

		// Check that the response submission interface is present
		await expect(page.getByText("Submit Your Response")).toBeVisible();
		await expect(
			page.getByRole("tab", { name: "Written Response" }),
		).toBeVisible();
		await expect(
			page.getByRole("tab", { name: "Audio Response" }),
		).toBeVisible();
	});

	test("should allow switching between text and audio tabs", async ({
		page,
	}) => {
		// Start with text tab
		await expect(
			page.getByRole("tab", { name: "Written Response" }),
		).toHaveAttribute("data-state", "active");

		// Switch to audio tab
		await page.getByRole("tab", { name: "Audio Response" }).click();
		await expect(
			page.getByRole("tab", { name: "Audio Response" }),
		).toHaveAttribute("data-state", "active");
		await expect(page.getByText("Record Your Response")).toBeVisible();

		// Switch back to text tab
		await page.getByRole("tab", { name: "Written Response" }).click();
		await expect(
			page.getByRole("tab", { name: "Written Response" }),
		).toHaveAttribute("data-state", "active");
	});

	test("should submit text response successfully", async ({ page }) => {
		const testResponse =
			"let and const are block-scoped variables introduced in ES6, while var is function-scoped. let allows reassignment but not redeclaration, const prevents both reassignment and redeclaration. var is hoisted and can be redeclared.";

		// Fill in the text response
		await page
			.getByPlaceholder(/type your interview response/i)
			.fill(testResponse);

		// Check that character count is displayed
		await expect(page.getByText(/characters/)).toBeVisible();
		await expect(page.getByText(/words/)).toBeVisible();

		// Submit the response
		await page.getByRole("button", { name: "Submit Response" }).click();

		// Wait for evaluation to complete
		await expect(page.getByText("Evaluating Your Response")).toBeVisible();

		// Wait for results to appear (this might take a few seconds)
		await expect(page.getByText("Evaluation Results")).toBeVisible({
			timeout: 10000,
		});

		// Check that score is displayed
		await expect(page.getByText(/\d+%/)).toBeVisible();

		// Check that feedback is displayed
		await expect(page.getByText("Detailed Feedback")).toBeVisible();
	});

	test("should show validation errors for short responses", async ({
		page,
	}) => {
		// Try to submit a short response
		await page.getByPlaceholder(/type your interview response/i).fill("Short");

		// Submit button should be disabled
		await expect(
			page.getByRole("button", { name: "Submit Response" }),
		).toBeDisabled();

		// Should show warning about minimum length
		await expect(
			page.getByText(/Please provide at least 10 characters/),
		).toBeVisible();
	});

	test("should show character count and word count", async ({ page }) => {
		const testText = "This is a test response with multiple words to count";

		await page.getByPlaceholder(/type your interview response/i).fill(testText);

		// Check character count
		await expect(page.getByText(/characters/)).toBeVisible();

		// Check word count
		await expect(page.getByText(/words/)).toBeVisible();
	});

	test("should prevent submission when exceeding character limit", async ({
		page,
	}) => {
		const longText = "a".repeat(2001); // Exceeds 2000 character limit

		await page.getByPlaceholder(/type your interview response/i).fill(longText);

		// Should be truncated to 2000 characters
		const textarea = page.getByPlaceholder(/type your interview response/i);
		await expect(textarea).toHaveValue("a".repeat(2000));
	});

	test("should display score breakdown when clicking on score", async ({
		page,
	}) => {
		const testResponse =
			"let and const are block-scoped variables introduced in ES6, while var is function-scoped. let allows reassignment but not redeclaration, const prevents both reassignment and redeclaration. var is hoisted and can be redeclared.";

		// Submit a response first
		await page
			.getByPlaceholder(/type your interview response/i)
			.fill(testResponse);
		await page.getByRole("button", { name: "Submit Response" }).click();

		// Wait for evaluation to complete
		await expect(page.getByText("Evaluation Results")).toBeVisible({
			timeout: 10000,
		});

		// Click on the score to see breakdown
		await page.getByText(/\d+%/).first().click();

		// Check that popover with breakdown appears
		await expect(page.getByText("Score Breakdown")).toBeVisible();
		await expect(page.getByText("Clarity")).toBeVisible();
		await expect(page.getByText("Content")).toBeVisible();
		await expect(page.getByText("Structure")).toBeVisible();
		await expect(page.getByText("Delivery")).toBeVisible();
	});

	test("should show tips for the question", async ({ page }) => {
		// Check that tips are displayed
		await expect(page.getByText("Tips:")).toBeVisible();
		await expect(page.getByText("Consider scope differences")).toBeVisible();
		await expect(page.getByText("Think about hoisting behavior")).toBeVisible();
	});

	test("should show question metadata", async ({ page }) => {
		// Check difficulty badge
		await expect(page.getByText("Beginner")).toBeVisible();

		// Check duration
		await expect(page.getByText("5 minutes")).toBeVisible();

		// Check category
		await expect(page.getByText("Technical")).toBeVisible();
	});

	test("should handle audio recording interface", async ({ page }) => {
		// Switch to audio tab
		await page.getByRole("tab", { name: "Audio Response" }).click();

		// Check that recording interface is displayed
		await expect(page.getByText("Record Your Response")).toBeVisible();
		await expect(
			page.getByText("Click the microphone to start recording"),
		).toBeVisible();

		// Check that microphone button is present
		const micButton = page.getByRole("button", {
			name: /Start recording|Stop recording/,
		});
		await expect(micButton).toBeVisible();
	});

	test("should navigate back to drills list", async ({ page }) => {
		// Click back button
		await page.getByRole("button", { name: /Back to Drills/ }).click();

		// Should navigate to drills list
		await expect(page).toHaveURL("/drill");
		await expect(page.getByText("Interview Drills")).toBeVisible();
	});

	test("should handle evaluation errors gracefully", async ({ page }) => {
		// Mock a failed evaluation by intercepting the API call
		await page.route("/api/evaluate", async (route) => {
			await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ error: "Internal server error" }),
			});
		});

		const testResponse = "This is a test response that should fail";

		await page
			.getByPlaceholder(/type your interview response/i)
			.fill(testResponse);
		await page.getByRole("button", { name: "Submit Response" }).click();

		// Should show error message
		await expect(page.getByText("Error:")).toBeVisible();
		await expect(page.getByText("Internal server error")).toBeVisible();
	});
});
