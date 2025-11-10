/**
 * E2E Test: Full Upload Flow
 * Tests the complete user journey from recording to upload completion
 *
 * @file tests/e2e/upload-flow.spec.ts
 */

import { expect, test } from "@playwright/test";

type MockBlobEvent = { data: Blob };

test.describe("Audio Upload Flow E2E", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to a test page with the upload component
		await page.goto("/test-upload");
	});

	test("should complete full audio recording and upload flow", async ({
		page,
	}) => {
		// Mock getUserMedia for audio recording
		await page.addInitScript(() => {
			// Mock MediaRecorder
			class MockMediaRecorder {
				state = "inactive";
				ondataavailable: ((event: MockBlobEvent) => void) | null = null;
				onstop: (() => void) | null = null;

				start() {
					this.state = "recording";
					// Simulate data available event
					setTimeout(() => {
						if (this.ondataavailable) {
							this.ondataavailable({
								data: new Blob(["mock audio data"], { type: "audio/webm" }),
							});
						}
					}, 100);
				}

				stop() {
					this.state = "inactive";
					if (this.onstop) {
						this.onstop();
					}
				}
			}

			// Mock getUserMedia
			Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
				value: () =>
					Promise.resolve({
						getTracks: () => [
							{
								stop: () => {},
							},
						],
					}),
			});

			// Mock MediaRecorder constructor
			Object.defineProperty(window, "MediaRecorder", {
				value: MockMediaRecorder,
			});
		});

		// Mock API responses
		await page.route("**/api/upload", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					data: {
						recordingId: "test-recording-123",
						status: "completed",
						fileSize: 1024,
						duration: 30,
						uploadDuration: 1500,
						uploadAttempts: 1,
					},
				}),
			});
		});

		// Start recording
		await page.click('[data-testid="start-recording"]');
		await expect(
			page.locator('[data-testid="recording-status"]'),
		).toContainText("Recording...");

		// Wait for recording to progress
		await page.waitForTimeout(2000);

		// Stop recording
		await page.click('[data-testid="stop-recording"]');
		await expect(
			page.locator('[data-testid="recording-status"]'),
		).toContainText("Recording completed");

		// Upload the recording
		await page.click('[data-testid="upload-recording"]');

		// Verify upload progress
		await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
		await expect(page.locator('[data-testid="upload-status"]')).toContainText(
			"Uploading...",
		);

		// Wait for upload completion
		await expect(page.locator('[data-testid="upload-status"]')).toContainText(
			"Upload completed successfully",
			{ timeout: 10000 },
		);

		// Verify success message
		await expect(page.locator('[data-testid="success-message"]')).toContainText(
			"Recording uploaded successfully!",
		);
	});

	test("should handle upload failure with retry", async ({ page }) => {
		// Mock API failure
		let attemptCount = 0;
		await page.route("**/api/upload", async (route) => {
			attemptCount++;
			if (attemptCount < 3) {
				// Fail first two attempts
				await route.fulfill({
					status: 500,
					contentType: "application/json",
					body: JSON.stringify({
						success: false,
						error: {
							code: "INTERNAL_ERROR",
							message: "Upload failed",
						},
					}),
				});
			} else {
				// Succeed on third attempt
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						data: {
							recordingId: "test-recording-123",
							status: "completed",
						},
					}),
				});
			}
		});

		// Mock recording (simplified for this test)
		await page.addInitScript(() => {
			class MockMediaRecorder {
				state = "inactive";
				ondataavailable: ((event: MockBlobEvent) => void) | null = null;
				onstop: (() => void) | null = null;

				start() {
					this.state = "recording";
					setTimeout(() => {
						if (this.ondataavailable) {
							this.ondataavailable({
								data: new Blob(["mock audio data"], { type: "audio/webm" }),
							});
						}
					}, 100);
				}

				stop() {
					this.state = "inactive";
					if (this.onstop) {
						this.onstop();
					}
				}
			}

			Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
				value: () =>
					Promise.resolve({
						getTracks: () => [{ stop: () => {} }],
					}),
			});

			Object.defineProperty(window, "MediaRecorder", {
				value: MockMediaRecorder,
			});
		});

		// Record and upload
		await page.click('[data-testid="start-recording"]');
		await page.waitForTimeout(1000);
		await page.click('[data-testid="stop-recording"]');
		await page.click('[data-testid="upload-recording"]');

		// Verify retry attempts
		await expect(page.locator('[data-testid="retry-status"]')).toContainText(
			"Retrying upload",
			{ timeout: 10000 },
		);

		// Verify final success
		await expect(page.locator('[data-testid="upload-status"]')).toContainText(
			"Upload completed successfully",
			{ timeout: 15000 },
		);
	});

	test("should handle microphone permission denial", async ({ page }) => {
		// Mock permission denial
		await page.addInitScript(() => {
			Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
				value: () => Promise.reject(new Error("Permission denied")),
			});
		});

		// Try to start recording
		await page.click('[data-testid="start-recording"]');

		// Verify fallback UI appears
		await expect(
			page.locator('[data-testid="permission-error"]'),
		).toContainText("Failed to access microphone");

		// Verify text fallback is available
		await expect(page.locator('[data-testid="text-fallback"]')).toBeVisible();
	});

	test("should validate file size limits", async ({ page }) => {
		// Mock large file
		await page.addInitScript(() => {
			class MockMediaRecorder {
				state = "inactive";
				ondataavailable: ((event: MockBlobEvent) => void) | null = null;
				onstop: (() => void) | null = null;

				start() {
					this.state = "recording";
					setTimeout(() => {
						if (this.ondataavailable) {
							// Create large blob (> 10MB)
							const largeData = "x".repeat(11 * 1024 * 1024);
							this.ondataavailable({
								data: new Blob([largeData], { type: "audio/webm" }),
							});
						}
					}, 100);
				}

				stop() {
					this.state = "inactive";
					if (this.onstop) {
						this.onstop();
					}
				}
			}

			Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
				value: () =>
					Promise.resolve({
						getTracks: () => [{ stop: () => {} }],
					}),
			});

			Object.defineProperty(window, "MediaRecorder", {
				value: MockMediaRecorder,
			});
		});

		// Mock API to reject large files
		await page.route("**/api/upload", async (route) => {
			await route.fulfill({
				status: 400,
				contentType: "application/json",
				body: JSON.stringify({
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "File size exceeds 10MB limit",
					},
				}),
			});
		});

		// Record and upload
		await page.click('[data-testid="start-recording"]');
		await page.waitForTimeout(1000);
		await page.click('[data-testid="stop-recording"]');
		await page.click('[data-testid="upload-recording"]');

		// Verify error message
		await expect(page.locator('[data-testid="upload-error"]')).toContainText(
			"File size exceeds 10MB limit",
		);
	});

	test("should enforce 90-second recording limit", async ({ page }) => {
		// Mock MediaRecorder with auto-stop
		await page.addInitScript(() => {
			class MockMediaRecorder {
				state = "inactive";
				ondataavailable: ((event: MockBlobEvent) => void) | null = null;
				onstop: (() => void) | null = null;

				start() {
					this.state = "recording";
					// Auto-stop after 90 seconds
					setTimeout(() => {
						this.stop();
					}, 100); // Shortened for test
				}

				stop() {
					this.state = "inactive";
					if (this.onstop) {
						this.onstop();
					}
				}
			}

			Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
				value: () =>
					Promise.resolve({
						getTracks: () => [{ stop: () => {} }],
					}),
			});

			Object.defineProperty(window, "MediaRecorder", {
				value: MockMediaRecorder,
			});
		});

		// Start recording
		await page.click('[data-testid="start-recording"]');

		// Wait for auto-stop
		await expect(
			page.locator('[data-testid="recording-status"]'),
		).toContainText("Recording completed", { timeout: 5000 });

		// Verify duration is at limit
		await expect(
			page.locator('[data-testid="recording-duration"]'),
		).toContainText("90");
	});
});
