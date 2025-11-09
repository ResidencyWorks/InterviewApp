import { contentPackSchema } from "@/features/booking/application/validations/content";
import {
	timeOperation,
	timeSyncOperation,
} from "@/features/scheduling/infrastructure/monitoring/performance";
import type { ContentPackData } from "@/types";

/**
 * Content pack validation service with performance monitoring
 * Target: ≤1s for content pack validation
 */

export interface ValidationResult {
	/** Whether the content pack is valid */
	valid: boolean;
	/** Validation errors if any */
	errors: string[];
	/** Validation warnings if any */
	warnings: string[];
	/** Content pack metadata */
	metadata: {
		version: string;
		name: string;
		questionCount: number;
		categoryCount: number;
		totalSize: number;
	};
	/** Performance metrics */
	performance: {
		duration: number;
		target: number;
		targetMet: boolean;
	};
}

export interface ValidationOptions {
	/** Whether to perform dry-run validation (no side effects) */
	dryRun?: boolean;
	/** Whether to validate content structure */
	validateStructure?: boolean;
	/** Whether to validate content quality */
	validateQuality?: boolean;
	/** Maximum allowed content pack size in bytes */
	maxSize?: number;
	/** Whether to check for duplicate questions */
	checkDuplicates?: boolean;
}

/**
 * Content pack validation service
 */
export class ContentPackValidationService {
	private readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
	private readonly DEFAULT_OPTIONS: Required<ValidationOptions> = {
		checkDuplicates: true,
		dryRun: true,
		maxSize: this.DEFAULT_MAX_SIZE,
		validateQuality: true,
		validateStructure: true,
	};

	/**
	 * Validate a content pack with performance monitoring
	 * @param contentPack - Content pack data to validate
	 * @param options - Validation options
	 * @returns Promise resolving to validation result
	 */
	async validateContentPack(
		contentPack: ContentPackData,
		options: ValidationOptions = {},
	): Promise<ValidationResult> {
		const opts = { ...this.DEFAULT_OPTIONS, ...options };

		const { result, metrics } = await timeOperation(
			"content.validation",
			async () => {
				const errors: string[] = [];
				const warnings: string[] = [];

				// 1. Basic structure validation
				if (opts.validateStructure) {
					const structureResult = await this.validateStructure(contentPack);
					errors.push(...structureResult.errors);
					warnings.push(...structureResult.warnings);
				}

				// 2. Content quality validation
				if (opts.validateQuality) {
					const qualityResult = await this.validateQuality(contentPack);
					errors.push(...qualityResult.errors);
					warnings.push(...qualityResult.warnings);
				}

				// 2b. Security validation
				const securityResult = await this.validateSecurity(contentPack);
				errors.push(...securityResult.errors);
				warnings.push(...securityResult.warnings);

				// 3. Size validation
				const sizeResult = this.validateSize(contentPack, opts.maxSize);
				if (!sizeResult.valid) {
					errors.push(sizeResult.error ?? "");
				}

				// 4. Duplicate check
				if (opts.checkDuplicates) {
					const duplicateResult = this.checkDuplicates(contentPack);
					if (!duplicateResult.valid) {
						errors.push(...duplicateResult.errors);
					}
				}

				// 5. Extract metadata
				const metadata = this.extractMetadata(contentPack);

				return {
					errors,
					metadata,
					valid: errors.length === 0,
					warnings,
				};
			},
			{
				checkDuplicates: opts.checkDuplicates,
				contentSize: JSON.stringify(contentPack).length,
				maxSize: opts.maxSize,
				validateQuality: opts.validateQuality,
				validateStructure: opts.validateStructure,
			},
		);

		return {
			...result,
			performance: {
				duration: metrics.duration,
				target: 1000, // 1 second target
				targetMet: metrics.duration <= 1000,
			},
		};
	}

