/**
 * Application composition root
 * Provides access to configuration, infrastructure clients, and shared services.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Redis } from "@upstash/redis";
import type { PostHog } from "posthog-node";
import type { Database } from "@/types/database";
import {
	createSupabaseServerClient,
	getPostHogClient,
	getRedisClient,
	getSupabaseServiceRoleClient,
	shutdownClients,
} from "./clients";
import { env } from "./environment";

export interface InfrastructureClients {
	getSupabaseServerClient: () => Promise<SupabaseClient<Database>>;
	getSupabaseServiceRoleClient: () => SupabaseClient<Database> | null;
	getRedisClient: () => Redis | null;
	getPostHogClient: () => PostHog | null;
	shutdown: () => Promise<void>;
}

export interface AppContainer {
	env: typeof env;
	clients: InfrastructureClients;
}

function createInfrastructureClients(): InfrastructureClients {
	return {
		getSupabaseServerClient: () => createSupabaseServerClient(),
		getSupabaseServiceRoleClient: () => getSupabaseServiceRoleClient(),
		getRedisClient: () => getRedisClient(),
		getPostHogClient: () => getPostHogClient(),
		shutdown: () => shutdownClients(),
	};
}

export function createAppContainer(): AppContainer {
	return {
		env,
		clients: createInfrastructureClients(),
	};
}

export const appContainer = createAppContainer();
