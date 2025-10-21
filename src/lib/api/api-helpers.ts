import { type NextRequest, NextResponse } from "next/server";
import type { ErrorResponse, SuccessResponse } from "@/types/common";
import type { ResponseBuilderOptions } from "./api-types";

/**
 * Create a success API response
 * @param data - Response data
 * @param message - Success message
 * @param options - Response options
 * @returns NextResponse with success data
 */
export function createSuccessResponse<T>(
	data: T,
	message?: string,
	options: ResponseBuilderOptions = {},
): NextResponse {
	const response: SuccessResponse<T> = {
		data,
		message,
		timestamp: new Date().toISOString(),
	};

	return NextResponse.json(response, {
		headers: {
			"Cache-Control": options.cache
				? `public, max-age=${options.cache.maxAge || 0}`
				: "no-cache",
			"Content-Type": "application/json",
			...options.headers,
		},
		status: options.status || 200,
	});
}

/**
 * Create an error API response
 * @param error - Error message
 * @param code - Error code
 * @param status - HTTP status code
 * @param details - Additional error details
 * @returns NextResponse with error data
 */
export function createErrorResponse(
	error: string,
	code?: string,
	status = 400,
	details?: Record<string, any>,
): NextResponse {
	const response: ErrorResponse = {
		code,
		details,
		error,
		timestamp: new Date().toISOString(),
	};

	return NextResponse.json(response, {
		headers: {
			"Content-Type": "application/json",
		},
		status,
	});
}

/**
 * Create a validation error response
 * @param errors - Validation errors
 * @returns NextResponse with validation errors
 */
export function createValidationErrorResponse(
	errors: Record<string, string>,
): NextResponse {
	return createErrorResponse("Validation failed", "VALIDATION_ERROR", 422, {
		validation_errors: errors,
	});
}

/**
 * Create a not found response
 * @param resource - Resource that was not found
 * @returns NextResponse with not found error
 */
export function createNotFoundResponse(resource = "Resource"): NextResponse {
	return createErrorResponse(`${resource} not found`, "NOT_FOUND", 404);
}

/**
 * Create an unauthorized response
 * @param message - Unauthorized message
 * @returns NextResponse with unauthorized error
 */
export function createUnauthorizedResponse(
	message = "Unauthorized",
): NextResponse {
	return createErrorResponse(message, "UNAUTHORIZED", 401);
}

/**
 * Create a forbidden response
 * @param message - Forbidden message
 * @returns NextResponse with forbidden error
 */
export function createForbiddenResponse(message = "Forbidden"): NextResponse {
	return createErrorResponse(message, "FORBIDDEN", 403);
}

/**
 * Create a rate limit response
 * @param retryAfter - Seconds to wait before retrying
 * @returns NextResponse with rate limit error
 */
export function createRateLimitResponse(retryAfter: number): NextResponse {
	return NextResponse.json(
		{
			code: "RATE_LIMIT_EXCEEDED",
			error: "Too many requests",
			retry_after: retryAfter,
			timestamp: new Date().toISOString(),
		},
		{
			headers: {
				"Content-Type": "application/json",
				"Retry-After": retryAfter.toString(),
			},
			status: 429,
		},
	);
}

/**
 * Create a server error response
 * @param message - Error message
 * @param details - Error details
 * @returns NextResponse with server error
 */
export function createServerErrorResponse(
	message = "Internal server error",
	details?: Record<string, any>,
): NextResponse {
	return createErrorResponse(message, "INTERNAL_SERVER_ERROR", 500, details);
}

/**
 * Extract request body as JSON
 * @param request - NextRequest object
 * @returns Promise resolving to parsed JSON or null
 */
export async function getRequestBody<T = any>(
	request: NextRequest,
): Promise<T | null> {
	try {
		if (request.method === "GET") {
			return null;
		}

		const contentType = request.headers.get("content-type");
		if (!contentType || !contentType.includes("application/json")) {
			return null;
		}

		return await request.json();
	} catch (error) {
		console.error("Error parsing request body:", error);
		return null;
	}
}