	/**
	 * Validate content pack for security concerns (XSS, excessive sizes, suspicious patterns)
	 * @param contentPack - Content pack data
	 */
	private async validateSecurity(contentPack: ContentPackData): Promise<{
		errors: string[];
		warnings: string[];
	}> {
		const errors: string[] = [];
		const warnings: string[] = [];

		const hasHtml = (value: unknown): boolean => {
			if (typeof value !== "string") return false;
			// Basic HTML tag detection
			return /<\s*\/?[a-z][^>]*>/i.test(value);
		};

		const containsScriptLike = (value: string): boolean =>
			/<\s*script|javascript:/i.test(value);

		try {
			const packStr = JSON.stringify(contentPack);
			if (containsScriptLike(packStr)) {
				errors.push("Content contains script-like patterns");
			}
		} catch {}

		const data = contentPack;
		if (!data) return { errors, warnings };

		// Size limits to avoid resource abuse
		const MAX_CATEGORIES = 200;
		const MAX_QUESTIONS = 2000;
		if (
			Array.isArray(data.categories) &&
			data.categories.length > MAX_CATEGORIES
		) {
			warnings.push(`Too many categories: ${data.categories.length}`);
		}
		if (
			Array.isArray(data.questions) &&
			data.questions.length > MAX_QUESTIONS
		) {
			warnings.push(`Too many questions: ${data.questions.length}`);
		}

		// Field-level sanitization checks
		const checkStrings = (label: string, value: unknown) => {
			if (typeof value !== "string") return;
			if (hasHtml(value)) {
				errors.push(`${label} must not contain HTML`);
			}
			if (value.length > 5000) {
				warnings.push(`${label} is very long (${value.length} chars)`);
			}
		};

		checkStrings("Pack name", contentPack?.name);
		checkStrings("Pack description", data?.description);
		for (const cat of data?.categories ?? []) {
			checkStrings(`Category ${cat?.id} name`, cat?.name);
			checkStrings(`Category ${cat?.id} description`, cat?.description);
		}
		for (const q of data?.questions ?? []) {
			checkStrings(`Question ${q?.id} text`, q?.text);
			for (const tip of q?.tips ?? []) {
				checkStrings(`Question ${q?.id} tip`, tip);
			}
		}

		return { errors, warnings };
	}

	/**
	 * Validate content pack structure using Zod schema
	 * @param contentPack - Content pack data
	 * @returns Promise resolving to validation result
	 */
	private async validateStructure(contentPack: ContentPackData): Promise<{
		errors: string[];
		warnings: string[];
	}> {
		const { result } = await timeOperation(
			"content.structure_validation",
			async () => {
				const errors: string[] = [];
				const warnings: string[] = [];

				try {
					// Validate against Zod schema
					const validated = contentPackSchema.parse(contentPack);

					// Additional structure checks
					if (
						!validated.content.categories ||
						validated.content.categories.length === 0
					) {
						errors.push("Content pack must contain at least one category");
					}

					if (
						!validated.content.questions ||
						validated.content.questions.length === 0
					) {
						errors.push("Content pack must contain at least one question");
					}

					// Check category-question relationships
					const categoryIds = new Set(
						validated.content.categories.map((c) => c.id),
					);
					const orphanedQuestions = validated.content.questions.filter(
						(q) => !categoryIds.has(q.category_id),
					);

					if (orphanedQuestions.length > 0) {
						errors.push(
							`Found ${orphanedQuestions.length} questions with invalid category references`,
						);
					}

					return { errors, warnings };
				} catch (error) {
					if (error instanceof Error) {
						errors.push(`Schema validation failed: ${error.message}`);
					} else {
						errors.push("Schema validation failed with unknown error");
					}
					return { errors, warnings };
				}
			},
			{
				categoryCount: contentPack?.categories?.length || 0,
				hasCategories: !!contentPack?.categories,
				hasQuestions: !!contentPack?.questions,
				operation: "structure_validation",
				questionCount: contentPack?.questions?.length || 0,
			},
		);

		return result;
	}

