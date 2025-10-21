import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Authentication API route handler
 * Handles magic link authentication and session management
 * @param request - Next.js request object containing email in JSON body
 * @returns Promise resolving to NextResponse with success/error message
 */
export async function POST(request: NextRequest) {
	try {
		const cookieStore = await cookies();
		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
			{
				cookies: {
					getAll() {
						return cookieStore.getAll();
					},
					setAll(cookiesToSet) {
						for (const { name, value, options } of cookiesToSet) {
							cookieStore.set(name, value, options);
						}
					},
				},
			},
		);

		const { email } = await request.json();

		if (!email) {
			return NextResponse.json({ error: "Email is required" }, { status: 400 });
		}

		// Send magic link
		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
			},
		});

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({
			message: "Magic link sent successfully",
		});
	} catch (error) {
		console.error("Auth API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * Get current user
 * Retrieves the current authenticated user from Supabase
 * @returns Promise resolving to NextResponse with user data or error
 */
export async function GET() {
	try {
		const cookieStore = await cookies();
		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
			{
				cookies: {
					getAll() {
						return cookieStore.getAll();
					},
					setAll(cookiesToSet) {
						for (const { name, value, options } of cookiesToSet) {
							cookieStore.set(name, value, options);
						}
					},
				},
			},
		);

		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ user });
	} catch (error) {
		console.error("User API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
