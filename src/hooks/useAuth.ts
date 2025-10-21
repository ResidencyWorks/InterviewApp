import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const supabase = createClient();

	// Debug: Log Supabase configuration
	console.log(
		"useAuth - Supabase URL:",
		process.env.NEXT_PUBLIC_SUPABASE_URL ? "present" : "missing",
	);
	console.log(
		"useAuth - Supabase Anon Key:",
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "present" : "missing",
	);

	useEffect(() => {
		let mounted = true;

		// Get initial user
		const getInitialUser = async () => {
			try {
				console.log("useAuth - Attempting to get user...");

				const {
					data: { user },
					error,
				} = await supabase.auth.getUser();

				console.log("useAuth - getUser result:", {
					user: user ? { id: user.id, email: user.email } : null,
					error: error
						? { message: error.message, status: error.status }
						: null,
				});

				if (error) {
					console.error("useAuth - Error getting user:", error);
				}

				if (mounted) {
					setUser(user);
					setLoading(false);
				}
			} catch (error) {
				console.error("useAuth - Exception getting user:", error);
				if (mounted) {
					setLoading(false);
				}
			}
		};

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

		// Get initial user after setting up the listener
		getInitialUser();

		// Timeout to prevent infinite loading
		const timeout = setTimeout(() => {
			console.log("useAuth - Timeout reached, setting loading to false");
			if (mounted) {
				setLoading(false);
			}
		}, 5000); // 5 second timeout

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
		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`,
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
