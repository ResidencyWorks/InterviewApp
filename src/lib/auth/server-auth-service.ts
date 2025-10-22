import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { AuthUser } from "@/types/auth";

/**
 * Authentication service for server-side operations
 */
export class ServerAuthService {
	private supabase: SupabaseClient | null = null;

	async initialize() {
		this.supabase = await createServerClient();
	}

	/**
	 * Get current session (server-side)
	 * @returns Promise resolving to session or null
	 */
	async getSession(): Promise<Session | null> {
		try {
			if (!this.supabase) {
				throw new Error("Supabase client not initialized");
			}
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
	async getUser(): Promise<AuthUser | null> {
		try {
			if (!this.supabase) {
				throw new Error("Supabase client not initialized");
			}
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
	async verifyToken(token: string): Promise<AuthUser | null> {
		try {
			if (!this.supabase) {
				throw new Error("Supabase client not initialized");
			}
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

// Lazy-loaded server auth service to avoid cookies() being called during build
let _serverAuthService: ServerAuthService | null = null;

export async function getServerAuthService(): Promise<ServerAuthService> {
	if (!_serverAuthService) {
		_serverAuthService = new ServerAuthService();
		await _serverAuthService.initialize();
	}
	return _serverAuthService;
}
