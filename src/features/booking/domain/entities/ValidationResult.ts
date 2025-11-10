/**
 * ValidationResult Entity
 *
 * Represents the outcome of content pack validation including
 * errors, warnings, and performance metrics.
 */

export interface ValidationError {
	path: string; // JSON path to the error
	message: string; // Human-readable error message
	code: string; // Error code for programmatic handling
	severity: "error" | "warning"; // Error severity
}

export interface ValidationWarning {
	path: string; // JSON path to the warning
	message: string; // Human-readable warning message
	code: string; // Warning code
	suggestion?: string; // Optional suggestion for resolution
}

export interface ValidationResult {
	id: string; // UUID v4
	contentPackId: string; // Associated content pack ID
	isValid: boolean; // Overall validation result
	errors: ValidationError[]; // List of validation errors
	warnings: ValidationWarning[]; // List of validation warnings
	validatedAt: Date; // When validation was performed
	validatedBy: string; // System/user that performed validation
	schemaVersion: string; // Schema version used for validation
	validationTimeMs: number; // Time taken for validation
}

/**
 * Creates a new ValidationResult instance
 */
export function createValidationResult(
	contentPackId: string,
	isValid: boolean,
	errors: ValidationError[] = [],
	warnings: ValidationWarning[] = [],
	validatedBy: string = "system",
	schemaVersion: string,
	validationTimeMs: number,
): ValidationResult {
	return {
		id: crypto.randomUUID(),
		contentPackId,
		isValid,
		errors,
		warnings,
		validatedAt: new Date(),
		validatedBy,
		schemaVersion,
		validationTimeMs,
	};
}

/**
 * Creates a successful validation result
 */
export function createSuccessfulValidationResult(
	contentPackId: string,
	warnings: ValidationWarning[] = [],
	validatedBy: string = "system",
	schemaVersion: string,
	validationTimeMs: number,
): ValidationResult {
	return createValidationResult(
		contentPackId,
		true,
		[],
		warnings,
		validatedBy,
		schemaVersion,
		validationTimeMs,
	);
}

/**
 * Creates a failed validation result
 */
export function createFailedValidationResult(
	contentPackId: string,
	errors: ValidationError[],
	warnings: ValidationWarning[] = [],
	validatedBy: string = "system",
	schemaVersion: string,
	validationTimeMs: number,
): ValidationResult {
	return createValidationResult(
		contentPackId,
		false,
		errors,
		warnings,
		validatedBy,
		schemaVersion,
		validationTimeMs,
	);
}

/**
 * Checks if a validation result has any errors
 */
export function hasValidationErrors(result: ValidationResult): boolean {
	return result.errors.length > 0;
}

/**
 * Checks if a validation result has any warnings
 */
export function hasValidationWarnings(result: ValidationResult): boolean {
	return result.warnings.length > 0;
}

/**
 * Gets the total number of issues (errors + warnings)
 */
export function getTotalIssues(result: ValidationResult): number {
	return result.errors.length + result.warnings.length;
}
