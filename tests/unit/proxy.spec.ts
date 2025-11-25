import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "../../proxy";

// Mock environment variables
vi.mock("../../src/config", () => ({
	evaluationConfig: {
		rateLimitRpm: 60,
	},
}));

// Mock Redis for rate limiting
const mockRedis = {
	incr: vi.fn(),
	expire: vi.fn(),
};

vi.mock("../../src/infrastructure/config/clients", () => ({
	getRedisClient: () => mockRedis,
}));

// Mock other dependencies of proxy
vi.mock("@/features/auth/application/auth-helpers", () => ({
	isProtectedPath: vi.fn().mockReturnValue(false),
	isPublicPath: vi.fn().mockReturnValue(true), // Assume public for these tests unless specified
}));

vi.mock("@/features/booking/infrastructure/default/DefaultContentPack", () => ({
	defaultContentPackLoader: {
		loadDefaultContentPack: vi.fn(),
		getSystemStatus: vi
			.fn()
			.mockReturnValue({ isSystemReady: true, hasDefaultContentPack: true }),
	},
}));

vi.mock("./src/infrastructure/supabase/proxy", () => ({
	createClient: vi.fn(),
}));

describe("Proxy Middleware", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 401 if no authorization header for /api/evaluate", async () => {
		const req = new NextRequest("http://localhost/api/evaluate/status/123");
		const res = await proxy(req);
		expect(res.status).toBe(401);
	});

	it("returns 401 if invalid authorization header format", async () => {
		const req = new NextRequest("http://localhost/api/evaluate/status/123", {
			headers: { Authorization: "InvalidToken" },
		});
		const res = await proxy(req);
		expect(res.status).toBe(401);
	});

	it("allows request if valid Bearer token", async () => {
		const req = new NextRequest("http://localhost/api/evaluate/status/123", {
			headers: { Authorization: "Bearer valid-token" },
		});
		mockRedis.incr.mockResolvedValue(1);

		const res = await proxy(req);
		// Should return next() which has status 200 and x-middleware-next header
		expect(res.status).toBe(200);
		expect(res.headers.get("x-middleware-next")).toBe("1");
	});

	it("allows request if valid x-api-key", async () => {
		const req = new NextRequest("http://localhost/api/evaluate/status/123", {
			headers: { "x-api-key": "valid-key" },
		});
		mockRedis.incr.mockResolvedValue(1);

		const res = await proxy(req);
		expect(res.status).toBe(200);
		expect(res.headers.get("x-middleware-next")).toBe("1");
	});

	it("returns 429 if rate limit exceeded", async () => {
		const req = new NextRequest("http://localhost/api/evaluate/status/123", {
			headers: { Authorization: "Bearer valid-token" },
		});
		mockRedis.incr.mockResolvedValue(61); // > 60

		const res = await proxy(req);
		expect(res.status).toBe(429);
	});

	it("skips auth for webhook route", async () => {
		const req = new NextRequest("http://localhost/api/evaluate/webhook");
		// Webhook is excluded from the special check, so it falls through.
		// It matches "api/evaluate" prefix but has "webhook".
		// Then it hits the skip block?
		// Wait, I removed "api/evaluate" from the skip block.
		// So it falls through to `isPublicPath`.
		// `isPublicPath` returns true (mocked).
		// So it returns next().

		const res = await proxy(req);
		expect(res.status).toBe(200);
		expect(res.headers.get("x-middleware-next")).toBe("1");
	});
});
