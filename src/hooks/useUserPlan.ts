"use client";

import type { AuthUser } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/infrastructure/supabase/client";
import type { Tables } from "@/types/database";
import type { UserEntitlementLevel } from "@/types/user";

export interface UserPlan {
	entitlementLevel: UserEntitlementLevel | null;
	displayName: string;
	badgeVariant: "default" | "secondary" | "destructive" | "outline";
	expiresAt?: string;
	isActive: boolean;
}

export interface UserPlanData {
	plan: UserPlan | null;
	loading: boolean;
	error: string | null;
}

export function useUserPlan(user: AuthUser | null): UserPlanData {
	const [data, setData] = useState<UserPlanData>({
		plan: null,
		loading: true,
		error: null,
	});

	useEffect(() => {
		if (!user) {
			setData({ plan: null, loading: false, error: null });
			return;
		}

		async function fetchUserPlan() {
			try {
				const supabase = createClient();

				// Fetch user data from the users table to get entitlement level
				const { data: userData, error: userError } = (await supabase
					.from("users")
					.select("entitlement_level")
					.eq("id", user?.id ?? "")
					.single()) as {
					data: Pick<Tables<"users">, "entitlement_level"> | null;
					error: Error | null;
				};

				if (userError) {
					console.error("Error fetching user plan:", userError);
					// Fallback to FREE plan if user data not found
					setData({
						plan: {
							entitlementLevel: "FREE",
							displayName: "Free Plan",
							badgeVariant: "outline",
							isActive: true,
						},
						loading: false,
						error: null,
					});
					return;
				}

				// Get the most recent active entitlement
				const { data: entitlementData } = (await supabase
					.from("user_entitlements")
					.select("entitlement_level, expires_at")
					.eq("user_id", user?.id ?? "")
					.gte("expires_at", new Date().toISOString())
					.order("created_at", { ascending: false })
					.limit(1)
					.single()) as {
					data: Pick<
						Tables<"user_entitlements">,
						"entitlement_level" | "expires_at"
					> | null;
					error: Error | null;
				};

				// Use entitlement from user_entitlements table if available, otherwise use users table
				const entitlementLevel =
					entitlementData?.entitlement_level ||
					userData?.entitlement_level ||
					"FREE";
				const expiresAt = entitlementData?.expires_at;

				// Determine plan details based on entitlement level
				const planDetails = getPlanDetails(entitlementLevel, expiresAt);

				setData({
					plan: planDetails,
					loading: false,
					error: null,
				});
			} catch (error) {
				console.error("Error fetching user plan:", error);
				setData({
					plan: {
						entitlementLevel: "FREE",
						displayName: "Free Plan",
						badgeVariant: "outline",
						isActive: true,
					},
					loading: false,
					error:
						error instanceof Error ? error.message : "Failed to load plan data",
				});
			}
		}

		fetchUserPlan();
	}, [user]);

	return data;
}

function getPlanDetails(
	entitlementLevel: UserEntitlementLevel | null,
	expiresAt?: string,
): UserPlan {
	const now = new Date();
	const isExpired = expiresAt ? new Date(expiresAt) < now : false;

	switch (entitlementLevel) {
		case "PRO":
			return {
				entitlementLevel: "PRO",
				displayName: "Pro Plan",
				badgeVariant: "default",
				expiresAt,
				isActive: !isExpired,
			};
		case "TRIAL":
			return {
				entitlementLevel: "TRIAL",
				displayName: isExpired ? "Trial Expired" : "Trial Plan",
				badgeVariant: isExpired ? "destructive" : "secondary",
				expiresAt,
				isActive: !isExpired,
			};
		case "FREE":
			return {
				entitlementLevel: "FREE",
				displayName: "Free Plan",
				badgeVariant: "outline",
				isActive: true,
			};
		default:
			return {
				entitlementLevel: "FREE",
				displayName: "Free Plan",
				badgeVariant: "outline",
				isActive: true,
			};
	}
}
