/**
 * Signed URL Service
 * Handles generation and validation of signed URLs for secure file access
 *
 * @file src/lib/storage/signed-url.ts
 */

import { getSignedUrl } from "./supabase-storage";

/**
 * Maximum expiry time in seconds (15 minutes)
 */
const MAX_EXPIRY_SECONDS = 900;

/**
 * Default expiry time in seconds (15 minutes)
 */
const DEFAULT_EXPIRY_SECONDS = 900;

/**
 * Signed URL with metadata
 */
export interface SignedUrlWithMetadata {
	/** The signed URL */
	url: string;
	/** When the URL was generated */
	generatedAt: Date;
	/** When the URL expires */
	expiresAt: Date;
	/** Expiry time in seconds */
	expiresIn: number;
}

/**
 * Generate a signed URL for file access
 *
 * @param storagePath - Path to the file in storage
 * @param expiresIn - Expiry time in seconds (max 900, default 900)
 * @returns Signed URL with metadata or error
 */
export async function generateSignedUrl(
	storagePath: string,
	expiresIn: number = DEFAULT_EXPIRY_SECONDS,
): Promise<{ success: boolean; data?: SignedUrlWithMetadata; error?: string }> {
	// Validate expiry time
	if (expiresIn > MAX_EXPIRY_SECONDS) {
		return {
			success: false,
			error: `Expiry time exceeds maximum of ${MAX_EXPIRY_SECONDS} seconds`,
		};
	}

	if (expiresIn <= 0) {
		return {
			success: false,
			error: "Expiry time must be greater than 0",
		};
	}

	// Generate signed URL
	const result = await getSignedUrl(storagePath, expiresIn);

	if (!result.url || result.error) {
		return {
			success: false,
			error: result.error || "Failed to generate signed URL",
		};
	}

	const now = new Date();
	const expiresAt = new Date(now.getTime() + expiresIn * 1000);

	return {
		success: true,
		data: {
			url: result.url,
			generatedAt: now,
			expiresAt,
			expiresIn,
		},
	};
}

/**
 * Validate if a signed URL is still valid
 *
 * @param expiresAt - Expiration timestamp
 * @returns True if URL is still valid
 */
export function isSignedUrlValid(expiresAt: Date): boolean {
	return new Date() < expiresAt;
}

/**
 * Get time remaining until expiry
 *
 * @param expiresAt - Expiration timestamp
 * @returns Seconds remaining (0 if expired)
 */
export function getTimeRemaining(expiresAt: Date): number {
	const now = new Date();
	const remaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
	return Math.max(0, remaining);
}
