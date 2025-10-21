import type { ContentPack } from "../domain/entities/ContentPack";
import type { IContentPackService } from "../domain/interfaces/IContentPackService";
import { FallbackContentService } from "../domain/services/FallbackContentService";
import { defaultContentPackLoader } from "../infrastructure/default/DefaultContentPack";

/**
 * Application startup content pack loader.
 * Handles initialization of content packs and fallback content on application startup.
 */
export class ApplicationStartupContentPackLoader {
	private readonly contentPackService: IContentPackService;
	private readonly fallbackService: FallbackContentService;
	private isInitialized = false;
	private initializationPromise: Promise<void> | null = null;

	constructor(contentPackService: IContentPackService) {
		this.contentPackService = contentPackService;
		this.fallbackService = new FallbackContentService(
			contentPackService,
			// We'll need to inject analytics service here
			// For now, we'll create a mock one
			{
				track: async () => {},
				trackContentPackLoad: async () => {},
				identify: async () => {},
				setUserProperties: async () => {},
				trackPageView: async () => {},
				trackError: async () => {},
				flush: async () => {},
				isAvailable: () => false,
			},
		);
	}

	/**
	 * Initialize the content pack loader on application startup
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		if (this.initializationPromise) {
			return this.initializationPromise;
		}

		this.initializationPromise = this.performInitialization();
		return this.initializationPromise;
	}

	/**
	 * Perform the actual initialization
	 */
	private async performInitialization(): Promise<void> {
		try {
			console.log("Initializing content pack loader...");

			// Initialize fallback service
			await this.fallbackService.initialize();

			// Load default content pack
			const defaultContentPack =
				defaultContentPackLoader.loadDefaultContentPack();
			console.log("Default content pack loaded:", defaultContentPack.name);

			// Check for active content pack
			const activeContentPack =
				await this.contentPackService.getActiveContentPack();

			if (activeContentPack) {
				console.log(
					"Active content pack found:",
					activeContentPack.name,
					"v" + activeContentPack.version,
				);
				this.fallbackService.disableFallbackMode();
			} else {
				console.log("No active content pack found, using fallback content");
				await this.fallbackService.enableFallbackMode();
			}

			// Validate system status
			const systemStatus = defaultContentPackLoader.getSystemStatus();
			console.log("System status:", systemStatus);

			this.isInitialized = true;
			console.log("Content pack loader initialized successfully");
		} catch (error) {
			console.error("Failed to initialize content pack loader:", error);

			// Fallback to default content pack
			try {
				await this.fallbackService.enableFallbackMode();
				console.log(
					"Fallback content pack activated due to initialization error",
				);
			} catch (fallbackError) {
				console.error(
					"Failed to activate fallback content pack:",
					fallbackError,
				);
				throw new Error(
					"Critical error: Unable to initialize content pack system",
				);
			}
		}
	}

	/**
	 * Get the current content pack (active or fallback)
	 */
	async getCurrentContentPack(): Promise<ContentPack | null> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		return await this.fallbackService.getCurrentContentPack();
	}

	/**
	 * Check if the system is using fallback content
	 */
	isUsingFallback(): boolean {
		return this.fallbackService.isInFallbackMode();
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
		return this.fallbackService.getFallbackStatus();
	}

	/**
	 * Handle content pack activation events
	 */
	async onContentPackActivated(contentPack: ContentPack): Promise<void> {
		await this.fallbackService.onContentPackActivated(contentPack);
	}

	/**
	 * Handle content pack deactivation events
	 */
	async onContentPackDeactivated(): Promise<void> {
		await this.fallbackService.onContentPackDeactivated();
	}

	/**
	 * Dismiss fallback warning
	 */
	dismissFallbackWarning(): void {
		this.fallbackService.dismissFallbackWarning();
	}

	/**
	 * Reset fallback warning
	 */
	resetFallbackWarning(): void {
		this.fallbackService.resetFallbackWarning();
	}

	/**
	 * Get system health status
	 */
	getSystemHealth(): {
		isInitialized: boolean;
		isUsingFallback: boolean;
		hasActiveContentPack: boolean;
		fallbackStatus: {
			isUsingFallback: boolean;
			warningDismissed: boolean;
			hasActiveContentPack: boolean;
			fallbackContentPackId?: string;
		};
		systemStatus: {
			hasDefaultContentPack: boolean;
			defaultContentPackInfo: {
				id: string;
				name: string;
				version: string;
				description: string;
				isFallback: boolean;
			};
			isSystemReady: boolean;
		};
	} {
		return {
			isInitialized: this.isInitialized,
			isUsingFallback: this.isUsingFallback(),
			hasActiveContentPack: !this.isUsingFallback(),
			fallbackStatus: this.getFallbackStatus(),
			systemStatus: defaultContentPackLoader.getSystemStatus(),
		};
	}

	/**
	 * Force re-initialization (useful for testing or recovery)
	 */
	async reinitialize(): Promise<void> {
		this.isInitialized = false;
		this.initializationPromise = null;
		await this.initialize();
	}

	/**
	 * Shutdown the content pack loader
	 */
	async shutdown(): Promise<void> {
		try {
			// Analytics service shutdown is handled by the service itself
			console.log("Content pack loader shutdown completed");
		} catch (error) {
			console.error("Error during content pack loader shutdown:", error);
		}
	}
}

/**
 * Global instance of the application startup content pack loader
 * This should be initialized once during application startup
 */
let globalContentPackLoader: ApplicationStartupContentPackLoader | null = null;

/**
 * Get the global content pack loader instance
 */
export function getGlobalContentPackLoader(): ApplicationStartupContentPackLoader | null {
	return globalContentPackLoader;
}

/**
 * Initialize the global content pack loader
 */
export async function initializeGlobalContentPackLoader(
	contentPackService: IContentPackService,
): Promise<ApplicationStartupContentPackLoader> {
	if (globalContentPackLoader) {
		return globalContentPackLoader;
	}

	globalContentPackLoader = new ApplicationStartupContentPackLoader(
		contentPackService,
	);
	await globalContentPackLoader.initialize();

	return globalContentPackLoader;
}

/**
 * Shutdown the global content pack loader
 */
export async function shutdownGlobalContentPackLoader(): Promise<void> {
	if (globalContentPackLoader) {
		await globalContentPackLoader.shutdown();
		globalContentPackLoader = null;
	}
}
