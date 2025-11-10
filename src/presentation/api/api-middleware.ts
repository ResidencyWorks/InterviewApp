import { type NextRequest, NextResponse } from "next/server";
import { getServerAuthService } from "@/features/auth/application/services/server-auth-service";
import {
	createErrorResponse,
	createRateLimitResponse,
	createUnauthorizedResponse,
} from "./api-helpers";
import type { ApiMiddleware, AuthConfig, RateLimitConfig } from "./api-types";

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Authentication middleware
 * @param config - Authentication configuration
 * @returns Middleware function
 */
export function createAuthMiddleware(config: AuthConfig): ApiMiddleware {
	return async (request: NextRequest, next: () => Promise<NextResponse>) => {
		if (!config.required) {
			return next();
		}

		try {
			const user = await (await getServerAuthService()).getUser();

			if (!user) {
				return createUnauthorizedResponse("Authentication required");
			}

			// Check roles if specified
			if (config.roles && config.roles.length > 0) {
				const userRole = user.user_metadata?.role || "user";
				if (!config.roles.includes(userRole)) {
					return createUnauthorizedResponse("Insufficient permissions");
				}
			}
			// Add user to request context
			(request as any).user = user;

			return next();
		} catch (error) {
			console.error("Auth middleware error:", error);
			return createUnauthorizedResponse("Authentication failed");
		}
	};
}

/**
 * Rate limiting middleware
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function createRateLimitMiddleware(
	config: RateLimitConfig,
): ApiMiddleware {
	return async (request: NextRequest, next: () => Promise<NextResponse>) => {
		const key = config.keyGenerator
			? config.keyGenerator(request)
			: getDefaultRateLimitKey(request);
		const now = Date.now();

		// Clean up expired entries
		for (const [k, v] of Array.from(rateLimitStore.entries())) {
			if (v.resetTime < now) {
				rateLimitStore.delete(k);
			}
		}

		const current = rateLimitStore.get(key);

		if (!current) {
			rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
			return next();
		}

		if (current.resetTime < now) {
			rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
			return next();
		}

		if (current.count >= config.maxRequests) {
			const retryAfter = Math.ceil((current.resetTime - now) / 1000);
			return createRateLimitResponse(retryAfter);
		}

		current.count++;
		return next();
	};
}

/**
 * CORS middleware
 * @param allowedOrigins - Allowed origins
 * @returns Middleware function
 */
export function createCORSMiddleware(
	allowedOrigins: string[] = ["*"],
): ApiMiddleware {
	return async (request: NextRequest, next: () => Promise<NextResponse>) => {
		const origin = request.headers.get("origin");
		const isAllowed =
			allowedOrigins.includes("*") ||
			(origin && allowedOrigins.includes(origin));

		if (request.method === "OPTIONS") {
			return new NextResponse(null, {
				headers: {
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
					"Access-Control-Allow-Origin": isAllowed ? origin || "*" : "null",
					"Access-Control-Max-Age": "86400",
				},
				status: 200,
			});
		}

		const response = await next();

		if (isAllowed) {
			response.headers.set("Access-Control-Allow-Origin", origin || "*");
			response.headers.set("Access-Control-Allow-Credentials", "true");
		}

		return response;
	};
}

/**
 * Request logging middleware
 * @returns Middleware function
 */
export function createLoggingMiddleware(): ApiMiddleware {
	return async (request: NextRequest, next: () => Promise<NextResponse>) => {
		const startTime = Date.now();
		const method = request.method;
		const url = request.url;

		console.log(`[${new Date().toISOString()}] ${method} ${url} - Started`);

		try {
			const response = await next();
			const duration = Date.now() - startTime;

			console.log(
				`[${new Date().toISOString()}] ${method} ${url} - ${response.status} - ${duration}ms`,
			);

			return response;
		} catch (error) {
			const duration = Date.now() - startTime;
			console.error(
				`[${new Date().toISOString()}] ${method} ${url} - Error - ${duration}ms`,
				error,
			);
			throw error;
		}
	};
}

