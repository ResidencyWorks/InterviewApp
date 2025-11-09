/**
 * Supabase Storage Client Wrapper
 * Provides abstraction over Supabase storage operations for audio file management
 *
 * @file src/lib/storage/supabase-storage.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	throw new Error(
		"Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
	);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = "drill-recordings";

/**
 * Upload a file to Supabase storage
 *
 * @param file - File to upload
 * @param storagePath - Full path in bucket (e.g., "user-123/rec-abc.webm")
 * @returns Upload result
 */
export async function uploadFile(
	file: File,
	storagePath: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await supabase.storage
			.from(BUCKET_NAME)
			.upload(storagePath, file, {
				contentType: file.type,
				upsert: false,
			});

		if (error) {
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get a signed URL for temporary file access
 *
 * @param storagePath - Full path in bucket
 * @param expiresIn - Expiry time in seconds (default: 900 = 15 minutes)
 * @returns Signed URL or error
 */
export async function getSignedUrl(
	storagePath: string,
	expiresIn: number = 900,
): Promise<{ url: string | null; error: string | null }> {
	try {
		const { data, error } = await supabase.storage
			.from(BUCKET_NAME)
			.createSignedUrl(storagePath, expiresIn);

		if (error) {
			return { url: null, error: error.message };
		}

		return { url: data.signedUrl, error: null };
	} catch (error) {
		return {
			url: null,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Delete a file from storage
 *
 * @param storagePath - Full path in bucket
 * @returns Delete result
 */
export async function deleteFile(
	storagePath: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const { error } = await supabase.storage
			.from(BUCKET_NAME)
			.remove([storagePath]);

		if (error) {
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Check if a file exists in storage
 *
 * @param storagePath - Full path in bucket
 * @returns True if file exists
 */
export async function fileExists(storagePath: string): Promise<boolean> {
	try {
		const { data, error } = await supabase.storage
			.from(BUCKET_NAME)
			.list(storagePath.split("/").slice(0, -1).join("/"));

		if (error) {
			return false;
		}

		const fileName = storagePath.split("/").pop();
		return data?.some((file) => file.name === fileName) ?? false;
	} catch {
		return false;
	}
}
