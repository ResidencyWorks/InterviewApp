/**
 * LoadEvent entity representing the logging event sent to PostHog when content pack is successfully loaded
 *
 * @fileoverview Domain entity for tracking content pack load events
 */

export interface LoadEvent {
	event: "content_pack_loaded";
	properties: {
		contentPackId: string; // ID of the loaded content pack
		version: string; // Content pack version
		schemaVersion: string; // Schema version used
		fileSize: number; // Original file size
		uploadDurationMs: number; // Time from upload to activation
		validationDurationMs: number; // Time spent validating
		activatedBy: string; // User who activated it
		previousPackId?: string; // ID of previously active pack
		timestamp: Date; // When the event occurred
	};
}

/**
 * Factory function to create a LoadEvent
 * @param properties - The event properties
 * @returns LoadEvent instance
 */
export function createLoadEvent(
	properties: LoadEvent["properties"],
): LoadEvent {
	return {
		event: "content_pack_loaded",
		properties: {
			...properties,
			timestamp: properties.timestamp || new Date(),
		},
	};
}

/**
 * Type guard to check if an object is a LoadEvent
 * @param obj - Object to check
 * @returns true if object is a LoadEvent
 */
export function isLoadEvent(obj: unknown): obj is LoadEvent {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"event" in obj &&
		(obj as LoadEvent).event === "content_pack_loaded" &&
		"properties" in obj &&
		typeof (obj as LoadEvent).properties === "object"
	);
}
