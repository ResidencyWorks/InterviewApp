import { z } from "zod";
import {
	type AnalyticsEvent,
	AnalyticsEventSchema,
	type AnalyticsEventType,
	AnalyticsEventTypeSchema,
} from "../../domain/entities/AnalyticsEvent";
import {
	type ErrorCategory,
	ErrorCategorySchema,
	type ErrorEvent,
	ErrorEventSchema,
	type ErrorSeverity,
	ErrorSeveritySchema,
} from "../../domain/entities/ErrorEvent";
import {
	type EventContext,
	EventContextSchema,
} from "../../domain/entities/EventContext";

/**
 * Event validation result
 */
export interface EventValidationResult<T> {
	success: boolean;
	data?: T;
	errors?: z.ZodError;
}

/**
 * Event validator interface
 */
export interface IEventValidator<T> {
	validate(data: unknown): EventValidationResult<T>;
	isValid(data: unknown): boolean;
	getValidationErrors(data: unknown): z.ZodError | null;
}

/**
 * Analytics event validator
 */
class AnalyticsEventValidator implements IEventValidator<AnalyticsEvent> {
	validate(data: unknown): EventValidationResult<AnalyticsEvent> {
		try {
			const validatedData = AnalyticsEventSchema.parse(data);
			return {
				success: true,
				data: validatedData,
			};
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					success: false,
					errors: error,
				};
			}
			throw error;
		}
	}

	isValid(data: unknown): boolean {
		return AnalyticsEventSchema.safeParse(data).success;
	}

	getValidationErrors(data: unknown): z.ZodError | null {
		const result = AnalyticsEventSchema.safeParse(data);
		return result.success ? null : result.error;
	}
}

/**
 * Error event validator
 */
class ErrorEventValidator implements IEventValidator<ErrorEvent> {
	validate(data: unknown): EventValidationResult<ErrorEvent> {
		try {
			const validatedData = ErrorEventSchema.parse(data);
			return {
				success: true,
				data: validatedData,
			};
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					success: false,
					errors: error,
				};
			}
			throw error;
		}
	}

	isValid(data: unknown): boolean {
		return ErrorEventSchema.safeParse(data).success;
	}

	getValidationErrors(data: unknown): z.ZodError | null {
		const result = ErrorEventSchema.safeParse(data);
		return result.success ? null : result.error;
	}
}

/**
 * Event context validator
 */
class EventContextValidator implements IEventValidator<EventContext> {
	validate(data: unknown): EventValidationResult<EventContext> {
		try {
			const validatedData = EventContextSchema.parse(data);
			return {
				success: true,
				data: validatedData,
			};
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					success: false,
					errors: error,
				};
			}
			throw error;
		}
	}

	isValid(data: unknown): boolean {
		return EventContextSchema.safeParse(data).success;
	}

	getValidationErrors(data: unknown): z.ZodError | null {
		const result = EventContextSchema.safeParse(data);
		return result.success ? null : result.error;
	}
}

/**
 * Event type validators
 */
export function validateAnalyticsEventType(
	type: unknown,
): type is AnalyticsEventType {
	return AnalyticsEventTypeSchema.safeParse(type).success;
}

export function validateErrorSeverity(
	severity: unknown,
): severity is ErrorSeverity {
	return ErrorSeveritySchema.safeParse(severity).success;
}

export function validateErrorCategory(
	category: unknown,
): category is ErrorCategory {
	return ErrorCategorySchema.safeParse(category).success;
}

/**
 * Event validation service
 */
class EventValidationService {
	private static instance: EventValidationService;
	private analyticsValidator: AnalyticsEventValidator;
	private errorValidator: ErrorEventValidator;
	private contextValidator: EventContextValidator;

	private constructor() {
		this.analyticsValidator = new AnalyticsEventValidator();
		this.errorValidator = new ErrorEventValidator();
		this.contextValidator = new EventContextValidator();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): EventValidationService {
		if (!EventValidationService.instance) {
			EventValidationService.instance = new EventValidationService();
		}
		return EventValidationService.instance;
	}

	/**
	 * Validate analytics event
	 */
	public validateAnalyticsEvent(
		data: unknown,
	): EventValidationResult<AnalyticsEvent> {
		return this.analyticsValidator.validate(data);
	}

	/**
	 * Validate error event
	 */
	public validateErrorEvent(data: unknown): EventValidationResult<ErrorEvent> {
		return this.errorValidator.validate(data);
	}

	/**
	 * Validate event context
	 */
	public validateEventContext(
		data: unknown,
	): EventValidationResult<EventContext> {
		return this.contextValidator.validate(data);
	}

	/**
	 * Check if analytics event is valid
	 */
	public isAnalyticsEventValid(data: unknown): boolean {
		return this.analyticsValidator.isValid(data);
	}

	/**
	 * Check if error event is valid
	 */
	public isErrorEventValid(data: unknown): boolean {
		return this.errorValidator.isValid(data);
	}

	/**
	 * Check if event context is valid
	 */
	public isEventContextValid(data: unknown): boolean {
		return this.contextValidator.isValid(data);
	}

