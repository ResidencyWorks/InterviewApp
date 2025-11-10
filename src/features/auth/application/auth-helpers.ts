import type { AuthUser, Session } from "@supabase/supabase-js";
import type { AuthError, UserProfile } from "./auth-types";

/**
 * Check if user is authenticated
 * @param user - Supabase user object
 * @returns True if user is authenticated
 */
export function isAuthenticated(user: AuthUser | null): boolean {
	return user !== null && user.aud === "authenticated";
}

/**
 * Check if user has specific entitlement level
 * @param user - Supabase user object
 * @param requiredLevel - Required entitlement level
 * @returns True if user has required level or higher
 */
export function hasEntitlement(
	user: AuthUser | null,
	requiredLevel: "FREE" | "TRIAL" | "PRO",
): boolean {
	if (!isAuthenticated(user)) return false;

	const userMetadata = user?.user_metadata as UserProfile | undefined;
	const userLevel = userMetadata?.entitlement_level || "FREE";

	const levelHierarchy = { FREE: 0, PRO: 2, TRIAL: 1 };
	return levelHierarchy[userLevel] >= levelHierarchy[requiredLevel];
}

/**
 * Check if session is valid and not expired
 * @param session - Supabase session object
 * @returns True if session is valid
 */
export function isSessionValid(session: Session | null): boolean {
	if (!session) return false;

	const now = Math.floor(Date.now() / 1000);
	return session.expires_at ? session.expires_at > now : false;
}

/**
 * Extract user profile from Supabase user
 * @param user - Supabase user object
 * @returns User profile or null
 */
export function extractUserProfile(user: AuthUser | null): UserProfile | null {
	if (!isAuthenticated(user)) return null;

	return {
		avatar_url: user?.user_metadata?.avatar_url || "",
		created_at: user?.created_at || "",
		email: user?.email || "",
		entitlement_level: user?.user_metadata?.entitlement_level || "FREE",
		full_name: user?.user_metadata?.full_name || "",
		id: user?.id || "",
		stripe_customer_id: user?.user_metadata?.stripe_customer_id || "",
		updated_at: user?.updated_at || "",
	};
}

/**
 * Create authentication error object
 * @param message - Error message
 * @param status - HTTP status code
 * @param code - Error code
 * @returns AuthError object
 */
export function createAuthError(
	message: string,
	status?: number,
	code?: string,
): AuthError {
	return { code, message, status };
}

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns True if email is valid
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Get redirect URL for authentication
 * @param pathname - Current pathname
 * @returns Redirect URL
 */
export function getAuthRedirectUrl(pathname: string): string {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	return `${baseUrl}${pathname}`;
}

/**
 * Check if path requires authentication
 * @param pathname - Path to check
 * @param protectedPaths - Array of protected paths
 * @returns True if path requires authentication
 */
export function isProtectedPath(
	pathname: string,
	protectedPaths: string[],
): boolean {
	return protectedPaths.some((path) => {
		if (path.endsWith("*")) {
			return pathname.startsWith(path.slice(0, -1));
		}
		return pathname === path;
	});
}

/**
 * Check if path is public (doesn't require authentication)
 * @param pathname - Path to check
 * @param publicPaths - Array of public paths
 * @returns True if path is public
 */
export function isPublicPath(pathname: string, publicPaths: string[]): boolean {
	return publicPaths.some((path) => {
		if (path.endsWith("*")) {
			return pathname.startsWith(path.slice(0, -1));
		}
		return pathname === path;
	});
}

/**
 * Generate user display name
 * @param user - Supabase user object
 * @returns Display name or email
 */
export function getUserDisplayName(user: AuthUser | null): string {
	if (!user) return "Anonymous";

	const profile = extractUserProfile(user);
	return profile?.full_name || user.email || "User";
}

/**
 * Check if user needs to complete profile setup
 * @param user - Supabase user object
 * @returns True if profile setup is needed
 */
export function needsProfileSetup(user: AuthUser | null): boolean {
	if (!isAuthenticated(user)) return false;

	const profile = extractUserProfile(user);
	return !profile?.full_name || !profile?.avatar_url;
}
