import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { evaluationConfig } from "@/config";
import {
	isProtectedPath,
	isPublicPath,
} from "@/features/auth/application/auth-helpers";
import { defaultContentPackLoader } from "@/features/booking/infrastructure/default/DefaultContentPack";
import { getRedisClient } from "@/infrastructure/config/clients";
import { createClient } from "./src/infrastructure/supabase/proxy";

/**
 * Protected routes configuration
 */
const PROTECTED_ROUTES = [
	"/dashboard",
	"/drill",
	"/profile",
	"/settings",
	"/admin",
	"/complete-profile",
];

/**
 * Public routes configuration
 */
const PUBLIC_ROUTES = [
	"/",
	"/auth",
	"/login",
	"/signup",
	"/callback",
	"/auth/callback",
	"/api/auth",
	"/api/health",
	"/api/evaluate",
	"/ingest", // PostHog analytics endpoints
];

/**
 * Authentication and content pack loading proxy
 */
export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	console.log("Proxy - Processing request for:", pathname);

	// Special handling for /api/evaluate routes (excluding webhook)
	// This replaces the previous per-route middleware
	if (pathname.startsWith("/api/evaluate") && !pathname.includes("/webhook")) {
		// 1. Auth Check
		const authHeader = request.headers.get("Authorization");
		const apiKeyHeader = request.headers.get("x-api-key");
		let clientId = "";

		if (authHeader?.startsWith("Bearer ")) {
			clientId = authHeader.split(" ")[1];
		} else if (apiKeyHeader) {
			clientId = apiKeyHeader;
		}

		if (!clientId) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "Missing or invalid credentials" },
				{ status: 401 },
			);
		}

		// 2. Rate Limit Check
		const redis = getRedisClient();
		if (redis) {
			try {
				const key = `rate_limit:${clientId}`;
				const current = await redis.incr(key);

				if (current === 1) {
					await redis.expire(key, 60); // 1 minute window
				}

				if (current > evaluationConfig.rateLimitRpm) {
					return NextResponse.json(
						{ error: "Too Many Requests", message: "Rate limit exceeded" },
						{
							status: 429,
							headers: { "Retry-After": "60" },
						},
					);
				}
			} catch (error) {
				console.error("Rate limit check failed:", error);
			}
		}
	}

	// Skip proxy for static files, analytics, and API routes that don't need auth
	if (
		pathname.startsWith("/_next") ||
		pathname.startsWith("/static") ||
		pathname.startsWith("/favicon") ||
		pathname.startsWith("/api/health") ||
		pathname.startsWith("/ingest") // PostHog analytics endpoints
	) {
		return NextResponse.next();
	}

	// Initialize content pack loader for all routes
	try {
		// Ensure default content pack is loaded
		defaultContentPackLoader.loadDefaultContentPack();
	} catch (error) {
		console.error("Failed to initialize content pack loader:", error);
	}

	const isPublic = isPublicPath(pathname, PUBLIC_ROUTES);
	console.log("Proxy - Is public route:", isPublic);

	if (isPublic) {
		console.log("Proxy - Allowing public route:", pathname);
		return NextResponse.next();
	}

	// Check if route is protected
	if (isProtectedPath(pathname, PROTECTED_ROUTES)) {
		try {
			const response = NextResponse.next();
			const supabase = createClient(request, response);

			console.log(
				"Proxy - Checking authentication for protected route:",
				pathname,
			);

			// Debug: Check what cookies are available
			const cookies = request.cookies.getAll();
			const supabaseCookies = cookies.filter((cookie) =>
				cookie.name.startsWith("sb-"),
			);
			console.log(
				"Proxy - Supabase cookies:",
				supabaseCookies.map((c) => ({ name: c.name, hasValue: !!c.value })),
			);

			// Get the session first to ensure we have a valid session
			const {
				data: { session },
				error: sessionError,
			} = await supabase.auth.getSession();

			console.log("Proxy - Session check:", {
				session: session ? "present" : "missing",
				error: sessionError ? sessionError.message : null,
			});

			// If no session, try to get user directly
			if (sessionError || !session) {
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				console.log("Proxy - User check (no session):", {
					user: user ? { id: user.id, email: user.email } : null,
					error: userError ? userError.message : null,
				});

				if (userError || !user) {
					console.log("Proxy - No valid session or user, redirecting to login");
					// Redirect to login page
					const loginUrl = new URL("/login", request.url);
					loginUrl.searchParams.set("redirectTo", pathname);
					return NextResponse.redirect(loginUrl);
				}
			}

			// Get user for role checking
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			console.log("Proxy - Final user check:", {
				user: user ? { id: user.id, email: user.email } : null,
				error: userError ? userError.message : null,
			});

			if (userError || !user) {
				console.log("Proxy - Failed to get user, redirecting to login");
				const loginUrl = new URL("/login", request.url);
				loginUrl.searchParams.set("redirectTo", pathname);
				return NextResponse.redirect(loginUrl);
			}

			// Check admin routes specifically
			if (pathname.startsWith("/admin")) {
				const userRole = user.user_metadata?.role || "user";
				if (userRole !== "admin") {
					// Redirect non-admin users to dashboard with error message
					const dashboardUrl = new URL("/dashboard", request.url);
					dashboardUrl.searchParams.set("error", "insufficient_permissions");
					return NextResponse.redirect(dashboardUrl);
				}
			}

			// Check profile completion for authenticated users
			const fullName = user.user_metadata?.full_name;
			const hasFullName = !!fullName?.trim();
			const isProfileComplete = hasFullName;

			console.log("Proxy - Profile completion check:", {
				userId: user.id,
				userEmail: user.email,
				fullName,
				hasFullName,
				isProfileComplete,
				currentPath: pathname,
				userMetadata: user.user_metadata,
			});

			// If profile is incomplete and user is trying to access dashboard or other protected routes
			if (!isProfileComplete && pathname !== "/complete-profile") {
				console.log(
					"Proxy - Profile incomplete, redirecting to complete-profile",
				);
				const completeProfileUrl = new URL("/complete-profile", request.url);
				return NextResponse.redirect(completeProfileUrl);
			}

			// If profile is complete and user is on complete-profile page, redirect to dashboard
			if (isProfileComplete && pathname === "/complete-profile") {
				console.log("Proxy - Profile complete, redirecting to dashboard");
				const dashboardUrl = new URL("/dashboard", request.url);
				return NextResponse.redirect(dashboardUrl);
			}

			// Add user info to headers for API routes
			response.headers.set("x-user-id", user.id);
			response.headers.set("x-user-email", user.email || "");
			response.headers.set("x-user-role", user.user_metadata?.role || "user");

			// Add content pack status to headers
			try {
				const systemStatus = defaultContentPackLoader.getSystemStatus();
				response.headers.set(
					"x-content-pack-status",
					systemStatus.isSystemReady ? "ready" : "fallback",
				);
				response.headers.set(
					"x-fallback-active",
					systemStatus.hasDefaultContentPack ? "true" : "false",
				);
			} catch (error) {
				console.error("Failed to get content pack status in proxy:", error);
				response.headers.set("x-content-pack-status", "error");
				response.headers.set("x-fallback-active", "true");
			}

			return response;
		} catch (error) {
			console.error("Auth proxy error:", error);

			// Redirect to login page on error
			const loginUrl = new URL("/login", request.url);
			loginUrl.searchParams.set("redirectTo", pathname);
			return NextResponse.redirect(loginUrl);
		}
	}

	return NextResponse.next();
}

/**
 * Configure which routes the proxy should run on
 */
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 * - ingest (analytics endpoints)
		 * - api/evaluate (audio upload with FormData) - handled in proxy now
		 */
		"/((?!_next/static|_next/image|favicon.ico|public/|ingest/).*)",
	],
};
