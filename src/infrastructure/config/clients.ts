/**
 * Centralized external client factories
 * Provides single place to construct infrastructure clients used across the app
 */

import { createServerClient } from "@supabase/ssr";
import {
	createClient as createSupabaseClient,
	type SupabaseClient,
} from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { cookies } from "next/headers";
import { PostHog } from "posthog-node";
import type { Database } from "@/types/database";
import {
	env,
	hasPostHog,
	hasRedis,
	hasSupabaseServiceRole,
} from "./environment";

type SupabaseServerClient = SupabaseClient<Database>;

let supabaseServiceRoleClient: SupabaseClient<Database> | null = null;
let redisClient: Redis | null = null;
let posthogClient: PostHog | null = null;

/**
 * Create a Supabase client scoped to the current request (server-only)
 */
export async function createSupabaseServerClient(): Promise<SupabaseServerClient> {
	const cookieStore = await cookies();
	const anonKey =
		env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
		env.SUPABASE_ANON_KEY ||
		env.SUPABASE_SERVICE_ROLE_KEY;

	return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, anonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					for (const { name, value, options } of cookiesToSet) {
						cookieStore.set(name, value, options);
					}
				} catch {
					// Ignore errors when called from Server Components without mutation support.
				}
			},
		},
	});
}

/**
 * Return a singleton Supabase service-role client for background/infrastructure work
 */
export function getSupabaseServiceRoleClient(): SupabaseClient<Database> | null {
	if (!hasSupabaseServiceRole) {
		return null;
	}

	if (!supabaseServiceRoleClient) {
		// Use SUPABASE_URL if provided, otherwise fall back to NEXT_PUBLIC_SUPABASE_URL
		// They are typically the same value
		const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
		supabaseServiceRoleClient = createSupabaseClient<Database>(
			supabaseUrl,
			env.SUPABASE_SERVICE_ROLE_KEY,
		);
	}

	return supabaseServiceRoleClient;
}

/**
 * Return a singleton Redis client (Upstash) if configured
 */
export function getRedisClient(): Redis | null {
	if (
		!hasRedis ||
		!env.UPSTASH_REDIS_REST_URL ||
		!env.UPSTASH_REDIS_REST_TOKEN
	) {
		return null;
	}

	if (!redisClient) {
		redisClient = new Redis({
			url: env.UPSTASH_REDIS_REST_URL,
			token: env.UPSTASH_REDIS_REST_TOKEN,
		});
	}

	return redisClient;
}

/**
 * Return a singleton PostHog client if analytics is enabled
 */
export function getPostHogClient(): PostHog | null {
	if (!hasPostHog || !env.POSTHOG_API_KEY) {
		return null;
	}

	if (!posthogClient) {
		posthogClient = new PostHog(env.POSTHOG_API_KEY, {
			host: env.POSTHOG_HOST,
		});
	}

	return posthogClient;
}

/**
 * Dispose any singleton clients that support graceful shutdown
 */
export async function shutdownClients(): Promise<void> {
	if (posthogClient) {
		try {
			await posthogClient.shutdown();
		} catch (error) {
			console.error("Failed to shutdown PostHog client:", error);
		} finally {
			posthogClient = null;
		}
	}
}
