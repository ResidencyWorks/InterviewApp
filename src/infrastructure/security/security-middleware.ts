import type { NextRequest, NextResponse } from "next/server";
import { getAppUrl } from "@/infrastructure/config/environment";

/**
 * Security proxy for enhanced protection
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function validateOrigin(request: NextRequest): boolean {
	const origin = request.headers.get("origin");
	const referer = request.headers.get("referer");
	const host = request.headers.get("host");

	// Allow same-origin requests
	if (origin === `https://${host}` || origin === `http://${host}`) {
		return true;
	}

	// Allow requests without origin (e.g., direct API calls)
	if (!origin && !referer) {
		return true;
	}

	// Block suspicious origins
	const appUrl = getAppUrl();
	const allowedOrigins = [
		appUrl,
		process.env.NEXT_PUBLIC_APP_URL,
		"http://localhost:3000",
		"https://localhost:3000",
	].filter(Boolean);

	return allowedOrigins.includes(origin || "");
}

export function detectSuspiciousActivity(request: NextRequest): boolean {
	const userAgent = request.headers.get("user-agent") || "";

	// Check for common attack patterns
	const suspiciousPatterns = [
		/\.\.\//, // Directory traversal
		/<script/i, // XSS attempts
		/union.*select/i, // SQL injection
		/javascript:/i, // JavaScript injection
		/on\w+\s*=/i, // Event handler injection
	];

	const fullUrl = request.url;
	const suspicious = suspiciousPatterns.some(
		(pattern) => pattern.test(fullUrl) || pattern.test(userAgent),
	);

	// Check for suspicious user agents
	const suspiciousUserAgents = [/bot/i, /crawler/i, /spider/i, /scraper/i];

	const suspiciousUA = suspiciousUserAgents.some((pattern) =>
		pattern.test(userAgent),
	);

	return suspicious || suspiciousUA;
}

export function applySecurityHeaders(response: NextResponse): NextResponse {
	// Content Security Policy
	response.headers.set(
		"Content-Security-Policy",
		"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://us.posthog.com https://*.supabase.co https://api.openai.com; frame-ancestors 'none';",
	);

	// Additional security headers
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-XSS-Protection", "1; mode=block");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
	);

	return response;
}

export function checkRateLimit(
	ip: string,
	limit = 100,
	windowMs = 60000,
): boolean {
	const now = Date.now();
	const record = rateLimitMap.get(ip);

	if (!record || now > record.resetTime) {
		rateLimitMap.set(ip, {
			count: 1,
			resetTime: now + windowMs,
		});
		return true;
	}

	if (record.count >= limit) {
		return false;
	}

	record.count += 1;
	return true;
}
