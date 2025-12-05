import type { AuthUser, Session } from "@supabase/supabase-js";

/**
 * Authentication state interface
 */
export interface AuthState {
	user: AuthUser | null;
	session: Session | null;
	loading: boolean;
}

/**
 * Authentication error interface
 */
export interface AuthError {
	message: string;
	status?: number;
	code?: string;
}

/**
 * Magic link request parameters
 */
export interface MagicLinkRequest {
	email: string;
	options?: {
		emailRedirectTo?: string;
		data?: Record<string, unknown>;
	};
}

/**
 * User profile interface
 */
export interface UserProfile {
	id: string;
	email: string;
	full_name?: string;
	avatar_url?: string;
	entitlement_level: "FREE" | "TRIAL" | "PRO";
	stripe_customer_id?: string;
	created_at: string;
	updated_at: string;
}

/**
 * Authentication context interface
 */
export interface AuthContextType {
	user: AuthUser | null;
	session: Session | null;
	loading: boolean;
	signIn: (email: string) => Promise<void>;
	signOut: () => Promise<void>;
	refreshSession: () => Promise<void>;
}

/**
 * Protected route configuration
 */
export interface ProtectedRouteConfig {
	redirectTo?: string;
	requireAuth?: boolean;
	allowedRoles?: string[];
}

/**
 * Authentication proxy options
 */
export interface AuthProxyOptions {
	protectedPaths: string[];
	publicPaths: string[];
	redirectTo: string;
}