	/**
	 * Get analytics event validation errors
	 */
	public getAnalyticsEventValidationErrors(data: unknown): z.ZodError | null {
		return this.analyticsValidator.getValidationErrors(data);
	}

	/**
	 * Get error event validation errors
	 */
	public getErrorEventValidationErrors(data: unknown): z.ZodError | null {
		return this.errorValidator.getValidationErrors(data);
	}

	/**
	 * Get event context validation errors
	 */
	public getEventContextValidationErrors(data: unknown): z.ZodError | null {
		return this.contextValidator.getValidationErrors(data);
	}

	/**
	 * Validate and sanitize analytics event
	 */
	public validateAndSanitizeAnalyticsEvent(data: unknown): AnalyticsEvent {
		const result = this.validateAnalyticsEvent(data);
		if (!result.success || !result.data) {
			throw new Error(
				`Analytics event validation failed: ${result.errors?.message || "Unknown error"}`,
			);
		}
		return result.data;
	}

	/**
	 * Validate and sanitize error event
	 */
	public validateAndSanitizeErrorEvent(data: unknown): ErrorEvent {
		const result = this.validateErrorEvent(data);
		if (!result.success || !result.data) {
			throw new Error(
				`Error event validation failed: ${result.errors?.message || "Unknown error"}`,
			);
		}
		return result.data;
	}

	/**
	 * Validate and sanitize event context
	 */
	public validateAndSanitizeEventContext(data: unknown): EventContext {
		const result = this.validateEventContext(data);
		if (!result.success || !result.data) {
			throw new Error(
				`Event context validation failed: ${result.errors?.message || "Unknown error"}`,
			);
		}
		return result.data;
	}

	/**
	 * Batch validate analytics events
	 */
	public validateAnalyticsEvents(events: unknown[]): {
		valid: AnalyticsEvent[];
		invalid: { data: unknown; errors: z.ZodError }[];
	} {
		const valid: AnalyticsEvent[] = [];
		const invalid: { data: unknown; errors: z.ZodError }[] = [];

		for (const event of events) {
			const result = this.validateAnalyticsEvent(event);
			if (result.success && result.data) {
				valid.push(result.data);
			} else if (result.errors) {
				invalid.push({ data: event, errors: result.errors });
			}
		}

		return { valid, invalid };
	}

	/**
	 * Batch validate error events
	 */
	public validateErrorEvents(events: unknown[]): {
		valid: ErrorEvent[];
		invalid: { data: unknown; errors: z.ZodError }[];
	} {
		const valid: ErrorEvent[] = [];
		const invalid: { data: unknown; errors: z.ZodError }[] = [];

		for (const event of events) {
			const result = this.validateErrorEvent(event);
			if (result.success && result.data) {
				valid.push(result.data);
			} else if (result.errors) {
				invalid.push({ data: event, errors: result.errors });
			}
		}

		return { valid, invalid };
	}
}

/**
 * Convenience functions
 */
export function validateAnalyticsEvent(
	data: unknown,
): EventValidationResult<AnalyticsEvent> {
	return EventValidationService.getInstance().validateAnalyticsEvent(data);
}

export function validateErrorEvent(
	data: unknown,
): EventValidationResult<ErrorEvent> {
	return EventValidationService.getInstance().validateErrorEvent(data);
}

export function validateEventContext(
	data: unknown,
): EventValidationResult<EventContext> {
	return EventValidationService.getInstance().validateEventContext(data);
}

export function isAnalyticsEventValid(data: unknown): boolean {
	return EventValidationService.getInstance().isAnalyticsEventValid(data);
}

export function isErrorEventValid(data: unknown): boolean {
	return EventValidationService.getInstance().isErrorEventValid(data);
}

export function isEventContextValid(data: unknown): boolean {
	return EventValidationService.getInstance().isEventContextValid(data);
}

export function getAnalyticsEventValidationErrors(
	data: unknown,
): z.ZodError | null {
	return EventValidationService.getInstance().getAnalyticsEventValidationErrors(
		data,
	);
}

export function getErrorEventValidationErrors(
	data: unknown,
): z.ZodError | null {
	return EventValidationService.getInstance().getErrorEventValidationErrors(
		data,
	);
}

export function getEventContextValidationErrors(
	data: unknown,
): z.ZodError | null {
	return EventValidationService.getInstance().getEventContextValidationErrors(
		data,
	);
}

export function validateAndSanitizeAnalyticsEvent(
	data: unknown,
): AnalyticsEvent {
	return EventValidationService.getInstance().validateAndSanitizeAnalyticsEvent(
		data,
	);
}

export function validateAndSanitizeErrorEvent(data: unknown): ErrorEvent {
	return EventValidationService.getInstance().validateAndSanitizeErrorEvent(
		data,
	);
}

export function validateAndSanitizeEventContext(data: unknown): EventContext {
	return EventValidationService.getInstance().validateAndSanitizeEventContext(
		data,
	);
}

/**
 * Export validators
 */
export {
	AnalyticsEventValidator,
	ErrorEventValidator,
	EventContextValidator,
	EventValidationService,
};
