import { z } from "zod";

/**
 * Analytics event types
 */
export const AnalyticsEventTypeSchema = z.enum([
	"drill_started",
	"drill_submitted",
	"score_returned",
	"content_pack_loaded",
	"user_login",
	"user_logout",
	"page_view",
	"button_click",
	"form_submit",
	"error_occurred",
]);

/**
 * Analytics event context schema
 */
export const EventContextSchema = z.object({
	userId: z.uuid().optional(),
	sessionId: z.string().optional(),
	requestId: z.string().optional(),
	url: z.url().optional(),
	userAgent: z.string().optional(),
	ipAddress: z.string().optional(),
	timestamp: z.date().default(() => new Date()),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Analytics event schema
 */
export const AnalyticsEventSchema = z.object({
	id: z.uuid(),
	type: AnalyticsEventTypeSchema,
	name: z.string().min(1),
	properties: z.record(z.string(), z.unknown()).optional(),
	context: EventContextSchema,
	timestamp: z.date().default(() => new Date()),
	distinctId: z.string().optional(),
	groupId: z.string().optional(),
});

/**
 * Type exports
 */
export type AnalyticsEventType = z.infer<typeof AnalyticsEventTypeSchema>;
export type EventContext = z.infer<typeof EventContextSchema>;
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

/**
 * Analytics event builder
 */
export class AnalyticsEventBuilder {
	private event: Partial<AnalyticsEvent>;

	constructor(type: AnalyticsEventType, name: string) {
		this.event = {
			id: crypto.randomUUID(),
			type,
			name,
			timestamp: new Date(),
			context: {
				timestamp: new Date(),
			},
		};
	}

	/**
	 * Set event properties
	 */
	setProperties(properties: Record<string, unknown>): AnalyticsEventBuilder {
		this.event.properties = properties;
		return this;
	}

	/**
	 * Add a single property
	 */
	addProperty(key: string, value: unknown): AnalyticsEventBuilder {
		if (!this.event.properties) {
			this.event.properties = {};
		}
		this.event.properties[key] = value;
		return this;
	}

	/**
	 * Set user context
	 */
	setUser(userId: string): AnalyticsEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.userId = userId;
		this.event.distinctId = userId;
		return this;
	}

	/**
	 * Set session context
	 */
	setSession(sessionId: string): AnalyticsEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.sessionId = sessionId;
		return this;
	}

	/**
	 * Set request context
	 */
	setRequest(requestId: string): AnalyticsEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.requestId = requestId;
		return this;
	}

	/**
	 * Set URL context
	 */
	setUrl(url: string): AnalyticsEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.url = url;
		return this;
	}

	/**
	 * Set user agent context
	 */
	setUserAgent(userAgent: string): AnalyticsEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.userAgent = userAgent;
		return this;
	}

	/**
	 * Set IP address context
	 */
	setIpAddress(ipAddress: string): AnalyticsEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.ipAddress = ipAddress;
		return this;
	}

	/**
	 * Set metadata
	 */
	setMetadata(metadata: Record<string, unknown>): AnalyticsEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.metadata = metadata;
		return this;
	}

	/**
	 * Set group ID
	 */
	setGroup(groupId: string): AnalyticsEventBuilder {
		this.event.groupId = groupId;
		return this;
	}

	/**
	 * Build the event
	 */
	build(): AnalyticsEvent {
		return AnalyticsEventSchema.parse(this.event);
	}

	/**
	 * Build and validate the event
	 */
	buildAndValidate(): AnalyticsEvent {
		const event = this.build();
		return AnalyticsEventSchema.parse(event);
	}
}

/**
 * Factory functions for common event types
 */
export function createDrillStartedEvent(
	drillId: string,
	userId?: string,
): AnalyticsEventBuilder {
	const builder = new AnalyticsEventBuilder(
		"drill_started",
		"Drill Started",
	).addProperty("drillId", drillId);

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}

export function createDrillSubmittedEvent(
	drillId: string,
	score: number,
	userId?: string,
): AnalyticsEventBuilder {
	const builder = new AnalyticsEventBuilder(
		"drill_submitted",
		"Drill Submitted",
	)
		.addProperty("drillId", drillId)
		.addProperty("score", score);

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}

export function createScoreReturnedEvent(
	drillId: string,
	score: number,
	feedback: string,
	userId?: string,
): AnalyticsEventBuilder {
	const builder = new AnalyticsEventBuilder("score_returned", "Score Returned")
		.addProperty("drillId", drillId)
		.addProperty("score", score)
		.addProperty("feedback", feedback);

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}

export function createContentPackLoadedEvent(
	packId: string,
	userId?: string,
): AnalyticsEventBuilder {
	const builder = new AnalyticsEventBuilder(
		"content_pack_loaded",
		"Content Pack Loaded",
	).addProperty("packId", packId);

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}

export function createUserLoginEvent(
	userId: string,
	method: string = "email",
): AnalyticsEventBuilder {
	return new AnalyticsEventBuilder("user_login", "User Login")
		.setUser(userId)
		.addProperty("method", method);
}

export function createUserLogoutEvent(userId: string): AnalyticsEventBuilder {
	return new AnalyticsEventBuilder("user_logout", "User Logout").setUser(
		userId,
	);
}

export function createPageViewEvent(
	page: string,
	userId?: string,
): AnalyticsEventBuilder {
	const builder = new AnalyticsEventBuilder(
		"page_view",
		"Page View",
	).addProperty("page", page);

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}

export function createButtonClickEvent(
	buttonName: string,
	page: string,
	userId?: string,
): AnalyticsEventBuilder {
	const builder = new AnalyticsEventBuilder("button_click", "Button Click")
		.addProperty("buttonName", buttonName)
		.addProperty("page", page);

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}

export function createFormSubmitEvent(
	formName: string,
	page: string,
	userId?: string,
): AnalyticsEventBuilder {
	const builder = new AnalyticsEventBuilder("form_submit", "Form Submit")
		.addProperty("formName", formName)
		.addProperty("page", page);

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}

export function createErrorEvent(
	errorMessage: string,
	errorCode: string,
	page: string,
	userId?: string,
): AnalyticsEventBuilder {
	const builder = new AnalyticsEventBuilder("error_occurred", "Error Occurred")
		.addProperty("errorMessage", errorMessage)
		.addProperty("errorCode", errorCode)
		.addProperty("page", page);

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}
