/**
 * IContentPackValidator Interface
 *
 * Defines the contract for content pack validation operations.
 * This interface abstracts validation logic to enable different
 * validation strategies and schema versions.
 */

import type { ValidationResult } from "../entities/ValidationResult";

export interface IContentPackValidator {
	/**
	 * Validates content pack data against the appropriate schema
	 * @param data The content pack data to validate
	 * @param schemaVersion Optional schema version to use (defaults to latest)
	 * @returns Promise resolving to validation result
	 */
	validate(data: unknown, schemaVersion?: string): Promise<ValidationResult>;

	/**
	 * Performs a dry-run validation without saving results
	 * @param data The content pack data to validate
	 * @param schemaVersion Optional schema version to use
	 * @returns Promise resolving to validation result
	 */
	dryRunValidation(
		data: unknown,
		schemaVersion?: string,
	): Promise<ValidationResult>;

	/**
	 * Validates file format and basic structure before schema validation
	 * @param file The uploaded file
	 * @returns Promise resolving to file validation result
	 */
	validateFile(file: File): Promise<FileValidationResult>;

	/**
	 * Gets the supported schema versions
	 * @returns Array of supported schema version strings
	 */
	getSupportedSchemaVersions(): string[];

	/**
	 * Gets the default schema version
	 * @returns The default schema version string
	 */
	getDefaultSchemaVersion(): string;

	/**
	 * Checks if a schema version is supported
	 * @param version The schema version to check
	 * @returns True if supported, false otherwise
	 */
	isSchemaVersionSupported(version: string): boolean;
}

export interface FileValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	fileSize: number;
	fileName: string;
	fileType: string;
}

/**
 * Validation options for customizing validation behavior
 */
export interface ValidationOptions {
	schemaVersion?: string;
	strictMode?: boolean; // Whether to treat warnings as errors
	maxFileSize?: number; // Maximum file size in bytes
	allowedFileTypes?: string[]; // Allowed MIME types
	customRules?: ValidationRule[]; // Custom validation rules
}

export interface ValidationRule {
	name: string;
	description: string;
	validate: (data: unknown) => ValidationRuleResult;
}

export interface ValidationRuleResult {
	isValid: boolean;
	message?: string;
	path?: string;
}

/**
 * Validation context for providing additional information during validation
 */
export interface ValidationContext {
	userId?: string;
	requestId?: string;
	timestamp?: Date;
	metadata?: Record<string, unknown>;
}

/**
 * Extended validator interface with context support
 */
export interface IContextualContentPackValidator extends IContentPackValidator {
	/**
	 * Validates content pack data with additional context
	 * @param data The content pack data to validate
	 * @param context Validation context
	 * @param options Validation options
	 * @returns Promise resolving to validation result
	 */
	validateWithContext(
		data: unknown,
		context: ValidationContext,
		options?: ValidationOptions,
	): Promise<ValidationResult>;
}
