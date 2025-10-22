import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@/types/auth";

/**
 * Custom hook for managing authentication state and user session
 *
 * @returns Object containing user state, loading state, and auth methods
 * @example
 * ```tsx
 * const { user, loading, signIn, signOut } = useAuth();
 * ```
 */
export function useAuth() {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);
	const supabase = createClient();

	useEffect(() => {
		let mounted = true;

		// Listen for auth changes first
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log(
				"useAuth - Auth state changed:",
				event,
				session ? "session present" : "no session",
			);

			if (mounted) {
				if (event === "SIGNED_IN" && session) {
					// User just signed in, use the session user directly
					console.log(
						"useAuth - Signed in - user:",
						session.user
							? { id: session.user.id, email: session.user.email }
							: null,
					);
					setUser(session.user);
					setLoading(false);
				} else if (event === "SIGNED_OUT") {
					// User signed out
					console.log("useAuth - Signed out");
					setUser(null);
					setLoading(false);
				} else if (event === "INITIAL_SESSION" && session) {
					// Initial session found
					console.log(
						"useAuth - Initial session - user:",
						session.user
							? { id: session.user.id, email: session.user.email }
							: null,
					);
					setUser(session.user);
					setLoading(false);
				} else if (event === "INITIAL_SESSION" && !session) {
					// No initial session
					console.log("useAuth - No initial session");
					setUser(null);
					setLoading(false);
				} else {
					// Other events, get user from auth
					const {
						data: { user },
					} = await supabase.auth.getUser();
					console.log(
						"useAuth - Auth change - user:",
						user ? { id: user.id, email: user.email } : null,
					);
					setUser(user);
					setLoading(false);
				}
			}
		});

		// Timeout to prevent infinite loading (increased to 10 seconds)
		const timeout = setTimeout(() => {
			console.log("useAuth - Timeout reached, setting loading to false");
			if (mounted) {
				setLoading(false);
			}
		}, 10000); // 10 second timeout

		return () => {
			mounted = false;
			clearTimeout(timeout);
			subscription.unsubscribe();
		};
	}, [supabase.auth]);

	/**
	 * Sign in with magic link
	 * @param email - User's email address
	 * @returns Promise that resolves when magic link is sent
	 */
	const signIn = async (email: string) => {
		// Next.js client/server—both are fine as long as it's absolute
		const origin =
			typeof window !== "undefined"
				? window.location.origin
				: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"; // set this in Vercel

		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${origin}/auth/callback`,
			},
		});
		if (error) throw error;
	};

	/**
	 * Sign out the current user
	 * @returns Promise that resolves when user is signed out
	 */
	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) throw error;
	};

	return {
		loading,
		signIn,
		signOut,
		user,
	};
}
