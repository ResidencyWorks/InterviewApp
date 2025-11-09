import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "../../types/database";

/**
 * Creates a Supabase client for middleware usage (Edge Runtime compatible)
 * @param request - The Next.js request object
 * @param response - The Next.js response object
 * @returns Supabase server client instance
 */
export function createClient(request: NextRequest, response: NextResponse) {
	return createServerClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						response.cookies.set(name, value, options);
					});
				},
			},
		},
	);
}
