import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database";
import { createSupabaseServerClient } from "../config/clients";

/**
 * Creates a Supabase client for server-side usage
 * @returns Supabase server client instance
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
	return createSupabaseServerClient();
}
