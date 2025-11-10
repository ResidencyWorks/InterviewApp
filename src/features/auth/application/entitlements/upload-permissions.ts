/**
 * User Entitlement Validation Service
 * Provides user permission checks for audio upload feature
 *
 * @file src/features/auth/application/entitlements/upload-permissions.ts
 */

import { entitlementsService } from "@/features/auth/domain/entitlements/EntitlementsService";

/**
 * Check if user has permission to record and upload audio
 *
 * @param userId - User identifier
 * @returns True if user has permission
 */
export async function hasUploadPermission(userId: string): Promise<boolean> {
	try {
		const entitlements = entitlementsService.get(userId);
		return entitlements.practiceAccess;
	} catch (error) {
		console.error("Error checking upload permission:", error);
		return false;
	}
}

/**
 * Validate user entitlement before upload
 * Throws error if user does not have permission
 *
 * @param userId - User identifier
 * @throws Error if user does not have permission
 */
export async function validateUploadPermission(userId: string): Promise<void> {
	const hasPermission = await hasUploadPermission(userId);

	if (!hasPermission) {
		throw new Error("User does not have permission to upload audio recordings");
	}
}

/**
 * Get user entitlements
 *
 * @param userId - User identifier
 * @returns User entitlements object
 */
export async function getUserEntitlements(userId: string) {
	return entitlementsService.get(userId);
}
