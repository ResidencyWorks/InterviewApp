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

	useEffect(() => {
		// Get initial session
		const getInitialSession = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			setUser(session?.user ?? null);
			setLoading(false);
		};

		getInitialSession();

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(async (_event, session) => {
			setUser(session?.user ?? null);
			setLoading(false);
		});

		return () => subscription.unsubscribe();
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