/**
 * Error handling middleware
 * @returns Middleware function
 */
export function createErrorHandlingMiddleware(): ApiMiddleware {
	return async (_request: NextRequest, next: () => Promise<NextResponse>) => {
		try {
			return await next();
		} catch (error) {
			console.error("API Error:", error);

			if (error instanceof Error) {
				return createErrorResponse(
					error.message,
					"INTERNAL_SERVER_ERROR",
					500,
					{
						stack:
							process.env.NODE_ENV === "development" ? error.stack : undefined,
					},
				);
			}

			return createErrorResponse(
				"An unexpected error occurred",
				"INTERNAL_SERVER_ERROR",
				500,
			);
		}
	};
}

/**
 * Request validation middleware
 * @param validator - Validation function
 * @returns Middleware function
 */
export function createValidationMiddleware<T>(
	validator: (data: unknown) => { success: boolean; data?: T; error?: string },
): ApiMiddleware {
	return async (request: NextRequest, next: () => Promise<NextResponse>) => {
		if (request.method === "GET") {
			return next();
		}

		try {
			const body = await request.json();
			const validation = validator(body);

			if (!validation.success) {
				return createErrorResponse(
					validation.error || "Validation failed",
					"VALIDATION_ERROR",
					422,
				);
			}
			// Add validated data to request context
			(request as any).validatedData = validation.data;

			return next();
		} catch {
			return createErrorResponse(
				"Invalid JSON in request body",
				"INVALID_JSON",
				400,
			);
		}
	};
}

/**
 * Security headers middleware
 * @returns Middleware function
 */
export function createSecurityMiddleware(): ApiMiddleware {
	return async (_request: NextRequest, next: () => Promise<NextResponse>) => {
		const response = await next();

		// Add security headers
		response.headers.set("X-Content-Type-Options", "nosniff");
		response.headers.set("X-Frame-Options", "DENY");
		response.headers.set("X-XSS-Protection", "1; mode=block");
		response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		response.headers.set(
			"Permissions-Policy",
			"camera=(), microphone=(), geolocation=()",
		);

		return response;
	};
}

/**
 * Performance monitoring middleware
 * @returns Middleware function
 */
export function createPerformanceMiddleware(): ApiMiddleware {
	return async (request: NextRequest, next: () => Promise<NextResponse>) => {
		const startTime = Date.now();
		const startMemory = process.memoryUsage();

		const response = await next();

		const duration = Date.now() - startTime;
		const endMemory = process.memoryUsage();
		const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

		// Add performance headers
		response.headers.set("X-Response-Time", `${duration}ms`);
		response.headers.set("X-Memory-Usage", `${memoryDelta}bytes`);

		// Log performance metrics
		if (duration > 1000) {
			// Log slow requests
			console.warn(
				`Slow request: ${request.method} ${request.url} - ${duration}ms`,
			);
		}

		return response;
	};
}

/**
 * Get default rate limit key
 * @param request - NextRequest object
 * @returns Rate limit key
 */
function getDefaultRateLimitKey(request: NextRequest): string {
	const ip =
		request.headers.get("x-forwarded-for") ||
		request.headers.get("x-real-ip") ||
		"unknown";
	const userAgent = request.headers.get("user-agent") || "unknown";
	return `${ip}-${userAgent}`;
}

/**
 * Compose multiple middleware functions
 * @param middlewares - Array of middleware functions
 * @returns Composed middleware function
 */
export function composeMiddleware(middlewares: ApiMiddleware[]): ApiMiddleware {
	return middlewares.reduceRight(
		(_next, middleware) =>
			(request: NextRequest, nextFn: () => Promise<NextResponse>) =>
				middleware(request, nextFn),
		async (_request: NextRequest, _next: () => Promise<NextResponse>) =>
			new NextResponse(),
	);
}