	/**
	 * Validate content quality and consistency
	 * @param contentPack - Content pack data
	 * @returns Promise resolving to validation result
	 */
	private async validateQuality(contentPack: ContentPackData): Promise<{
		errors: string[];
		warnings: string[];
	}> {
		const { result } = await timeOperation(
			"content.quality_validation",
			async () => {
				const errors: string[] = [];
				const warnings: string[] = [];

				if (!contentPack) {
					errors.push("Content pack missing content section");
					return { errors, warnings };
				}

				const { categories, questions } = contentPack;

				// Validate categories
				if (categories) {
					for (const category of categories) {
						if (!category.name || category.name.trim().length === 0) {
							errors.push(`Category ${category.id} has empty name`);
						}

						if (category.name && category.name.length > 100) {
							warnings.push(
								`Category ${category.id} name is very long (${category.name.length} chars)`,
							);
						}
					}
				}

				// Validate questions
				if (questions) {
					for (const question of questions) {
						if (!question.text || question.text.trim().length === 0) {
							errors.push(`Question ${question.id} has empty text`);
						}

						if (question.text && question.text.length < 10) {
							warnings.push(
								`Question ${question.id} text is very short (${question.text.length} chars)`,
							);
						}

						if (question.text && question.text.length > 2000) {
							errors.push(
								`Question ${question.id} text exceeds maximum length (${question.text.length} chars)`,
							);
						}

						// Validate difficulty levels
						if (!["easy", "medium", "hard"].includes(question.difficulty)) {
							errors.push(
								`Question ${question.id} has invalid difficulty level: ${question.difficulty}`,
							);
						}

						// Validate question types
						if (
							!["behavioral", "technical", "situational"].includes(
								question.type,
							)
						) {
							errors.push(
								`Question ${question.id} has invalid type: ${question.type}`,
							);
						}

						// Validate time limits
						if (
							question.time_limit &&
							(question.time_limit < 30 || question.time_limit > 1800)
						) {
							warnings.push(
								`Question ${question.id} has unusual time limit: ${question.time_limit}s`,
							);
						}
					}
				}

				return { errors, warnings };
			},
			{
				categoryCount: contentPack?.categories?.length || 0,
				operation: "quality_validation",
				questionCount: contentPack?.questions?.length || 0,
			},
		);

		return result;
	}

