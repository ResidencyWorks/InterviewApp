import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../src/lib/supabase/server";

/**
 * Authentication callback handler
 * Processes magic link authentication and redirects users appropriately
 */
export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	const next = requestUrl.searchParams.get("next") ?? "/dashboard";

	if (code) {
		const supabase = await createClient();

		try {
			const { error } = await supabase.auth.exchangeCodeForSession(code);

			if (error) {
				console.error("Auth callback error:", error);
				return NextResponse.redirect(
					`${requestUrl.origin}/auth/login?error=${encodeURIComponent(error.message)}`,
				);
			}

			// Successful authentication - redirect to intended destination
			return NextResponse.redirect(`${requestUrl.origin}${next}`);
		} catch (error) {
			console.error("Auth callback exception:", error);
			return NextResponse.redirect(
				`${requestUrl.origin}/auth/login?error=${encodeURIComponent("Authentication failed")}`,
			);
		}
	}

	// No code parameter - redirect to login
	return NextResponse.redirect(`${requestUrl.origin}/auth/login`);
}
