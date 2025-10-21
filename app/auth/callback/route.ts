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

	console.log("Auth callback - URL:", requestUrl.toString());
	console.log("Auth callback - Code:", code ? "present" : "missing");
	console.log("Auth callback - Next:", next);
	console.log(
		"Auth callback - All params:",
		Object.fromEntries(requestUrl.searchParams),
	);

	if (code) {
		console.log("Auth callback - Creating Supabase client...");
		const supabase = await createClient();
		console.log("Auth callback - Supabase client created");

		try {
			console.log("Auth callback - Exchanging code for session...");
			const { data, error } = await supabase.auth.exchangeCodeForSession(code);

			if (error) {
				console.error("Auth callback error:", error);
				return NextResponse.redirect(
					`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`,
				);
			}

			console.log("Auth callback - Session exchanged successfully:", {
				user: data.user?.id,
				session: data.session ? "present" : "missing",
			});

			// Successful authentication - redirect to intended destination
			return NextResponse.redirect(`${requestUrl.origin}${next}`);
		} catch (error) {
			console.error("Auth callback exception:", error);
			return NextResponse.redirect(
				`${requestUrl.origin}/login?error=${encodeURIComponent("Authentication failed")}`,
			);
		}
	}

	// No code parameter - redirect to login
	console.log("Auth callback - No code parameter, redirecting to login");
	return NextResponse.redirect(`${requestUrl.origin}/login`);
}
