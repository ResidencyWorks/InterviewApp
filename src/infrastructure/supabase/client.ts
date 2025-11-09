import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../../types/database";

/**
 * Creates a Supabase client for browser/client-side usage
 * @returns Supabase client instance
 */
export function createClient() {
	return createBrowserClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
	);
}
