import type {
	ErrorCategory,
	ErrorEvent,
	ErrorSeverity,
} from "@/features/notifications/domain/analytics/entities/ErrorEvent";

/**
 * Error classification result
 */
export interface ErrorClassificationResult {
	severity: ErrorSeverity;
	category: ErrorCategory;
	shouldReport: boolean;
	shouldAlert: boolean;
	fingerprint: string;
	tags: Record<string, string>;
}

/**
 * Error classification rule
 */
export interface ErrorClassificationRule {
	name: string;
	condition: (error: ErrorEvent) => boolean;
	classification: Partial<ErrorClassificationResult>;
	priority: number; // Higher priority rules are applied first
}

/**
 * Error classifier interface
 */
export interface IErrorClassifier {
	classify(error: ErrorEvent): ErrorClassificationResult;
	addRule(rule: ErrorClassificationRule): void;
	removeRule(name: string): void;
	getRules(): ErrorClassificationRule[];
	clearRules(): void;
}

/**
 * Default error classification rules
 */
export const DEFAULT_ERROR_CLASSIFICATION_RULES: ErrorClassificationRule[] = [
	{
		name: "critical_database_error",
		condition: (error) =>
			error.category === "DATABASE_ERROR" &&
			error.message.toLowerCase().includes("connection"),
		classification: {
			severity: "CRITICAL",
			shouldReport: true,
			shouldAlert: true,
		},
		priority: 100,
	},
	{
		name: "authentication_failure",
		condition: (error) =>
			error.category === "AUTHENTICATION_ERROR" ||
			error.message.toLowerCase().includes("unauthorized"),
		classification: {
			severity: "WARNING",
			shouldReport: true,
			shouldAlert: false,
			tags: { type: "auth" },
		},
		priority: 90,
	},
	{
		name: "rate_limit_exceeded",
		condition: (error) =>
			error.category === "RATE_LIMIT_ERROR" ||
			error.message.toLowerCase().includes("rate limit"),
		classification: {
			severity: "WARNING",
			shouldReport: true,
			shouldAlert: false,
			tags: { type: "rate_limit" },
		},
		priority: 80,
	},
	{
		name: "validation_error",
		condition: (error) =>
			error.category === "VALIDATION_ERROR" ||
			error.message.toLowerCase().includes("validation"),
		classification: {
			severity: "WARNING",
			shouldReport: true,
			shouldAlert: false,
			tags: { type: "validation" },
		},
		priority: 70,
	},
	{
		name: "network_error",
		condition: (error) =>
			error.category === "NETWORK_ERROR" ||
			error.message.toLowerCase().includes("network") ||
			error.message.toLowerCase().includes("timeout"),
		classification: {
			severity: "ERROR",
			shouldReport: true,
			shouldAlert: false,
			tags: { type: "network" },
		},
		priority: 60,
	},
	{
		name: "external_service_error",
		condition: (error) =>
			error.category === "EXTERNAL_SERVICE_ERROR" ||
			error.message.toLowerCase().includes("external"),
		classification: {
			severity: "ERROR",
			shouldReport: true,
			shouldAlert: false,
			tags: { type: "external" },
		},
		priority: 50,
	},
	{
		name: "client_error",
		condition: (error) =>
			error.category === "CLIENT_ERROR" ||
			error.context?.component === "client",
		classification: {
			severity: "WARNING",
			shouldReport: true,
			shouldAlert: false,
			tags: { type: "client" },
		},
		priority: 40,
	},
	{
		name: "server_error",
		condition: (error) =>
			error.category === "SERVER_ERROR" ||
			error.context?.component === "server",
		classification: {
			severity: "ERROR",
			shouldReport: true,
			shouldAlert: false,
			tags: { type: "server" },
		},
		priority: 30,
	},
];

/**
 * Error classifier implementation
 */
export class ErrorClassifier implements IErrorClassifier {
	private rules: ErrorClassificationRule[] = [];

