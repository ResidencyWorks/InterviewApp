import type { PostHog } from "posthog-js";
import posthog from "posthog-js";
import type { UserProfile } from "@/types";

/**
 * PostHog analytics configuration and utilities
 * Handles user tracking and event analytics
 */

// PostHog configuration
const posthogConfig = {
	api_host: process.env.POSTHOG_HOST || "https://app.posthog.com",
	capture_pageleave: true,
	capture_pageview: false, // We'll handle pageview tracking manually
	loaded: (posthog: PostHog) => {
		if (process.env.NODE_ENV === "development") {
			posthog.debug();
		}
	},
	person_profiles: "identified_only", // Only create profiles for identified users
};

/**
 * Analytics service for PostHog
 * Provides comprehensive analytics tracking including user events, performance metrics, and business events
 */
export class AnalyticsService {
	private posthog: PostHog | null = null;
	private isInitialized = false;

	/**
	 * Initialize PostHog analytics service
	 * Sets up PostHog with configuration and handles initialization errors
	 * @returns void
	 */
	init(): void {
		if (typeof window === "undefined" || this.isInitialized) {
			return;
		}

		try {
			posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "", {
				...posthogConfig,
				person_profiles: "identified_only",
			});
			this.posthog = posthog;
			this.isInitialized = true;
		} catch (error) {
			console.error("Failed to initialize PostHog:", error);
		}
	}

	/**
	 * Identify a user for analytics tracking
	 * @param userId - Unique identifier for the user
	 * @param userProfile - Optional user profile data to associate with the user
	 * @returns void
	 */
	identify(userId: string, userProfile?: UserProfile): void {
		if (!this.posthog) {
			this.init();
		}

		if (this.posthog) {
			this.posthog.identify(userId, {
				created_at: userProfile?.created_at,
				email: userProfile?.email,
				entitlement_level: userProfile?.entitlement_level,
				full_name: userProfile?.full_name,
			});
		}
	}

	/**
	 * Reset user identification and clear user data
	 * @returns void
	 */
	reset(): void {
		if (this.posthog) {
			this.posthog.reset();
		}
	}

	/**
	 * Track a custom event with optional properties
	 * @param eventName - Name of the event to track
	 * @param properties - Optional properties to include with the event
	 * @returns void
	 */
	track(eventName: string, properties?: Record<string, unknown>): void {
		if (!this.posthog) {
			this.init();
		}

		if (this.posthog) {
			this.posthog.capture(eventName, {
				...properties,
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Track a page view event
	 * @param pageName - Optional name of the page, defaults to current pathname
	 * @param properties - Optional properties to include with the page view
	 * @returns void
	 */
	trackPageView(pageName?: string, properties?: Record<string, unknown>): void {
		if (!this.posthog) {
			this.init();
		}

		if (this.posthog) {
			this.posthog.capture("$pageview", {
				page: pageName || window.location.pathname,
				...properties,
			});
		}
	}

	/**
	 * Set user properties for analytics tracking
	 * @param properties - Key-value pairs of user properties to set
	 * @returns void
	 */
	setUserProperties(properties: Record<string, unknown>): void {
		if (this.posthog) {
			this.posthog.people.set(properties);
		}
	}

	/**
	 * Track when an evaluation is started
	 * @param userId - ID of the user starting the evaluation
	 * @param contentPackId - Optional content pack ID being used
	 * @returns void
	 */
	trackEvaluationStarted(userId: string, contentPackId?: string): void {
		this.track("evaluation_started", {
			content_pack_id: contentPackId,
			user_id: userId,
		});
	}

	/**
	 * Track when an evaluation is completed
	 * @param userId - ID of the user who completed the evaluation
	 * @param result - Evaluation result data including scores and metrics
	 * @param contentPackId - Optional content pack ID that was used
	 * @returns void
	 */
	trackEvaluationCompleted(
		userId: string,
		result: {
			score: number;
			categories: Record<string, number>;
			duration: number;
			word_count: number;
		},
		contentPackId?: string,
	): void {
		this.track("evaluation_completed", {
			categories: result.categories,
			content_pack_id: contentPackId,
			duration: result.duration,
			score: result.score,
			user_id: userId,
			word_count: result.word_count,
		});
	}

	/**
	 * Track when an evaluation fails
	 * @param userId - ID of the user whose evaluation failed
	 * @param error - Error message describing the failure
	 * @param contentPackId - Optional content pack ID that was being used
	 * @returns void
	 */
	trackEvaluationFailed(
		userId: string,
		error: string,
		contentPackId?: string,
	): void {
		this.track("evaluation_failed", {
			content_pack_id: contentPackId,
			error,
			user_id: userId,
		});
	}

	/**
	 * Track user login events
	 * @param method - Authentication method used for login
	 * @returns void
	 */
	trackLogin(method: "magic_link" | "email" | "oauth"): void {
		this.track("user_login", {
			method,
		});
	}

	/**
	 * Track user logout events
	 * @returns void
	 */
	trackLogout(): void {
		this.track("user_logout");
	}

	/**
	 * Track user signup events
	 * @param method - Authentication method used for signup
	 * @returns void
	 */
	trackSignup(method: "magic_link" | "email" | "oauth"): void {
		this.track("user_signup", {
			method,
		});
	}

	/**
	 * Track when a content pack is loaded
	 * @param packId - ID of the content pack that was loaded
	 * @param version - Version of the content pack
	 * @returns void
	 */
	trackContentPackLoaded(packId: string, version: string): void {
		this.track("content_pack_loaded", {
			pack_id: packId,
			version,
		});
	}

	/**
	 * Track when a content pack is uploaded
	 * @param packId - ID of the content pack that was uploaded
	 * @param version - Version of the content pack
	 * @param success - Whether the upload was successful
	 * @returns void
	 */
	trackContentPackUploaded(
		packId: string,
		version: string,
		success: boolean,
	): void {
		this.track("content_pack_uploaded", {
			pack_id: packId,
			success,
			version,
		});
	}

	/**
	 * Track button click events
	 * @param buttonName - Name/identifier of the button that was clicked
	 * @param location - Optional location context where the button was clicked
	 * @returns void
	 */
	trackButtonClick(buttonName: string, location?: string): void {
		this.track("button_clicked", {
			button_name: buttonName,
			location,
		});
	}

	/**
	 * Track form submission events
	 * @param formName - Name/identifier of the form that was submitted
	 * @param success - Whether the form submission was successful
	 * @returns void
	 */
	trackFormSubmission(formName: string, success: boolean): void {
		this.track("form_submitted", {
			form_name: formName,
			success,
		});
	}

	/**
	 * Track modal open events
	 * @param modalName - Name/identifier of the modal that was opened
	 * @returns void
	 */
	trackModalOpened(modalName: string): void {
		this.track("modal_opened", {
			modal_name: modalName,
		});
	}

	/**
	 * Track modal close events
	 * @param modalName - Name/identifier of the modal that was closed
	 * @returns void
	 */
	trackModalClosed(modalName: string): void {
		this.track("modal_closed", {
			modal_name: modalName,
		});
	}

	/**
	 * Track page load performance events
	 * @param pageName - Name of the page that was loaded
	 * @param loadTime - Time taken to load the page in milliseconds
	 * @returns void
	 */
	trackPageLoad(pageName: string, loadTime: number): void {
		this.track("page_load", {
			load_time: loadTime,
			page_name: pageName,
		});
	}

	/**
	 * Track API call performance events
	 * @param endpoint - API endpoint that was called
	 * @param duration - Duration of the API call in milliseconds
	 * @param success - Whether the API call was successful
	 * @returns void
	 */
	trackApiCall(endpoint: string, duration: number, success: boolean): void {
		this.track("api_call", {
			duration,
			endpoint,
			success,
		});
	}

	/**
	 * Track error events
	 * @param error - Error message or description
	 * @param context - Optional context data about the error
	 * @returns void
	 */
	trackError(error: string, context?: Record<string, unknown>): void {
		this.track("error_occurred", {
			context,
			error,
		});
	}

	/**
	 * Track subscription creation events
	 * @param plan - Name of the subscription plan
	 * @param amount - Amount of the subscription in cents
	 * @returns void
	 */
	trackSubscriptionCreated(plan: string, amount: number): void {
		this.track("subscription_created", {
			amount,
			plan,
		});
	}

	/**
	 * Track subscription cancellation events
	 * @param plan - Name of the subscription plan that was cancelled
	 * @returns void
	 */
	trackSubscriptionCancelled(plan: string): void {
		this.track("subscription_cancelled", {
			plan,
		});
	}

	/**
	 * Track trial start events
	 * @param plan - Name of the trial plan that was started
	 * @returns void
	 */
	trackTrialStarted(plan: string): void {
		this.track("trial_started", {
			plan,
		});
	}

	/**
	 * Track trial end events
	 * @param plan - Name of the trial plan that ended
	 * @param converted - Whether the user converted to a paid plan
	 * @returns void
	 */
	trackTrialEnded(plan: string, converted: boolean): void {
		this.track("trial_ended", {
			converted,
			plan,
		});
	}
}

// Export singleton instance
export const analytics = new AnalyticsService();

/**
 * React hook for analytics
 * Provides bound analytics methods for use in React components
 * @returns Object containing bound analytics methods
 */
export function useAnalytics() {
	return {
		identify: analytics.identify.bind(analytics),
		reset: analytics.reset.bind(analytics),
		setUserProperties: analytics.setUserProperties.bind(analytics),
		track: analytics.track.bind(analytics),
		trackPageView: analytics.trackPageView.bind(analytics),
	};
}

/**
 * Analytics event constants
 */
export const ANALYTICS_EVENTS = {
	API_CALL: "api_call",

	// UI events
	BUTTON_CLICKED: "button_clicked",

	// Content events
	CONTENT_PACK_LOADED: "content_pack_loaded",
	CONTENT_PACK_UPLOADED: "content_pack_uploaded",

	// Error events
	ERROR_OCCURRED: "error_occurred",
	EVALUATION_COMPLETED: "evaluation_completed",
	EVALUATION_FAILED: "evaluation_failed",

	// Evaluation events
	EVALUATION_STARTED: "evaluation_started",
	FORM_SUBMITTED: "form_submitted",
	MODAL_CLOSED: "modal_closed",
	MODAL_OPENED: "modal_opened",

	// Performance events
	PAGE_LOAD: "page_load",
	SUBSCRIPTION_CANCELLED: "subscription_cancelled",

	// Business events
	SUBSCRIPTION_CREATED: "subscription_created",
	TRIAL_ENDED: "trial_ended",
	TRIAL_STARTED: "trial_started",
	// User events
	USER_LOGIN: "user_login",
	USER_LOGOUT: "user_logout",
	USER_SIGNUP: "user_signup",
} as const;

/**
 * Initialize analytics on app start
 * Should be called once when the application starts
 * @returns void
 */
export function initializeAnalytics(): void {
	if (typeof window !== "undefined") {
		analytics.init();
	}
}
