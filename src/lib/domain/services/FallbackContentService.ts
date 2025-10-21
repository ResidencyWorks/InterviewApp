import type { ContentPack } from "../entities/ContentPack";
import { ContentPackStatus } from "../entities/ContentPack";
import type { IAnalyticsService } from "../interfaces/IAnalyticsService";
import type { IContentPackService } from "../interfaces/IContentPackService";

/**
 * Service for handling fallback content when no valid content pack is loaded.
 * Provides default content and manages fallback state.
 */
export class FallbackContentService {
	private readonly contentPackService: IContentPackService;
	private readonly analyticsService: IAnalyticsService;
	private fallbackContentPack: ContentPack | null = null;
	private isUsingFallback = false;
	private fallbackWarningDismissed = false;

	constructor(
		contentPackService: IContentPackService,
		analyticsService: IAnalyticsService,
	) {
		this.contentPackService = contentPackService;
		this.analyticsService = analyticsService;
	}

	/**
	 * Initialize the fallback service and check for active content pack
	 */
	async initialize(): Promise<void> {
		try {
			const activeContentPack =
				await this.contentPackService.getActiveContentPack();

			if (!activeContentPack) {
				await this.enableFallbackMode();
			} else {
				this.disableFallbackMode();
			}
		} catch (error) {
			console.error("Failed to initialize fallback service:", error);
			await this.enableFallbackMode();
		}
	}

	/**
	 * Enable fallback mode when no valid content pack is available
	 */
	async enableFallbackMode(): Promise<void> {
		if (this.isUsingFallback) {
			return; // Already in fallback mode
		}

		this.isUsingFallback = true;
		this.fallbackWarningDismissed = false;

		// Create default fallback content pack
		this.fallbackContentPack = this.createDefaultContentPack();

		// Track fallback activation
		await this.analyticsService.track("fallback_content_activated", {
			timestamp: new Date().toISOString(),
			reason: "no_active_content_pack",
		});

		console.warn(
			"Fallback content mode activated - no valid content pack available",
		);
	}

	/**
	 * Disable fallback mode when a valid content pack becomes available
	 */
	disableFallbackMode(): void {
		if (!this.isUsingFallback) {
			return; // Not in fallback mode
		}

		this.isUsingFallback = false;
		this.fallbackContentPack = null;
		this.fallbackWarningDismissed = false;

		console.info(
			"Fallback content mode deactivated - valid content pack available",
		);
	}

	/**
	 * Get the current content pack (active or fallback)
	 */
	async getCurrentContentPack(): Promise<ContentPack | null> {
		if (this.isUsingFallback) {
			return this.fallbackContentPack;
		}

		return await this.contentPackService.getActiveContentPack();
	}

	/**
	 * Check if the system is currently using fallback content
	 */
	isInFallbackMode(): boolean {
		return this.isUsingFallback;
	}

	/**
	 * Check if the fallback warning has been dismissed by the user
	 */
	isFallbackWarningDismissed(): boolean {
		return this.fallbackWarningDismissed;
	}

	/**
	 * Dismiss the fallback warning (user action)
	 */
	dismissFallbackWarning(): void {
		this.fallbackWarningDismissed = true;

		// Track warning dismissal
		this.analyticsService.track("fallback_warning_dismissed", {
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Reset the fallback warning (show it again)
	 */
	resetFallbackWarning(): void {
		this.fallbackWarningDismissed = false;
	}

	/**
	 * Get fallback status information
	 */
	getFallbackStatus(): {
		isUsingFallback: boolean;
		warningDismissed: boolean;
		hasActiveContentPack: boolean;
		fallbackContentPackId?: string;
	} {
		return {
			isUsingFallback: this.isUsingFallback,
			warningDismissed: this.fallbackWarningDismissed,
			hasActiveContentPack: !this.isUsingFallback,
			fallbackContentPackId: this.fallbackContentPack?.id,
		};
	}

	/**
	 * Create a default content pack for fallback scenarios
	 */
	private createDefaultContentPack(): ContentPack {
		const now = new Date();

		return {
			id: "fallback-content-pack",
			version: "1.0.0",
			name: "Default Fallback Content",
			description:
				"Default content pack used when no valid content pack is available",
			schemaVersion: "1.0.0",
			content: {
				evaluations: [
					{
						id: "default-evaluation",
						title: "Default Evaluation",
						description:
							"This is a default evaluation that will be used when no content pack is loaded.",
						criteria: [
							{
								id: "default-criteria",
								name: "Basic Assessment",
								weight: 1.0,
								description: "Basic assessment criteria for fallback content",
							},
						],
						questions: [
							{
								id: "default-question",
								text: "Please upload a valid content pack to access the full evaluation system.",
								type: "text",
								options: [],
							},
						],
					},
				],
				categories: [
					{
						id: "default-category",
						name: "Default Category",
						description: "Default category for fallback content",
					},
				],
			},
			metadata: {
				author: "System",
				tags: ["fallback", "default"],
				dependencies: [],
				compatibility: {
					minVersion: "1.0.0",
					features: ["basic-evaluation"],
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
	 * Handle content pack activation events
	 */
	async onContentPackActivated(contentPack: ContentPack): Promise<void> {
		if (this.isUsingFallback) {
			this.disableFallbackMode();

			// Track fallback deactivation
			await this.analyticsService.track("fallback_content_deactivated", {
				timestamp: new Date().toISOString(),
				activatedContentPackId: contentPack.id,
				activatedContentPackVersion: contentPack.version,
			});
		}
	}

	/**
	 * Handle content pack deactivation events
	 */
	async onContentPackDeactivated(): Promise<void> {
		// Check if we need to enable fallback mode
		const activeContentPack =
			await this.contentPackService.getActiveContentPack();

		if (!activeContentPack) {
			await this.enableFallbackMode();
		}
	}
}