	/**
	 * Validate content pack size
	 * @param contentPack - Content pack data
	 * @param maxSize - Maximum allowed size in bytes
	 * @returns Validation result
	 */
	private validateSize(
		contentPack: ContentPackData,
		maxSize: number,
	): {
		valid: boolean;
		error?: string;
	} {
		const { result } = timeSyncOperation(
			"content.size_validation",
			() => {
				const contentStr = JSON.stringify(contentPack);
				const size = new Blob([contentStr]).size;

				if (size > maxSize) {
					return {
						error: `Content pack size (${size} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
						valid: false,
					};
				}

				return { valid: true };
			},
			{
				contentLength: JSON.stringify(contentPack).length,
				maxSize,
				operation: "size_validation",
			},
		);

		return result;
	}

	/**
	 * Check for duplicate questions
	 * @param contentPack - Content pack data
	 * @returns Validation result
	 */
	private checkDuplicates(contentPack: ContentPackData): {
		valid: boolean;
		errors: string[];
	} {
		const { result } = timeSyncOperation(
			"content.duplicate_check",
			() => {
				const errors: string[] = [];

				if (!contentPack?.questions) {
					return { errors, valid: true };
				}

				const questions = contentPack.questions;
				const seenTexts = new Set<string>();
				const seenIds = new Set<string>();

				for (const question of questions) {
					// Check for duplicate IDs
					if (seenIds.has(question.id)) {
						errors.push(`Duplicate question ID found: ${question.id}`);
					}
					seenIds.add(question.id);

					// Check for duplicate question text
					const normalizedText = question.text?.toLowerCase().trim();
					if (normalizedText && seenTexts.has(normalizedText)) {
						errors.push(`Duplicate question text found: "${question.text}"`);
					}
					if (normalizedText) {
						seenTexts.add(normalizedText);
					}
				}

				return {
					errors,
					valid: errors.length === 0,
				};
			},
			{
				operation: "duplicate_check",
				questionCount: contentPack?.questions?.length || 0,
			},
		);

		return result;
	}

	/**
	 * Extract metadata from content pack
	 * @param contentPack - Content pack data
	 * @returns Metadata object
	 */
	private extractMetadata(contentPack: ContentPackData): {
		version: string;
		name: string;
		questionCount: number;
		categoryCount: number;
		totalSize: number;
	} {
		const { result } = timeSyncOperation(
			"content.metadata_extraction",
			() => {
				const contentStr = JSON.stringify(contentPack);
				const totalSize = new Blob([contentStr]).size;

				return {
					categoryCount: contentPack?.categories?.length || 0,
					name: contentPack?.name || "unnamed",
					questionCount: contentPack?.questions?.length || 0,
					totalSize,
					version: contentPack?.version || "unknown",
				};
			},
			{
				hasName: !!contentPack?.name,
				hasVersion: !!contentPack?.version,
				operation: "metadata_extraction",
			},
		);

		return result;
	}

	/**
	 * Validate content pack for hot-swap operation
	 * @param contentPack - Content pack data
	 * @returns Promise resolving to validation result
	 */
	async validateForHotSwap(
		contentPack: ContentPackData,
	): Promise<ValidationResult> {
		const { result, metrics } = await timeOperation(
			"content.hotswap",
			async () => {
				// Perform comprehensive validation for hot-swap
				const validationResult = await this.validateContentPack(contentPack, {
					checkDuplicates: true,
					dryRun: true,
					maxSize: this.DEFAULT_MAX_SIZE,
					validateQuality: true,
					validateStructure: true,
				});

				// Additional hot-swap specific validations
				const errors = [...validationResult.errors];
				const warnings = [...validationResult.warnings];

				// Check if content pack is compatible with current system
				if (
					contentPack?.version &&
					!this.isVersionCompatible(contentPack.version)
				) {
					warnings.push(
						`Content pack version ${contentPack.version} may not be fully compatible`,
					);
				}

				// Check for breaking changes
				const breakingChanges = this.checkBreakingChanges(contentPack);
				if (breakingChanges.length > 0) {
					errors.push(
						`Breaking changes detected: ${breakingChanges.join(", ")}`,
					);
				}

				return {
					...validationResult,
					errors,
					warnings,
				};
			},
			{
				name: contentPack?.name,
				operation: "hotswap_validation",
				version: contentPack?.version,
			},
		);

		return {
			...result,
			performance: {
				duration: metrics.duration,
				target: 1000, // 1 second target
				targetMet: metrics.duration <= 1000,
			},
		};
	}

	/**
	 * Check if content pack version is compatible
	 * @param version - Content pack version
	 * @returns Whether version is compatible
	 */
	private isVersionCompatible(version: string): boolean {
		// Simple version compatibility check
		// In a real implementation, this would check against supported versions
		const supportedVersions = ["1.0.0", "1.1.0", "1.2.0"];
		return supportedVersions.includes(version);
	}

	/**
	 * Check for breaking changes in content pack
	 * @param contentPack - Content pack data
	 * @returns Array of breaking change descriptions
	 */
	private checkBreakingChanges(contentPack: ContentPackData): string[] {
		const breakingChanges: string[] = [];

		// Check for removed required fields
		if (!contentPack) {
			breakingChanges.push("Missing content section");
		}

		// Check for schema changes
		if (contentPack?.questions) {
			for (const question of contentPack.questions) {
				if (
					!question.id ||
					!question.text ||
					!question.type ||
					!question.difficulty
				) {
					breakingChanges.push("Questions missing required fields");
					break;
				}
			}
		}

		return breakingChanges;
	}
}

// Export singleton instance
export const contentPackValidationService = new ContentPackValidationService();
