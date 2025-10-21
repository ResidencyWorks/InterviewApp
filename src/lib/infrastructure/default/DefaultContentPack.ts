import type { ContentPack } from "../../domain/entities/ContentPack";
import { ContentPackStatus } from "../../domain/entities/ContentPack";

/**
 * Default content pack loader for fallback scenarios.
 * Provides a minimal content pack when no valid content pack is available.
 */
export class DefaultContentPackLoader {
	private static instance: DefaultContentPackLoader;
	private defaultContentPack: ContentPack | null = null;

	private constructor() {}

	/**
	 * Get the singleton instance of the default content pack loader
	 */
	static getInstance(): DefaultContentPackLoader {
		if (!DefaultContentPackLoader.instance) {
			DefaultContentPackLoader.instance = new DefaultContentPackLoader();
		}
		return DefaultContentPackLoader.instance;
	}

	/**
	 * Load the default content pack
	 */
	loadDefaultContentPack(): ContentPack {
		if (!this.defaultContentPack) {
			this.defaultContentPack = this.createDefaultContentPack();
		}
		return this.defaultContentPack;
	}

	/**
	 * Check if a content pack is the default fallback pack
	 */
	isDefaultContentPack(contentPack: ContentPack): boolean {
		return (
			contentPack.id === "fallback-content-pack" ||
			contentPack.name === "Default Fallback Content"
		);
	}

	/**
	 * Get default content pack metadata
	 */
	getDefaultContentPackInfo(): {
		id: string;
		name: string;
		version: string;
		description: string;
		isFallback: boolean;
	} {
		return {
			id: "fallback-content-pack",
			name: "Default Fallback Content",
			version: "1.0.0",
			description:
				"Default content pack used when no valid content pack is available",
			isFallback: true,
		};
	}

	/**
	 * Create the default content pack structure
	 */
	private createDefaultContentPack(): ContentPack {
		const now = new Date();

		return {
			id: "fallback-content-pack",
			version: "1.0.0",
			name: "Default Fallback Content",
			description:
				"Default content pack used when no valid content pack is available. Please upload a valid content pack to access the full evaluation system.",
			schemaVersion: "1.0.0",
			content: {
				evaluations: [
					{
						id: "default-evaluation",
						title: "System Status Check",
						description:
							"This evaluation is shown when no content pack is loaded. Please upload a valid content pack to access the full evaluation system.",
						criteria: [
							{
								id: "system-status",
								name: "System Status",
								weight: 1.0,
								description:
									"Check if the system is properly configured with a content pack",
							},
						],
						questions: [
							{
								id: "status-question",
								text: "No content pack is currently loaded. Please contact your administrator to upload a valid content pack.",
								type: "text",
								options: [],
							},
							{
								id: "action-question",
								text: "What would you like to do?",
								type: "multiple-choice",
								options: [
									"Contact administrator",
									"Check system status",
									"Wait for content pack to be loaded",
								],
							},
						],
					},
				],
				categories: [
					{
						id: "system-category",
						name: "System Status",
						description: "System status and configuration information",
					},
					{
						id: "fallback-category",
						name: "Fallback Content",
						description:
							"Default content shown when no content pack is available",
					},
				],
				instructions: {
					title: "System Configuration Required",
					description:
						"This system requires a content pack to function properly. Please ensure a valid content pack is uploaded and activated.",
					steps: [
						"Contact your system administrator",
						"Request a valid content pack to be uploaded",
						"Wait for the content pack to be activated",
						"Refresh this page once the content pack is available",
					],
				},
			},
			metadata: {
				author: "System",
				tags: ["fallback", "default", "system"],
				dependencies: [],
				compatibility: {
					minVersion: "1.0.0",
					features: ["basic-evaluation", "system-status"],
				},
				customFields: {
					isFallback: true,
					generatedAt: now.toISOString(),
					systemVersion: "1.0.0",
				},
			},
			status: ContentPackStatus.ACTIVATED,
			createdAt: now,
			updatedAt: now,
			activatedAt: now,
			activatedBy: "system",
			uploadedBy: "system",
			fileSize: 0,
			checksum: "fallback-content-pack-checksum",
		};
	}

	/**
	 * Get a minimal content pack for testing purposes
	 */
	createMinimalContentPack(): ContentPack {
		const now = new Date();

		return {
			id: "minimal-content-pack",
			version: "1.0.0",
			name: "Minimal Test Content",
			description: "Minimal content pack for testing purposes",
			schemaVersion: "1.0.0",
			content: {
				evaluations: [
					{
						id: "test-evaluation",
						title: "Test Evaluation",
						description: "A simple test evaluation",
						criteria: [
							{
								id: "test-criteria",
								name: "Test Criteria",
								weight: 1.0,
								description: "Basic test criteria",
							},
						],
						questions: [
							{
								id: "test-question",
								text: "This is a test question",
								type: "text",
								options: [],
							},
						],
					},
				],
				categories: [
					{
						id: "test-category",
						name: "Test Category",
						description: "A test category",
					},
				],
			},
			metadata: {
				author: "Test System",
				tags: ["test", "minimal"],
				dependencies: [],
				compatibility: {
					minVersion: "1.0.0",
					features: ["basic-evaluation"],
				},
			},
			status: ContentPackStatus.VALID,
			createdAt: now,
			updatedAt: now,
			uploadedBy: "test-system",
			fileSize: 0,
			checksum: "minimal-content-pack-checksum",
		};
	}

	/**
	 * Validate that a content pack has the minimum required structure
	 */
	validateContentPackStructure(contentPack: ContentPack): {
		isValid: boolean;
		errors: string[];
		warnings: string[];
	} {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Check required fields
		if (!contentPack.id) {
			errors.push("Content pack ID is required");
		}
		if (!contentPack.name) {
			errors.push("Content pack name is required");
		}
		if (!contentPack.version) {
			errors.push("Content pack version is required");
		}
		if (!contentPack.content) {
			errors.push("Content pack content is required");
		}

		// Check content structure
		if (contentPack.content) {
			if (
				!contentPack.content.evaluations ||
				contentPack.content.evaluations.length === 0
			) {
				errors.push("At least one evaluation is required");
			}
			if (
				!contentPack.content.categories ||
				contentPack.content.categories.length === 0
			) {
				warnings.push(
					"No categories defined - consider adding categories for better organization",
				);
			}
		}

		// Check metadata
		if (!contentPack.metadata) {
			warnings.push(
				"No metadata provided - consider adding metadata for better organization",
			);
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Get system status information
	 */
	getSystemStatus(): {
		hasDefaultContentPack: boolean;
		defaultContentPackInfo: {
			id: string;
			name: string;
			version: string;
			description: string;
			isFallback: boolean;
		};
		isSystemReady: boolean;
	} {
		return {
			hasDefaultContentPack: this.defaultContentPack !== null,
			defaultContentPackInfo: this.getDefaultContentPackInfo(),
			isSystemReady: true, // System is always ready with fallback content
		};
	}
}

// Export singleton instance
export const defaultContentPackLoader = DefaultContentPackLoader.getInstance();
