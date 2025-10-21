import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAuthError, isValidEmail } from "./auth-helpers";
import type { MagicLinkRequest, UserProfile } from "./auth-types";

/**
 * Authentication service for client-side operations
 */
export class AuthService {
	private supabase = createClient();

	/**
	 * Sign in with magic link
	 * @param request - Magic link request parameters
	 * @returns Promise resolving to void or throwing AuthError
	 */
	async signInWithMagicLink(request: MagicLinkRequest): Promise<void> {
		try {
			if (!isValidEmail(request.email)) {
				throw createAuthError("Invalid email format", 400, "INVALID_EMAIL");
			}

			const { error } = await this.supabase.auth.signInWithOtp({
				email: request.email,
				options: {
					data: request.options?.data,
					emailRedirectTo:
						request.options?.emailRedirectTo ||
						`${window.location.origin}/auth/callback`,
				},
			});

			if (error) {
				throw createAuthError(error.message, 400, error.message);
			}
		} catch (error) {
			if (error instanceof Error && "message" in error) {
				throw createAuthError(error.message, 500, "SIGNIN_ERROR");
			}
			throw createAuthError("Sign in failed", 500, "SIGNIN_ERROR");
		}
	}

	/**
	 * Sign out current user
	 * @returns Promise resolving to void or throwing AuthError
	 */
	async signOut(): Promise<void> {
		try {
			const { error } = await this.supabase.auth.signOut();
			if (error) {
				throw createAuthError(error.message, 400, error.message);
			}
		} catch (error) {
			if (error instanceof Error && "message" in error) {
				throw createAuthError(error.message, 500, "SIGNOUT_ERROR");
			}
			throw createAuthError("Sign out failed", 500, "SIGNOUT_ERROR");
		}
	}

	/**
	 * Get current session
	 * @returns Promise resolving to session or null
	 */
	async getSession(): Promise<Session | null> {
		try {
			const {
				data: { session },
				error,
			} = await this.supabase.auth.getSession();
			if (error) {
				console.error("Error getting session:", error);
				return null;
			}
			return session;
		} catch (error) {
			console.error("Error getting session:", error);
			return null;
		}
	}

	/**
	 * Get current user
	 * @returns Promise resolving to user or null
	 */
	async getUser(): Promise<User | null> {
		try {
			const {
				data: { user },
				error,
			} = await this.supabase.auth.getUser();
			if (error) {
				console.error("Error getting user:", error);
				return null;
			}
			return user;
		} catch (error) {
			console.error("Error getting user:", error);
			return null;
		}
	}

	/**
	 * Refresh current session
	 * @returns Promise resolving to session or null
	 */
	async refreshSession(): Promise<Session | null> {
		try {
			const {
				data: { session },
				error,
			} = await this.supabase.auth.refreshSession();
			if (error) {
				console.error("Error refreshing session:", error);
				return null;
			}
			return session;
		} catch (error) {
			console.error("Error refreshing session:", error);
			return null;
		}
	}

	/**
	 * Update user profile
	 * @param updates - User profile updates
	 * @returns Promise resolving to updated user or null
	 */
	async updateProfile(updates: Partial<UserProfile>): Promise<User | null> {
		try {
			const {
				data: { user },
				error,
			} = await this.supabase.auth.updateUser({
				data: updates,
			});

			if (error) {
				throw createAuthError(error.message, 400, error.message);
			}

			return user;
		} catch (error) {
			if (error instanceof Error && "message" in error) {
				throw createAuthError(error.message, 500, "UPDATE_PROFILE_ERROR");
			}
			throw createAuthError(
				"Profile update failed",
				500,
				"UPDATE_PROFILE_ERROR",
			);
		}
	}

	/**
	 * Listen to authentication state changes
	 * @param callback - Callback function for auth state changes
	 * @returns Unsubscribe function
	 */
	onAuthStateChange(
		callback: (event: string, session: Session | null) => void,
	) {
		return this.supabase.auth.onAuthStateChange(callback);
	}
}

/**
 * Authentication service for server-side operations
 */
export class ServerAuthService {
	private supabase: any = null;

	async initialize() {
		this.supabase = await createServerClient();
	}

	/**
	 * Get current session (server-side)
	 * @returns Promise resolving to session or null
	 */
	async getSession(): Promise<Session | null> {
		try {
			const {
				data: { session },
				error,
			} = await this.supabase.auth.getSession();
			if (error) {
				console.error("Error getting session:", error);
				return null;
			}
			return session;
		} catch (error) {
			console.error("Error getting session:", error);
			return null;
		}
	}

	/**
	 * Get current user (server-side)
	 * @returns Promise resolving to user or null
	 */
	async getUser(): Promise<User | null> {
		try {
			const {
				data: { user },
				error,
			} = await this.supabase.auth.getUser();
			if (error) {
				console.error("Error getting user:", error);
				return null;
			}
			return user;
		} catch (error) {
			console.error("Error getting user:", error);
			return null;
		}
	}

	/**
	 * Verify JWT token
	 * @param token - JWT token to verify
	 * @returns Promise resolving to user or null
	 */
	async verifyToken(token: string): Promise<User | null> {
		try {
			const {
				data: { user },
				error,
			} = await this.supabase.auth.getUser(token);
			if (error) {
				console.error("Error verifying token:", error);
				return null;
			}
			return user;
		} catch (error) {
			console.error("Error verifying token:", error);
			return null;
		}
	}
}

// Export singleton instances
export const authService = new AuthService();

// Lazy-loaded server auth service to avoid cookies() being called during build
let _serverAuthService: ServerAuthService | null = null;

export async function getServerAuthService(): Promise<ServerAuthService> {
	if (!_serverAuthService) {
		_serverAuthService = new ServerAuthService();
		await _serverAuthService.initialize();
	}
	return _serverAuthService;
}