	constructor(
		rules: ErrorClassificationRule[] = DEFAULT_ERROR_CLASSIFICATION_RULES,
	) {
		this.rules = [...rules].sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Classify an error
	 */
	classify(error: ErrorEvent): ErrorClassificationResult {
		const result: ErrorClassificationResult = {
			severity: error.severity,
			category: error.category,
			shouldReport: true,
			shouldAlert: false,
			fingerprint: this.generateFingerprint(error),
			tags: { ...error.tags },
		};

		// Apply classification rules
		for (const rule of this.rules) {
			if (rule.condition(error)) {
				// Apply rule classification
				if (rule.classification.severity) {
					result.severity = rule.classification.severity;
				}
				if (rule.classification.category) {
					result.category = rule.classification.category;
				}
				if (rule.classification.shouldReport !== undefined) {
					result.shouldReport = rule.classification.shouldReport;
				}
				if (rule.classification.shouldAlert !== undefined) {
					result.shouldAlert = rule.classification.shouldAlert;
				}
				if (rule.classification.tags) {
					result.tags = { ...result.tags, ...rule.classification.tags };
				}
				if (rule.classification.fingerprint) {
					result.fingerprint = rule.classification.fingerprint;
				}
				break; // Apply only the first matching rule
			}
		}

		return result;
	}

	/**
	 * Add a classification rule
	 */
	addRule(rule: ErrorClassificationRule): void {
		this.rules.push(rule);
		this.rules.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Remove a classification rule
	 */
	removeRule(name: string): void {
		this.rules = this.rules.filter((rule) => rule.name !== name);
	}

	/**
	 * Get all classification rules
	 */
	getRules(): ErrorClassificationRule[] {
		return [...this.rules];
	}

	/**
	 * Clear all classification rules
	 */
	clearRules(): void {
		this.rules = [];
	}

	/**
	 * Generate fingerprint for error grouping
	 */
	private generateFingerprint(error: ErrorEvent): string {
		// Use existing fingerprint if available
		if (error.fingerprint) {
			return error.fingerprint;
		}

		// Generate fingerprint based on error characteristics
		const components: string[] = [];

		// Add category
		components.push(error.category);

		// Add message hash (first 50 characters)
		const messageHash = error.message.substring(0, 50).replace(/\s+/g, "_");
		components.push(messageHash);

		// Add component if available
		if (error.context?.component) {
			components.push(error.context.component);
		}

		// Add file name if available
		if (error.context?.fileName) {
			components.push(error.context.fileName);
		}

		return components.join(":");
	}
}

/**
 * Error classification utilities
 */
export class ErrorClassificationUtils {
	/**
	 * Check if error should be reported
	 */
	static shouldReport(error: ErrorEvent): boolean {
		const classifier = new ErrorClassifier();
		const classification = classifier.classify(error);
		return classification.shouldReport;
	}

	/**
	 * Check if error should trigger an alert
	 */
	static shouldAlert(error: ErrorEvent): boolean {
		const classifier = new ErrorClassifier();
		const classification = classifier.classify(error);
		return classification.shouldAlert;
	}

	/**
	 * Get error severity level
	 */
	static getSeverity(error: ErrorEvent): ErrorSeverity {
		const classifier = new ErrorClassifier();
		const classification = classifier.classify(error);
		return classification.severity;
	}

	/**
	 * Get error category
	 */
	static getCategory(error: ErrorEvent): ErrorCategory {
		const classifier = new ErrorClassifier();
		const classification = classifier.classify(error);
		return classification.category;
	}

	/**
	 * Generate error fingerprint
	 */
	static generateFingerprint(error: ErrorEvent): string {
		const classifier = new ErrorClassifier();
		const classification = classifier.classify(error);
		return classification.fingerprint;
	}

	/**
	 * Get error tags
	 */
	static getTags(error: ErrorEvent): Record<string, string> {
		const classifier = new ErrorClassifier();
		const classification = classifier.classify(error);
		return classification.tags;
	}

	/**
	 * Check if error is critical
	 */
	static isCritical(error: ErrorEvent): boolean {
		const severity = ErrorClassificationUtils.getSeverity(error);
		return severity === "CRITICAL";
	}

	/**
	 * Check if error is high severity
	 */
	static isHighSeverity(error: ErrorEvent): boolean {
		const severity = ErrorClassificationUtils.getSeverity(error);
		return severity === "CRITICAL" || severity === "ERROR";
	}

	/**
	 * Check if error is low severity
	 */
	static isLowSeverity(error: ErrorEvent): boolean {
		const severity = ErrorClassificationUtils.getSeverity(error);
		return severity === "INFO" || severity === "DEBUG";
	}

	/**
	 * Check if error is related to authentication
	 */
	static isAuthenticationError(error: ErrorEvent): boolean {
		const category = ErrorClassificationUtils.getCategory(error);
		return (
			category === "AUTHENTICATION_ERROR" || category === "AUTHORIZATION_ERROR"
		);
	}

	/**
	 * Check if error is related to network
	 */
	static isNetworkError(error: ErrorEvent): boolean {
		const category = ErrorClassificationUtils.getCategory(error);
		return (
			category === "NETWORK_ERROR" || category === "EXTERNAL_SERVICE_ERROR"
		);
	}

	/**
	 * Check if error is related to validation
	 */
	static isValidationError(error: ErrorEvent): boolean {
		const category = ErrorClassificationUtils.getCategory(error);
		return category === "VALIDATION_ERROR";
	}

	/**
	 * Check if error is related to database
	 */
	static isDatabaseError(error: ErrorEvent): boolean {
		const category = ErrorClassificationUtils.getCategory(error);
		return category === "DATABASE_ERROR";
	}

	/**
	 * Check if error is related to rate limiting
	 */
	static isRateLimitError(error: ErrorEvent): boolean {
		const category = ErrorClassificationUtils.getCategory(error);
		return category === "RATE_LIMIT_ERROR";
	}

	/**
	 * Get error priority for processing
	 */
	static getPriority(error: ErrorEvent): number {
		const severity = ErrorClassificationUtils.getSeverity(error);
		const priorityMap: Record<ErrorSeverity, number> = {
			CRITICAL: 100,
			ERROR: 80,
			WARNING: 60,
			INFO: 40,
			DEBUG: 20,
		};
		return priorityMap[severity] || 0;
	}

	/**
	 * Check if error should be retried
	 */
	static shouldRetry(error: ErrorEvent): boolean {
		const category = ErrorClassificationUtils.getCategory(error);
		const retryableCategories: ErrorCategory[] = [
			"NETWORK_ERROR",
			"EXTERNAL_SERVICE_ERROR",
			"DATABASE_ERROR",
		];
		return retryableCategories.includes(category);
	}

	/**
	 * Get retry delay for error
	 */
	static getRetryDelay(_error: ErrorEvent, attempt: number): number {
		const baseDelay = 1000; // 1 second
		const maxDelay = 30000; // 30 seconds
		const delay = baseDelay * 2 ** (attempt - 1);
		return Math.min(delay, maxDelay);
	}

	/**
	 * Get maximum retry attempts for error
	 */
	static getMaxRetryAttempts(error: ErrorEvent): number {
		const category = ErrorClassificationUtils.getCategory(error);
		const severity = ErrorClassificationUtils.getSeverity(error);

		if (severity === "CRITICAL") {
			return 5;
		}

		if (category === "NETWORK_ERROR") {
			return 3;
		}

		if (category === "EXTERNAL_SERVICE_ERROR") {
			return 2;
		}

		return 1;
	}
}

/**
 * Convenience functions
 */
export function classifyError(error: ErrorEvent): ErrorClassificationResult {
	const classifier = new ErrorClassifier();
	return classifier.classify(error);
}

export function shouldReportError(error: ErrorEvent): boolean {
	return ErrorClassificationUtils.shouldReport(error);
}

export function shouldAlertError(error: ErrorEvent): boolean {
	return ErrorClassificationUtils.shouldAlert(error);
}

export function getErrorSeverity(error: ErrorEvent): ErrorSeverity {
	return ErrorClassificationUtils.getSeverity(error);
}

export function getErrorCategory(error: ErrorEvent): ErrorCategory {
	return ErrorClassificationUtils.getCategory(error);
}

export function generateErrorFingerprint(error: ErrorEvent): string {
	return ErrorClassificationUtils.generateFingerprint(error);
}

export function getErrorTags(error: ErrorEvent): Record<string, string> {
	return ErrorClassificationUtils.getTags(error);
}

export function isCriticalError(error: ErrorEvent): boolean {
	return ErrorClassificationUtils.isCritical(error);
}

export function isHighSeverityError(error: ErrorEvent): boolean {
	return ErrorClassificationUtils.isHighSeverity(error);
}

export function isLowSeverityError(error: ErrorEvent): boolean {
	return ErrorClassificationUtils.isLowSeverity(error);
}

export function isAuthenticationError(error: ErrorEvent): boolean {
	return ErrorClassificationUtils.isAuthenticationError(error);
}

export function isNetworkError(error: ErrorEvent): boolean {
	return ErrorClassificationUtils.isNetworkError(error);
}

export function isValidationError(error: ErrorEvent): boolean {
	return ErrorClassificationUtils.isValidationError(error);
}

export function isDatabaseError(error: ErrorEvent): boolean {
	return ErrorClassificationUtils.isDatabaseError(error);
}

export function isRateLimitError(error: ErrorEvent): boolean {
	return ErrorClassificationUtils.isRateLimitError(error);
}

export function getErrorPriority(error: ErrorEvent): number {
	return ErrorClassificationUtils.getPriority(error);
}

export function shouldRetryError(error: ErrorEvent): boolean {
	return ErrorClassificationUtils.shouldRetry(error);
}

export function getErrorRetryDelay(error: ErrorEvent, attempt: number): number {
	return ErrorClassificationUtils.getRetryDelay(error, attempt);
}

export function getErrorMaxRetryAttempts(error: ErrorEvent): number {
	return ErrorClassificationUtils.getMaxRetryAttempts(error);
}
