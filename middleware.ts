import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isProtectedPath, isPublicPath } from "@/lib/auth/auth-helpers";
import { defaultContentPackLoader } from "@/lib/infrastructure/default/DefaultContentPack";
import { createClient } from "@/lib/supabase/middleware";

/**
 * Protected routes configuration
 */
const PROTECTED_ROUTES = [
	"/dashboard",
	"/drill",
	"/profile",
	"/settings",
	"/admin",
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
];

/**
 * Authentication and content pack loading middleware
 */
export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	console.log("Middleware - Processing request for:", pathname);

	// Skip middleware for static files and API routes that don't need auth
	if (
		pathname.startsWith("/_next") ||
		pathname.startsWith("/static") ||
		pathname.startsWith("/favicon") ||
		pathname.startsWith("/api/health")
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

	// Check if route is public
	console.log(
		"Middleware - Checking if public route:",
		pathname,
		"Public routes:",
		PUBLIC_ROUTES,
	);
	const isPublic = isPublicPath(pathname, PUBLIC_ROUTES);
	console.log("Middleware - Is public route:", isPublic);

	if (isPublic) {
		console.log("Middleware - Allowing public route:", pathname);
		return NextResponse.next();
	}

	// Check if route is protected
	if (isProtectedPath(pathname, PROTECTED_ROUTES)) {
		try {
			const response = NextResponse.next();
			const supabase = createClient(request, response);

			console.log(
				"Middleware - Checking authentication for protected route:",
				pathname,
			);

			// Debug: Check what cookies are available
			const cookies = request.cookies.getAll();
			const supabaseCookies = cookies.filter((cookie) =>
				cookie.name.startsWith("sb-"),
			);
			console.log(
				"Middleware - Supabase cookies:",
				supabaseCookies.map((c) => ({ name: c.name, hasValue: !!c.value })),
			);

			// Get the session first to ensure we have a valid session
			const {
				data: { session },
				error: sessionError,
			} = await supabase.auth.getSession();

			console.log("Middleware - Session check:", {
				session: session ? "present" : "missing",
				error: sessionError ? sessionError.message : null,
			});

			// If no session, try to get user directly
			if (sessionError || !session) {
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				console.log("Middleware - User check (no session):", {
					user: user ? { id: user.id, email: user.email } : null,
					error: userError ? userError.message : null,
				});

				if (userError || !user) {
					console.log(
						"Middleware - No valid session or user, redirecting to login",
					);
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

			console.log("Middleware - Final user check:", {
				user: user ? { id: user.id, email: user.email } : null,
				error: userError ? userError.message : null,
			});

			if (userError || !user) {
				console.log("Middleware - Failed to get user, redirecting to login");
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
				console.error(
					"Failed to get content pack status in middleware:",
					error,
				);
				response.headers.set("x-content-pack-status", "error");
				response.headers.set("x-fallback-active", "true");
			}

			return response;
		} catch (error) {
			console.error("Auth middleware error:", error);

			// Redirect to login page on error
			const loginUrl = new URL("/login", request.url);
			loginUrl.searchParams.set("redirectTo", pathname);
			return NextResponse.redirect(loginUrl);
		}
	}

	return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 */
		"/((?!_next/static|_next/image|favicon.ico|public/).*)",
	],
};
