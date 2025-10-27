/**
 * Lifecycle Management Service
 * Handles automatic cleanup of expired recordings (30-day retention policy)
 *
 * @file src/lib/storage/lifecycle.ts
 */

import { createClient } from "@supabase/supabase-js";
import { deleteFile } from "./supabase-storage";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Retention period in days (30 days)
 */
const RETENTION_DAYS = 30;

/**
 * Cleanup result
 */
export interface CleanupResult {
	success: boolean;
	deletedCount: number;
	errors: string[];
	expiredRecordings: string[];
}

/**
 * Find expired recordings based on retention policy
 *
 * @returns List of recording IDs that have expired
 */
export async function findExpiredRecordings(): Promise<string[]> {
	try {
		// Calculate expiry threshold (30 days ago)
		const expiryDate = new Date();
		expiryDate.setDate(expiryDate.getDate() - RETENTION_DAYS);

		// Query recordings older than retention period
		const { data, error } = await supabase
			.from("recordings")
			.select("id, storage_path")
			.lt("recorded_at", expiryDate.toISOString());

		if (error) {
			console.error("Error finding expired recordings:", error);
			return [];
		}

		return data?.map((r) => r.id) || [];
	} catch (error) {
		console.error("Error in findExpiredRecordings:", error);
		return [];
	}
}

/**
 * Clean up a single expired recording
 *
 * @param recordingId - ID of the recording to clean up
 * @returns True if cleanup was successful
 */
export async function cleanupRecording(
	recordingId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Get recording metadata
		const { data: recording, error } = await supabase
			.from("recordings")
			.select("storage_path")
			.eq("id", recordingId)
			.single();

		if (error || !recording) {
			return { success: false, error: "Recording not found" };
		}

		// Delete file from storage
		const deleteResult = await deleteFile(recording.storage_path);

		if (!deleteResult.success) {
			return { success: false, error: deleteResult.error };
		}

		// Delete metadata from database
		const { error: deleteError } = await supabase
			.from("recordings")
			.delete()
			.eq("id", recordingId);

		if (deleteError) {
			return { success: false, error: "Failed to delete metadata" };
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
 * Clean up all expired recordings
 *
 * @returns Cleanup result with statistics
 */
export async function cleanupExpiredRecordings(): Promise<CleanupResult> {
	const result: CleanupResult = {
		success: true,
		deletedCount: 0,
		errors: [],
		expiredRecordings: [],
	};

	try {
		// Find expired recordings
		const expiredIds = await findExpiredRecordings();

		if (expiredIds.length === 0) {
			console.log("No expired recordings found");
			return result;
		}

		result.expiredRecordings = expiredIds;

		// Clean up each expired recording
		for (const recordingId of expiredIds) {
			const cleanupResult = await cleanupRecording(recordingId);

			if (cleanupResult.success) {
				result.deletedCount++;
			} else {
				result.errors.push(
					`Failed to cleanup recording ${recordingId}: ${cleanupResult.error}`,
				);
			}
		}

		console.log(
			`Cleanup complete: ${result.deletedCount}/${expiredIds.length} recordings deleted`,
		);

		return result;
	} catch (error) {
		result.success = false;
		result.errors.push(
			error instanceof Error ? error.message : "Unknown error",
		);

		return result;
	}
}
