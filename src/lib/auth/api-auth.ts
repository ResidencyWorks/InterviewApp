/**
 * API Authentication Utilities
 * Provides flexible authentication options for the evaluation API
 */

import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { env, isDevelopment } from "../../infrastructure/config/environment";

export interface AuthResult {
	authenticated: boolean;
	userId?: string;
	error?: string;
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(request: NextRequest): string | null {
	const authHeader = request.headers.get("authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return null;
	}
	return authHeader.substring(7); // Remove "Bearer " prefix
}

/**
 * Development mode: Accept any bearer token for testing
 * This allows easy local testing without setting up full auth
 */
function devModeAuth(token: string): AuthResult {
	if (!token) {
		return { authenticated: false, error: "Missing bearer token" };
	}
	return {
		authenticated: true,
		userId: "dev-user",
	};
}

/**
 * Validate Supabase JWT token
 */
async function validateSupabaseToken(token: string): Promise<AuthResult> {
	try {
		const supabase = createClient(
			env.NEXT_PUBLIC_SUPABASE_URL,
			env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		);

		const {
			data: { user },
			error,
		} = await supabase.auth.getUser(token);

		if (error || !user) {
			return {
				authenticated: false,
				error: "Invalid or expired token",
			};
		}

		return {
			authenticated: true,
			userId: user.id,
		};
	} catch {
		return {
			authenticated: false,
			error: "Token validation failed",
		};
	}
}

/**
 * Validate API key (for service-to-service authentication)
 * Checks against environment variable API_KEYS (comma-separated list)
 */
function validateApiKey(token: string): AuthResult {
	const validApiKeys =
		process.env.API_KEYS?.split(",").map((k) => k.trim()) || [];

	if (validApiKeys.length === 0) {
		// No API keys configured
		return {
			authenticated: false,
			error: "API key authentication not configured",
		};
	}

	if (validApiKeys.includes(token)) {
		return {
			authenticated: true,
			userId: "api-key-user",
		};
	}

	return {
		authenticated: false,
		error: "Invalid API key",
	};
}

/**
 * Main authentication function
 * Supports multiple authentication strategies:
 * 1. Development mode: Accept any token
 * 2. Supabase JWT validation
 * 3. API key validation
 */
export async function authenticateRequest(
	request: NextRequest,
): Promise<AuthResult> {
	const token = extractBearerToken(request);

	if (!token) {
		return {
			authenticated: false,
			error: "Missing Authorization header",
		};
	}

	// Strategy 1: Development mode (accepts any token)
	if (isDevelopment && process.env.DISABLE_AUTH !== "false") {
		console.log("⚠️  DEV MODE: Using simplified authentication");
		return devModeAuth(token);
	}

	// Strategy 2: Check if token looks like an API key (starts with "sk_" or similar)
	if (token.startsWith("sk_") || token.startsWith("api_")) {
		return validateApiKey(token);
	}

	// Strategy 3: Validate as Supabase JWT token
	return validateSupabaseToken(token);
}

/**
 * Get a test token for development
 * Run this in your terminal to generate a token
 */
export function generateDevToken(): string {
	return `dev-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