/**
 * Extract query parameters from request
 * @param request - NextRequest object
 * @returns Query parameters object
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
	const { searchParams } = new URL(request.url);
	const params: Record<string, string> = {};

	for (const [key, value] of Array.from(searchParams.entries())) {
		params[key] = value;
	}

	return params;
}

/**
 * Extract path parameters from request
 * @param request - NextRequest object
 * @param paramNames - Parameter names to extract
 * @returns Path parameters object
 */
export function getPathParams(
	request: NextRequest,
	paramNames: string[],
): Record<string, string> {
	const url = new URL(request.url);
	const pathSegments = url.pathname.split("/").filter(Boolean);
	const params: Record<string, string> = {};

	// This is a simplified implementation
	// In a real app, you'd use dynamic route parameters
	paramNames.forEach((name, index) => {
		if (pathSegments[index]) {
			params[name] = pathSegments[index];
		}
	});

	return params;
}

/**
 * Get client IP address from request
 * @param request - NextRequest object
 * @returns Client IP address
 */
export function getClientIP(request: NextRequest): string {
	const forwarded = request.headers.get("x-forwarded-for");
	const realIP = request.headers.get("x-real-ip");
	const remoteAddr = request.headers.get("x-remote-addr");

	if (forwarded) {
		return forwarded.split(",")[0].trim();
	}

	if (realIP) {
		return realIP;
	}

	if (remoteAddr) {
		return remoteAddr;
	}

	return "unknown";
}

/**
 * Get user agent from request
 * @param request - NextRequest object
 * @returns User agent string
 */
export function getUserAgent(request: NextRequest): string {
	return request.headers.get("user-agent") || "unknown";
}

/**
 * Check if request is from a bot
 * @param request - NextRequest object
 * @returns True if request is from a bot
 */
export function isBotRequest(request: NextRequest): boolean {
	const userAgent = getUserAgent(request).toLowerCase();
	const botPatterns = [
		"bot",
		"crawler",
		"spider",
		"scraper",
		"googlebot",
		"bingbot",
		"slurp",
		"duckduckbot",
		"baiduspider",
		"yandexbot",
		"facebookexternalhit",
		"twitterbot",
		"linkedinbot",
		"whatsapp",
		"telegram",
	];

	return botPatterns.some((pattern) => userAgent.includes(pattern));
}

/**
 * Validate request method
 * @param request - NextRequest object
 * @param allowedMethods - Array of allowed HTTP methods
 * @returns True if method is allowed
 */
export function validateMethod(
	request: NextRequest,
	allowedMethods: string[],
): boolean {
	return allowedMethods.includes(request.method);
}

/**
 * Create CORS headers
 * @param origin - Allowed origin
 * @returns CORS headers object
 */
export function createCORSHeaders(origin = "*"): Record<string, string> {
	return {
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Max-Age": "86400",
	};
}

/**
 * Handle CORS preflight request
 * @param request - NextRequest object
 * @returns NextResponse for OPTIONS request
 */
export function handleCORS(request: NextRequest): NextResponse | null {
	if (request.method === "OPTIONS") {
		return new NextResponse(null, {
			headers: createCORSHeaders(),
			status: 200,
		});
	}

	return null;
}

/**
 * Log API request
 * @param request - NextRequest object
 * @param response - NextResponse object
 * @param duration - Request duration in milliseconds
 */
export function logRequest(
	request: NextRequest,
	response: NextResponse,
	duration: number,
): void {
	const method = request.method;
	const url = request.url;
	const status = response.status;
	const ip = getClientIP(request);
	const userAgent = getUserAgent(request);

	console.log(
		`${method} ${url} ${status} ${duration}ms - ${ip} - ${userAgent}`,
	);
}
