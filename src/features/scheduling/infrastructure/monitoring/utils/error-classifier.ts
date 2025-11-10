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
function getClassification(error: ErrorEvent): ErrorClassificationResult {
	const classifier = new ErrorClassifier();
	return classifier.classify(error);
}

function getSeverity(error: ErrorEvent): ErrorSeverity {
	return getClassification(error).severity;
}

function getCategory(error: ErrorEvent): ErrorCategory {
	return getClassification(error).category;
}

function shouldReportClassification(error: ErrorEvent): boolean {
	return getClassification(error).shouldReport;
}

function shouldAlertClassification(error: ErrorEvent): boolean {
	return getClassification(error).shouldAlert;
}

function generateErrorFingerprintInternal(error: ErrorEvent): string {
	return getClassification(error).fingerprint;
}

function getErrorTagsInternal(error: ErrorEvent): Record<string, string> {
	return getClassification(error).tags;
}

function isCriticalClassification(error: ErrorEvent): boolean {
	return getSeverity(error) === "CRITICAL";
}

function isHighSeverityClassification(error: ErrorEvent): boolean {
	const severity = getSeverity(error);
	return severity === "CRITICAL" || severity === "ERROR";
}

function isLowSeverityClassification(error: ErrorEvent): boolean {
	const severity = getSeverity(error);
	return severity === "INFO" || severity === "DEBUG";
}

function isAuthenticationClassification(error: ErrorEvent): boolean {
	const category = getCategory(error);
	return (
		category === "AUTHENTICATION_ERROR" || category === "AUTHORIZATION_ERROR"
	);
}

function isNetworkClassification(error: ErrorEvent): boolean {
	const category = getCategory(error);
	return category === "NETWORK_ERROR" || category === "EXTERNAL_SERVICE_ERROR";
}

function isValidationClassification(error: ErrorEvent): boolean {
	return getCategory(error) === "VALIDATION_ERROR";
}

function isDatabaseClassification(error: ErrorEvent): boolean {
	return getCategory(error) === "DATABASE_ERROR";
}

function isRateLimitClassification(error: ErrorEvent): boolean {
	return getCategory(error) === "RATE_LIMIT_ERROR";
}

function getErrorPriorityInternal(error: ErrorEvent): number {
	const severity = getSeverity(error);
	const priorityMap: Record<ErrorSeverity, number> = {
		CRITICAL: 100,
		ERROR: 80,
		WARNING: 60,
		INFO: 40,
		DEBUG: 20,
	};
	return priorityMap[severity] || 0;
}

function shouldRetryClassification(error: ErrorEvent): boolean {
	const category = getCategory(error);
	const retryableCategories: ErrorCategory[] = [
		"NETWORK_ERROR",
		"EXTERNAL_SERVICE_ERROR",
		"DATABASE_ERROR",
	];
	return retryableCategories.includes(category);
}

function getRetryDelayInternal(_error: ErrorEvent, attempt: number): number {
	const baseDelay = 1000; // 1 second
	const maxDelay = 30000; // 30 seconds
	const delay = baseDelay * 2 ** (attempt - 1);
	return Math.min(delay, maxDelay);
}

function getMaxRetryAttemptsInternal(error: ErrorEvent): number {
	const category = getCategory(error);
	const severity = getSeverity(error);

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

/**
 * Convenience functions
 */
export function classifyError(error: ErrorEvent): ErrorClassificationResult {
	const classifier = new ErrorClassifier();
	return classifier.classify(error);
}

export function shouldReportError(error: ErrorEvent): boolean {
	return shouldReportClassification(error);
}

export function shouldAlertError(error: ErrorEvent): boolean {
	return shouldAlertClassification(error);
}

export function getErrorSeverity(error: ErrorEvent): ErrorSeverity {
	return getSeverity(error);
}

export function getErrorCategory(error: ErrorEvent): ErrorCategory {
	return getCategory(error);
}

export function generateErrorFingerprint(error: ErrorEvent): string {
	return generateErrorFingerprintInternal(error);
}

export function getErrorTags(error: ErrorEvent): Record<string, string> {
	return getErrorTagsInternal(error);
}

export function isCriticalError(error: ErrorEvent): boolean {
	return isCriticalClassification(error);
}

export function isHighSeverityError(error: ErrorEvent): boolean {
	return isHighSeverityClassification(error);
}

export function isLowSeverityError(error: ErrorEvent): boolean {
	return isLowSeverityClassification(error);
}

export function isAuthenticationError(error: ErrorEvent): boolean {
	return isAuthenticationClassification(error);
}

export function isNetworkError(error: ErrorEvent): boolean {
	return isNetworkClassification(error);
}

export function isValidationError(error: ErrorEvent): boolean {
	return isValidationClassification(error);
}

export function isDatabaseError(error: ErrorEvent): boolean {
	return isDatabaseClassification(error);
}

export function isRateLimitError(error: ErrorEvent): boolean {
	return isRateLimitClassification(error);
}

export function getErrorPriority(error: ErrorEvent): number {
	return getErrorPriorityInternal(error);
}

export function shouldRetryError(error: ErrorEvent): boolean {
	return shouldRetryClassification(error);
}

export function getErrorRetryDelay(error: ErrorEvent, attempt: number): number {
	return getRetryDelayInternal(error, attempt);
}

export function getErrorMaxRetryAttempts(error: ErrorEvent): number {
	return getMaxRetryAttemptsInternal(error);
}
