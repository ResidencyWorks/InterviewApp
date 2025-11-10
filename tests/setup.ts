import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

// Make React available globally for tests
global.React = React;

// Clean up after each test
afterEach(() => {
	cleanup();
});

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-key";
process.env.SUPABASE_URL ??= "https://service.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key";
process.env.SUPABASE_ANON_KEY ??= "anon-key";
process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3000";
process.env.UPSTASH_REDIS_REST_URL ??= "https://test-redis.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN ??= "test-token";
process.env.OPENAI_API_KEY ??= "test-openai-key";

// Mock Supabase client
vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => ({
		auth: {
			signInWithOtp: vi.fn().mockImplementation(({ email }) => {
				if (email === "invalid-email") {
					return Promise.resolve({
						data: null,
						error: { message: "Invalid email format", name: "AuthError" },
					});
				}
				return Promise.resolve({ data: {}, error: null });
			}),
			signOut: vi.fn().mockResolvedValue({ error: null }),
			getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
			refreshSession: vi
				.fn()
				.mockResolvedValue({ data: { session: null }, error: null }),
			updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
		},
	})),
}));

// Mock Supabase SSR client
vi.mock("@supabase/ssr", () => ({
	createBrowserClient: vi.fn(() => ({
		auth: {
			signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
			signOut: vi.fn().mockResolvedValue({ error: null }),
			getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
			refreshSession: vi
				.fn()
				.mockResolvedValue({ data: { session: null }, error: null }),
			updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
		},
	})),
	createServerClient: vi.fn(() => ({
		auth: {
			signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
			signOut: vi.fn().mockResolvedValue({ error: null }),
			getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
			refreshSession: vi
				.fn()
				.mockResolvedValue({ data: { session: null }, error: null }),
			updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
		},
	})),
}));

// Mock Redis client
const RedisMock = vi.fn().mockImplementation(function RedisMockImpl() {
	return {
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue("OK"),
		setex: vi.fn().mockResolvedValue("OK"),
		del: vi.fn().mockResolvedValue(1),
		mset: vi.fn().mockResolvedValue("OK"),
		mget: vi.fn().mockResolvedValue([]),
		pipeline: vi.fn().mockReturnValue({
			get: vi.fn(),
			set: vi.fn(),
			setex: vi.fn(),
			del: vi.fn(),
			exec: vi.fn().mockResolvedValue([]),
		}),
	};
});

vi.mock("@upstash/redis", () => ({
	Redis: RedisMock,
}));

// Mock Redis cache classes
vi.mock("../../src/infrastructure/redis/index", () => ({
	userEntitlementCache: {
		getEntitlement: vi.fn().mockImplementation(async (userId) => {
			// Import performance monitor to track metrics
			const { performanceMonitor } = await import(
				"@/features/scheduling/infrastructure/monitoring/performance"
			);
			const operationId = performanceMonitor.start("redis.lookup", { userId });
			const result = "PRO";
			performanceMonitor.end(operationId, true, { userId, result });
			return result;
		}),
		setEntitlement: vi.fn().mockResolvedValue(true),
		setMultipleEntitlements: vi.fn().mockResolvedValue(true),
		getMultipleEntitlements: vi.fn().mockResolvedValue([]),
		deleteEntitlement: vi.fn().mockResolvedValue(1),
	},
	contentPackCache: {
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue(true),
		invalidate: vi.fn().mockResolvedValue(true),
	},
}));

// Mock PostHog
vi.mock("posthog-js", () => ({
	default: {
		init: vi.fn(),
		capture: vi.fn(),
		identify: vi.fn(),
		reset: vi.fn(),
	},
}));

// Mock OpenAI
vi.mock("openai", () => ({
	default: vi.fn().mockImplementation(() => ({
		chat: {
			completions: {
				create: vi.fn().mockResolvedValue({
					choices: [
						{
							message: {
								content: "Test response",
							},
						},
					],
				}),
			},
		},
		audio: {
			transcriptions: {
				create: vi.fn().mockResolvedValue("Transcribed text"),
			},
		},
		models: {
			list: vi.fn().mockResolvedValue({ data: [] }),
		},
	})),
	OpenAI: vi.fn().mockImplementation(() => ({
		chat: {
			completions: {
				create: vi.fn().mockResolvedValue({
					choices: [
						{
							message: {
								content: "Test response",
							},
						},
					],
				}),
			},
		},
		audio: {
			transcriptions: {
				create: vi.fn().mockResolvedValue("Transcribed text"),
			},
		},
		models: {
			list: vi.fn().mockResolvedValue({ data: [] }),
		},
	})),
}));

// Mock content pack validation service
vi.mock(
	"@/features/booking/application/services/content-pack-validation",
	() => ({
		contentPackValidationService: {
			validateContentPack: vi.fn().mockImplementation(async (contentPack) => {
				// Import performance monitor to track metrics
				const { performanceMonitor } = await import(
					"@/features/scheduling/infrastructure/monitoring/performance"
				);
				const operationId = performanceMonitor.start("content.validation", {
					contentSize: JSON.stringify(contentPack).length,
				});

				// Check for script-like content
				const hasScript = JSON.stringify(contentPack).includes("<script>");
				if (hasScript) {
					const result = {
						valid: false,
						errors: ["Content contains script-like patterns"],
						warnings: [],
						performance: { targetMet: true },
						metadata: { questionCount: 50 },
					};
					performanceMonitor.end(operationId, true, result);
					return result;
				}

				// Check for excessive questions
				const questionCount = contentPack?.questions?.length || 50;
				const warnings = [];
				if (questionCount > 2000) {
					warnings.push(`Too many questions: ${questionCount}`);
				}

				const result = {
					valid: true,
					errors: [],
					warnings,
					performance: { targetMet: true },
					metadata: { questionCount },
				};
				performanceMonitor.end(operationId, true, result);
				return result;
			}),
			validateContentPackStructure: vi
				.fn()
				.mockResolvedValue({ valid: true, errors: [] }),
			validateContentPackData: vi
				.fn()
				.mockResolvedValue({ valid: true, errors: [] }),
			validateForHotSwap: vi.fn().mockResolvedValue({
				valid: true,
				errors: [],
				performance: { targetMet: true },
				metadata: { questionCount: 50 },
			}),
		},
	}),
);

// Mock window.location
Object.defineProperty(window, "location", {
	value: {
		href: "http://localhost:3000",
		origin: "http://localhost:3000",
	},
	writable: true,
});

// Mock window.open
Object.defineProperty(window, "open", {
	value: vi.fn(),
	writable: true,
});

// Mock localStorage
const localStorageMock = {
	clear: vi.fn(),
	getItem: vi.fn(),
	removeItem: vi.fn(),
	setItem: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

// Clean up after all tests
afterAll(() => {
	vi.clearAllMocks();
});
