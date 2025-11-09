/**
 * ContentPackValidator Service
 *
 * Implements content pack validation using Zod schemas with comprehensive
 * error handling, performance monitoring, and detailed validation results.
 */

import type { z } from "zod";
import {
	getSupportedVersions,
	isVersionSupported,
	validateContentPackAsync,
} from "@/features/booking/application/validations/content-pack-schema";
import {
	createFailedValidationResult,
	createSuccessfulValidationResult,
	type ValidationError,
	type ValidationResult,
	type ValidationWarning,
} from "../entities/ValidationResult";
import type {
	FileValidationResult,
	IContentPackValidator,
	ValidationOptions,
	ValidationRule,
} from "../interfaces/IContentPackValidator";

type ContentPackLike = {
	id?: string;
	metadata?: unknown;
	content?: {
		evaluations?: Array<{
			description?: string;
		}>;
	};
};

export class ContentPackValidator implements IContentPackValidator {
	private readonly maxFileSize: number;
	private readonly allowedFileTypes: string[];
	private readonly customRules: ValidationRule[];

	constructor(options: ValidationOptions = {}) {
		this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
		this.allowedFileTypes = options.allowedFileTypes || ["application/json"];
		this.customRules = options.customRules || [];
	}

	/**
	 * Validates content pack data against the appropriate schema
	 */
	async validate(
		data: unknown,
		schemaVersion?: string,
	): Promise<ValidationResult> {
		const startTime = Date.now();
		const version = schemaVersion || this.getDefaultSchemaVersion();
		const contentPackId = this.extractContentPackId(data) || "unknown";

		try {
			// Validate schema version
			if (!this.isSchemaVersionSupported(version)) {
				const error: ValidationError = {
					path: "schemaVersion",
					message: `Unsupported schema version: ${version}`,
					code: "UNSUPPORTED_SCHEMA_VERSION",
					severity: "error",
				};

				return createFailedValidationResult(
					contentPackId,
					[error],
					[],
					"system",
					version,
					Date.now() - startTime,
				);
			}

			// Perform schema validation
			const result = await validateContentPackAsync(data, version);

			if (!result.success) {
				const errors = this.formatZodErrors(result.error);
				const warnings = this.extractWarnings(data, version);

				return createFailedValidationResult(
					contentPackId,
					errors,
					warnings,
					"system",
					version,
					Date.now() - startTime,
				);
			}

			// Apply custom validation rules
			const customValidationResult = await this.applyCustomRules(data);
			const allErrors = [...customValidationResult.errors];
			const allWarnings = [
				...customValidationResult.warnings,
				...this.extractWarnings(data, version),
			];

			if (allErrors.length > 0) {
				return createFailedValidationResult(
					contentPackId,
					allErrors,
					allWarnings,
					"system",
					version,
					Date.now() - startTime,
				);
			}

			return createSuccessfulValidationResult(
				contentPackId,
				allWarnings,
				"system",
				version,
				Date.now() - startTime,
			);
		} catch (error) {
			const validationError: ValidationError = {
				path: "root",
				message: `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				code: "VALIDATION_ERROR",
				severity: "error",
			};

			return createFailedValidationResult(
				contentPackId,
				[validationError],
				[],
				"system",
				version,
				Date.now() - startTime,
			);
		}
	}

	/**
	 * Performs a dry-run validation without saving results
	 */
	async dryRunValidation(
		data: unknown,
		schemaVersion?: string,
	): Promise<ValidationResult> {
		// For now, dry-run validation is the same as regular validation
		// In the future, this could include additional checks or different behavior
		return this.validate(data, schemaVersion);
	}

	/**
	 * Validates file format and basic structure before schema validation
	 */
	async validateFile(file: File): Promise<FileValidationResult> {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Check file type
		if (!this.allowedFileTypes.includes(file.type)) {
			errors.push(
				`Invalid file type: ${file.type}. Allowed types: ${this.allowedFileTypes.join(", ")}`,
			);
		}

		// Check file size
		if (file.size > this.maxFileSize) {
			errors.push(
				`File too large: ${file.size} bytes. Maximum allowed: ${this.maxFileSize} bytes`,
			);
		}

		// Check file name
		if (!file.name.toLowerCase().endsWith(".json")) {
			warnings.push("File does not have .json extension");
		}

		// Try to parse as JSON
		try {
			const text = await file.text();
			JSON.parse(text);
		} catch (error) {
			errors.push(
				`Invalid JSON format: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			fileSize: file.size,
			fileName: file.name,
			fileType: file.type,
		};
	}

	/**
	 * Gets the supported schema versions
	 */
	getSupportedSchemaVersions(): string[] {
		return getSupportedVersions();
	}

	/**
	 * Gets the default schema version
	 */
	getDefaultSchemaVersion(): string {
		return "1.0.0";
	}

	/**
	 * Checks if a schema version is supported
	 */
	isSchemaVersionSupported(version: string): boolean {
		return isVersionSupported(version);
	}

	/**
	 * Formats Zod errors into ValidationError objects
	 */
	private formatZodErrors(error: z.ZodError): ValidationError[] {
		return error.issues.map((zodError) => ({
			path: this.formatZodPath(zodError.path as (string | number)[]),
			message: zodError.message,
			code: this.getErrorCode(zodError.code),
			severity: "error" as const,
		}));
	}

	/**
	 * Formats Zod path array into a readable string
	 */
	private formatZodPath(path: (string | number)[]): string {
		return path.reduce<string>((acc, segment, index) => {
			if (typeof segment === "number") {
				return `${acc}[${segment}]`;
			}
			return index === 0 ? String(segment) : `${acc}.${String(segment)}`;
		}, "");
	}

	/**
	 * Maps Zod error codes to custom error codes
	 */
	private getErrorCode(zodCode: string): string {
		const codeMap: Record<string, string> = {
			invalid_type: "INVALID_TYPE",
			invalid_literal: "INVALID_LITERAL",
			custom: "CUSTOM_VALIDATION",
			invalid_union: "INVALID_UNION",
			invalid_union_discriminator: "INVALID_UNION_DISCRIMINATOR",
			invalid_enum_value: "INVALID_ENUM_VALUE",
			unrecognized_keys: "UNRECOGNIZED_KEYS",
			invalid_arguments: "INVALID_ARGUMENTS",
			invalid_return_type: "INVALID_RETURN_TYPE",
			invalid_date: "INVALID_DATE",
			invalid_string: "INVALID_STRING",
			too_small: "TOO_SMALL",
			too_big: "TOO_BIG",
			invalid_intersection_types: "INVALID_INTERSECTION_TYPES",
			not_multiple_of: "NOT_MULTIPLE_OF",
			not_finite: "NOT_FINITE",
		};

		return codeMap[zodCode] || "UNKNOWN_ERROR";
	}

	/**
	 * Extracts warnings from content pack data
	 */
	private extractWarnings(
		data: unknown,
		_schemaVersion: string,
	): ValidationWarning[] {
		const warnings: ValidationWarning[] = [];

		// Check for potential issues that don't break validation
		if (data && typeof data === "object") {
			const pack = data as ContentPackLike;
			// Check for empty descriptions
			if (pack.content?.evaluations) {
				pack.content.evaluations.forEach((evaluation, index) => {
					if (!evaluation.description || evaluation.description.trim() === "") {
						warnings.push({
							path: `content.evaluations[${index}].description`,
							message: "Evaluation description is empty",
							code: "EMPTY_DESCRIPTION",
							suggestion:
								"Consider adding a description to help users understand this evaluation",
						});
					}
				});
			}

			// Check for missing metadata
			if (!pack.metadata) {
				warnings.push({
					path: "metadata",
					message: "No metadata provided",
					code: "MISSING_METADATA",
					suggestion:
						"Consider adding metadata like author, tags, or compatibility information",
				});
			}
		}

		return warnings;
	}

	/**
	 * Applies custom validation rules
	 */
	private async applyCustomRules(data: unknown): Promise<{
		errors: ValidationError[];
		warnings: ValidationWarning[];
	}> {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		for (const rule of this.customRules) {
			try {
				const result = rule.validate(data);
				if (!result.isValid) {
					const error: ValidationError = {
						path: result.path || "root",
						message: result.message || `Custom validation failed: ${rule.name}`,
						code: `CUSTOM_${rule.name.toUpperCase()}`,
						severity: "error",
					};
					errors.push(error);
				}
			} catch (error) {
				const validationError: ValidationError = {
					path: "root",
					message: `Custom rule '${rule.name}' failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					code: "CUSTOM_RULE_ERROR",
					severity: "error",
				};
				errors.push(validationError);
			}
		}

		return { errors, warnings };
	}

	/**
	 * Extracts content pack ID from data for validation result
	 */
	private extractContentPackId(data: unknown): string | null {
		if (data && typeof data === "object") {
			const pack = data as ContentPackLike;
			if (typeof pack.id === "string") {
				return pack.id;
			}
		}
		return null;
	}
}

/**
 * Factory function to create a ContentPackValidator with default options
 */
export function createContentPackValidator(
	options?: ValidationOptions,
): ContentPackValidator {
	return new ContentPackValidator(options);
}

/**
 * Default validator instance
 */
export const defaultContentPackValidator = createContentPackValidator();
