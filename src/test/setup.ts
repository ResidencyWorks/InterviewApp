/**
 * Test setup file for Vitest
 * Configures test environment and global test utilities
 */

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

// Mock environment variables for tests
beforeAll(() => {
	// Set test environment variables
	Object.assign(process.env, {
		NEXT_PUBLIC_APP_URL: "http://localhost:3000",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
		NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
		NODE_ENV: "test",
		PLAYWRIGHT_BASE_URL: "http://localhost:3000",
		SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
	});
});

// Cleanup after each test
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// Global test cleanup
afterAll(() => {
	vi.restoreAllMocks();
});
