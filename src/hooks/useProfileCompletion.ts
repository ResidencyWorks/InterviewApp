"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "@/types/auth";

export interface ProfileCompletionData {
	isComplete: boolean;
	missingFields: string[];
	completionPercentage: number;
	loading: boolean;
	error: string | null;
}

export function useProfileCompletion(
	user: AuthUser | null,
): ProfileCompletionData {
	const [data, setData] = useState<ProfileCompletionData>({
		isComplete: false,
		missingFields: [],
		completionPercentage: 0,
		loading: true,
		error: null,
	});

	useEffect(() => {
		if (!user) {
			setData({
				isComplete: false,
				missingFields: [],
				completionPercentage: 0,
				loading: false,
				error: null,
			});
			return;
		}

		async function checkProfileCompletion() {
			try {
				// Check if user is available
				if (!user?.id) {
					console.warn("No user ID available for profile completion check");
					setData({
						isComplete: false,
						missingFields: ["Full Name"],
						completionPercentage: 0,
						loading: false,
						error: "No user session available",
					});
					return;
				}

				console.log("Checking profile completion for user:", {
					userId: user.id,
					userEmail: user.email,
					userAud: user.aud,
				});

				// For now, use auth user metadata directly instead of database table
				// This avoids the database/RLS issues until migrations are properly applied
				const fullName = user.user_metadata?.full_name;
				const hasFullName = !!fullName?.trim();

				const missingFields = hasFullName ? [] : ["Full Name"];
				const completionPercentage = hasFullName ? 100 : 0;
				const isComplete = hasFullName;

				console.log("Profile completion check result:", {
					userId: user.id,
					userEmail: user.email,
					fullName,
					hasFullName,
					isComplete,
					missingFields,
					completionPercentage,
					userMetadata: user.user_metadata,
				});

				setData({
					isComplete,
					missingFields,
					completionPercentage,
					loading: false,
					error: null,
				});
			} catch (error) {
				console.error("Error checking profile completion:", error);
				setData({
					isComplete: false,
					missingFields: ["Full Name"],
					completionPercentage: 0,
					loading: false,
					error:
						error instanceof Error
							? error.message
							: "Failed to check profile completion",
				});
			}
		}

		checkProfileCompletion();
	}, [user]);

	return data;
}
