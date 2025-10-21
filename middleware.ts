import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isProtectedPath, isPublicPath } from "@/lib/auth/auth-helpers";
import { createClient } from "@/lib/supabase/server";

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
	"/api/auth",
	"/api/health",
];

/**
 * Authentication middleware for protected routes
 */
export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Skip middleware for static files and API routes that don't need auth
	if (
		pathname.startsWith("/_next") ||
		pathname.startsWith("/static") ||
		pathname.startsWith("/favicon") ||
		pathname.startsWith("/api/health")
	) {
		return NextResponse.next();
	}

	// Check if route is public
	if (isPublicPath(pathname, PUBLIC_ROUTES)) {
		return NextResponse.next();
	}

	// Check if route is protected
	if (isProtectedPath(pathname, PROTECTED_ROUTES)) {
		try {
			const supabase = await createClient();
			const {
				data: { session },
				error,
			} = await supabase.auth.getSession();

			if (error || !session) {
				// Redirect to login page
				const loginUrl = new URL("/auth/login", request.url);
				loginUrl.searchParams.set("redirectTo", pathname);
				return NextResponse.redirect(loginUrl);
			}

			// Check if session is expired
			const now = Math.floor(Date.now() / 1000);
			if (session.expires_at && session.expires_at < now) {
				// Try to refresh the session
				const {
					data: { session: refreshedSession },
					error: refreshError,
				} = await supabase.auth.refreshSession();

				if (refreshError || !refreshedSession) {
					// Redirect to login page
					const loginUrl = new URL("/auth/login", request.url);
					loginUrl.searchParams.set("redirectTo", pathname);
					return NextResponse.redirect(loginUrl);
				}
			}

			// Add user info to headers for API routes
			const response = NextResponse.next();
			response.headers.set("x-user-id", session.user.id);
			response.headers.set("x-user-email", session.user.email || "");

			return response;
		} catch (error) {
			console.error("Auth middleware error:", error);

			// Redirect to login page on error
			const loginUrl = new URL("/auth/login", request.url);
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
