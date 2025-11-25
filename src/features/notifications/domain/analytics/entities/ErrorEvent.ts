import { z } from "zod";

/**
 * Error severity levels
 */
export const ErrorSeveritySchema = z.enum([
	"CRITICAL",
	"ERROR",
	"WARNING",
	"INFO",
	"DEBUG",
]);

/**
 * Error categories
 */
export const ErrorCategorySchema = z.enum([
	"CLIENT_ERROR",
	"SERVER_ERROR",
	"NETWORK_ERROR",
	"VALIDATION_ERROR",
	"AUTHENTICATION_ERROR",
	"AUTHORIZATION_ERROR",
	"RATE_LIMIT_ERROR",
	"EXTERNAL_SERVICE_ERROR",
	"DATABASE_ERROR",
	"FILE_SYSTEM_ERROR",
	"CONFIGURATION_ERROR",
	"UNKNOWN_ERROR",
]);

/**
 * Error context schema
 */
export const ErrorContextSchema = z.object({
	userId: z.uuid().optional(),
	sessionId: z.string().optional(),
	requestId: z.string().optional(),
	url: z.url().optional(),
	userAgent: z.string().optional(),
	ipAddress: z.string().optional(),
	component: z.string().optional(),
	action: z.string().optional(),
	lineNumber: z.number().int().positive().optional(),
	columnNumber: z.number().int().positive().optional(),
	fileName: z.string().optional(),
	functionName: z.string().optional(),
	timestamp: z.date().default(() => new Date()),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Error event schema
 */
export const ErrorEventSchema = z.object({
	id: z.uuid(),
	message: z.string().min(1),
	stack: z.string().optional(),
	severity: ErrorSeveritySchema,
	category: ErrorCategorySchema,
	context: ErrorContextSchema,
	tags: z.record(z.string(), z.string()).optional(),
	fingerprint: z.string().optional(),
	timestamp: z.date().default(() => new Date()),
	release: z.string().optional(),
	environment: z.string().optional(),
});

/**
 * Type exports
 */
export type ErrorSeverity = z.infer<typeof ErrorSeveritySchema>;
export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;
export type ErrorContext = z.infer<typeof ErrorContextSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

/**
 * Error event builder
 */
export class ErrorEventBuilder {
	private event: Partial<ErrorEvent>;

	constructor(
		message: string,
		severity: ErrorSeverity,
		category: ErrorCategory,
	) {
		this.event = {
			id: crypto.randomUUID(),
			message,
			severity,
			category,
			timestamp: new Date(),
			context: {
				timestamp: new Date(),
			},
		};
	}

	/**
	 * Set stack trace
	 */
	setStack(stack: string): ErrorEventBuilder {
		this.event.stack = stack;
		return this;
	}

	/**
	 * Set user context
	 */
	setUser(userId: string): ErrorEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.userId = userId;
		return this;
	}

	/**
	 * Set session context
	 */
	setSession(sessionId: string): ErrorEventBuilder {
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
	setRequest(requestId: string): ErrorEventBuilder {
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
	setUrl(url: string): ErrorEventBuilder {
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
	setUserAgent(userAgent: string): ErrorEventBuilder {
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
	setIpAddress(ipAddress: string): ErrorEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.ipAddress = ipAddress;
		return this;
	}

	/**
	 * Set component context
	 */
	setComponent(component: string): ErrorEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.component = component;
		return this;
	}

	/**
	 * Set action context
	 */
	setAction(action: string): ErrorEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.action = action;
		return this;
	}

	/**
	 * Set source location context
	 */
	setSourceLocation(
		fileName: string,
		lineNumber: number,
		columnNumber?: number,
		functionName?: string,
	): ErrorEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.fileName = fileName;
		this.event.context.lineNumber = lineNumber;
		if (columnNumber !== undefined) {
			this.event.context.columnNumber = columnNumber;
		}
		if (functionName !== undefined) {
			this.event.context.functionName = functionName;
		}
		return this;
	}

	/**
	 * Set metadata
	 */
	setMetadata(metadata: Record<string, unknown>): ErrorEventBuilder {
		if (!this.event.context) {
			this.event.context = {
				timestamp: new Date(),
			};
		}
		this.event.context.metadata = metadata;
		return this;
	}

	/**
	 * Set tags
	 */
	setTags(tags: Record<string, string>): ErrorEventBuilder {
		this.event.tags = tags;
		return this;
	}

	/**
	 * Add a tag
	 */
	addTag(key: string, value: string): ErrorEventBuilder {
		if (!this.event.tags) {
			this.event.tags = {};
		}
		this.event.tags[key] = value;
		return this;
	}

	/**
	 * Set fingerprint for error grouping
	 */
	setFingerprint(fingerprint: string): ErrorEventBuilder {
		this.event.fingerprint = fingerprint;
		return this;
	}

	/**
	 * Set release version
	 */
	setRelease(release: string): ErrorEventBuilder {
		this.event.release = release;
		return this;
	}

	/**
	 * Set environment
	 */
	setEnvironment(environment: string): ErrorEventBuilder {
		this.event.environment = environment;
		return this;
	}

	/**
	 * Build the error event
	 */
	build(): ErrorEvent {
		return ErrorEventSchema.parse(this.event);
	}

	/**
	 * Build and validate the error event
	 */
	buildAndValidate(): ErrorEvent {
		const event = this.build();
		return ErrorEventSchema.parse(event);
	}
}

/**
 * Factory functions for common error types
 */
export function createClientErrorEvent(
	message: string,
	component: string,
	userId?: string,
): ErrorEventBuilder {
	const builder = new ErrorEventBuilder(
		message,
		"ERROR",
		"CLIENT_ERROR",
	).setComponent(component);

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}

export function createServerErrorEvent(
	message: string,
	component: string,
	requestId?: string,
): ErrorEventBuilder {
	const builder = new ErrorEventBuilder(
		message,
		"ERROR",
		"SERVER_ERROR",
	).setComponent(component);

	if (requestId) {
		builder.setRequest(requestId);
	}

	return builder;
}

export function createNetworkErrorEvent(
	message: string,
	url: string,
	requestId?: string,
): ErrorEventBuilder {
	const builder = new ErrorEventBuilder(
		message,
		"ERROR",
		"NETWORK_ERROR",
	).setUrl(url);

	if (requestId) {
		builder.setRequest(requestId);
	}

	return builder;
}

export function createValidationErrorEvent(
	message: string,
	component: string,
	userId?: string,
): ErrorEventBuilder {
	const builder = new ErrorEventBuilder(
		message,
		"WARNING",
		"VALIDATION_ERROR",
	).setComponent(component);

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}

export function createAuthenticationErrorEvent(
	message: string,
	userId?: string,
): ErrorEventBuilder {
	const builder = new ErrorEventBuilder(
		message,
		"WARNING",
		"AUTHENTICATION_ERROR",
	).setComponent("auth");

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}

export function createAuthorizationErrorEvent(
	message: string,
	userId?: string,
): ErrorEventBuilder {
	const builder = new ErrorEventBuilder(
		message,
		"WARNING",
		"AUTHORIZATION_ERROR",
	).setComponent("auth");

	if (userId) {
		builder.setUser(userId);
	}

	return builder;
}

export function createRateLimitErrorEvent(
	message: string,
	requestId?: string,
): ErrorEventBuilder {
	const builder = new ErrorEventBuilder(
		message,
		"WARNING",
		"RATE_LIMIT_ERROR",
	).setComponent("rate-limiter");

	if (requestId) {
		builder.setRequest(requestId);
	}

	return builder;
}

export function createExternalServiceErrorEvent(
	message: string,
	service: string,
	requestId?: string,
): ErrorEventBuilder {
	const builder = new ErrorEventBuilder(
		message,
		"ERROR",
		"EXTERNAL_SERVICE_ERROR",
	)
		.setComponent(service)
		.addTag("service", service);

	if (requestId) {
		builder.setRequest(requestId);
	}

	return builder;
}

export function createDatabaseErrorEvent(
	message: string,
	operation: string,
	requestId?: string,
): ErrorEventBuilder {
	const builder = new ErrorEventBuilder(message, "ERROR", "DATABASE_ERROR")
		.setComponent("database")
		.addTag("operation", operation);

	if (requestId) {
		builder.setRequest(requestId);
	}

	return builder;
}

export function createCriticalErrorEvent(
	message: string,
	component: string,
	requestId?: string,
): ErrorEventBuilder {
	const builder = new ErrorEventBuilder(
		message,
		"CRITICAL",
		"SERVER_ERROR",
	).setComponent(component);

	if (requestId) {
		builder.setRequest(requestId);
	}

	return builder;
}

/**
 * Helper function to create error event from JavaScript Error
 */
export function createErrorEventFromError(
	error: Error,
	category: ErrorCategory = "UNKNOWN_ERROR",
	context?: Partial<ErrorContext>,
): ErrorEventBuilder {
	const builder = new ErrorEventBuilder(
		error.message,
		"ERROR",
		category,
	).setStack(error.stack || "");

	if (context) {
		if (context.userId) builder.setUser(context.userId);
		if (context.sessionId) builder.setSession(context.sessionId);
		if (context.requestId) builder.setRequest(context.requestId);
		if (context.url) builder.setUrl(context.url);
		if (context.userAgent) builder.setUserAgent(context.userAgent);
		if (context.ipAddress) builder.setIpAddress(context.ipAddress);
		if (context.component) builder.setComponent(context.component);
		if (context.action) builder.setAction(context.action);
		if (context.fileName && context.lineNumber) {
			builder.setSourceLocation(
				context.fileName,
				context.lineNumber,
				context.columnNumber,
				context.functionName,
			);
		}
		if (context.metadata) builder.setMetadata(context.metadata);
	}

	return builder;
}
