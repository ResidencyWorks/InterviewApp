import { z } from "zod";

/**
 * Event context schema
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
 * Type export
 */
export type EventContext = z.infer<typeof EventContextSchema>;

/**
 * Event context builder
 */
export class EventContextBuilder {
	private context: Partial<EventContext>;

	constructor() {
		this.context = {
			timestamp: new Date(),
		};
	}

	/**
	 * Set user ID
	 */
	setUser(userId: string): EventContextBuilder {
		this.context.userId = userId;
		return this;
	}

	/**
	 * Set session ID
	 */
	setSession(sessionId: string): EventContextBuilder {
		this.context.sessionId = sessionId;
		return this;
	}

	/**
	 * Set request ID
	 */
	setRequest(requestId: string): EventContextBuilder {
		this.context.requestId = requestId;
		return this;
	}

	/**
	 * Set URL
	 */
	setUrl(url: string): EventContextBuilder {
		this.context.url = url;
		return this;
	}

	/**
	 * Set user agent
	 */
	setUserAgent(userAgent: string): EventContextBuilder {
		this.context.userAgent = userAgent;
		return this;
	}

	/**
	 * Set IP address
	 */
	setIpAddress(ipAddress: string): EventContextBuilder {
		this.context.ipAddress = ipAddress;
		return this;
	}

	/**
	 * Set metadata
	 */
	setMetadata(metadata: Record<string, unknown>): EventContextBuilder {
		this.context.metadata = metadata;
		return this;
	}

	/**
	 * Add metadata entry
	 */
	addMetadata(key: string, value: unknown): EventContextBuilder {
		if (!this.context.metadata) {
			this.context.metadata = {};
		}
		this.context.metadata[key] = value;
		return this;
	}

	/**
	 * Build the context
	 */
	build(): EventContext {
		return EventContextSchema.parse(this.context);
	}

	/**
	 * Build and validate the context
	 */
	buildAndValidate(): EventContext {
		const context = this.build();
		return EventContextSchema.parse(context);
	}
}

/**
 * Factory functions for common context types
 */
export function createUserContext(
	userId: string,
	sessionId?: string,
): EventContextBuilder {
	const builder = new EventContextBuilder().setUser(userId);

	if (sessionId) {
		builder.setSession(sessionId);
	}

	return builder;
}

export function createRequestContext(
	requestId: string,
	url?: string,
	userAgent?: string,
	ipAddress?: string,
): EventContextBuilder {
	const builder = new EventContextBuilder().setRequest(requestId);

	if (url) {
		builder.setUrl(url);
	}

	if (userAgent) {
		builder.setUserAgent(userAgent);
	}

	if (ipAddress) {
		builder.setIpAddress(ipAddress);
	}

	return builder;
}

export function createWebContext(
	url: string,
	userAgent?: string,
	ipAddress?: string,
): EventContextBuilder {
	const builder = new EventContextBuilder().setUrl(url);

	if (userAgent) {
		builder.setUserAgent(userAgent);
	}

	if (ipAddress) {
		builder.setIpAddress(ipAddress);
	}

	return builder;
}

export function createServerContext(
	requestId: string,
	component: string,
	metadata?: Record<string, unknown>,
): EventContextBuilder {
	const builder = new EventContextBuilder()
		.setRequest(requestId)
		.addMetadata("component", component);

	if (metadata) {
		builder.setMetadata(metadata);
	}

	return builder;
}

/**
 * Helper function to extract context from request headers
 */
export function extractContextFromHeaders(
	headers: Record<string, string | string[] | undefined>,
): EventContextBuilder {
	const builder = new EventContextBuilder();

	// Extract common headers
	const userAgent = headers["user-agent"];
	if (userAgent && typeof userAgent === "string") {
		builder.setUserAgent(userAgent);
	}

	const xForwardedFor = headers["x-forwarded-for"];
	if (xForwardedFor && typeof xForwardedFor === "string") {
		// Take the first IP address if there are multiple
		const ipAddress = xForwardedFor.split(",")[0].trim();
		builder.setIpAddress(ipAddress);
	}

	const xRealIp = headers["x-real-ip"];
	if (xRealIp && typeof xRealIp === "string") {
		builder.setIpAddress(xRealIp);
	}

	const referer = headers.referer;
	if (referer && typeof referer === "string") {
		builder.setUrl(referer);
	}

	return builder;
}

/**
 * Helper function to create context from current request
 */
export function createContextFromRequest(
	request: Request,
): EventContextBuilder {
	const builder = new EventContextBuilder().setUrl(request.url);

	// Extract headers
	const headers: Record<string, string> = {};
	request.headers.forEach((value, key) => {
		headers[key] = value;
	});

	const headerBuilder = extractContextFromHeaders(headers);
	const headerContext = headerBuilder.build();

	if (headerContext.userAgent) {
		builder.setUserAgent(headerContext.userAgent);
	}

	if (headerContext.ipAddress) {
		builder.setIpAddress(headerContext.ipAddress);
	}

	return builder;
}
