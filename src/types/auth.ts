/**
 * Authentication type definitions
 * Extends Supabase auth types with custom user data
 */

import type { User } from "@supabase/supabase-js";
import type { Enums } from "./database";

export interface UserProfile {
	id: string;
	email: string;
	full_name: string | null;
	avatar_url: string | null;
	entitlement_level: Enums<"user_entitlement_level">;
	stripe_customer_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface AuthUser extends Omit<User, "user_metadata"> {
	user_metadata?: {
		full_name?: string;
		avatar_url?: string;
	};
}

export interface AuthSession {
	user: AuthUser;
	access_token: string;
	refresh_token: string;
	expires_in: number;
	expires_at?: number;
	token_type: string;
}

export interface UserEntitlement {
	id: string;
	user_id: string;
	entitlement_level: Enums<"user_entitlement_level">;
	expires_at: string;
	created_at: string;
	updated_at: string;
}

export interface AuthError {
	message: string;
	status?: number;
	code?: string;
}
