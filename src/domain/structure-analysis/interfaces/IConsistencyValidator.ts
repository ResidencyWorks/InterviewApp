/**
 * IConsistencyValidator interface
 * @fileoverview Defines the contract for consistency validation services
 */

import type { File } from "../entities/File";
import type { StructuralInconsistency } from "../entities/StructuralInconsistency";

/**
 * Consistency validation options
 */
export interface ConsistencyValidationOptions {
	/**
	 * Pattern templates to use
	 */
	patternTemplates?: string[];

	/**
	 * Strictness level
	 */
	strictness?: "lenient" | "moderate" | "strict";

	/**
	 * Ignore patterns
	 */
	ignorePatterns?: string[];

	/**
	 * Minimum occurrences to report
	 */
	minOccurrences?: number;
}

/**
 * Consistency validation result
 */
export interface ConsistencyValidationResult {
	/**
	 * Detected inconsistencies
	 */
	inconsistencies: StructuralInconsistency[];

	/**
	 * Total patterns checked
	 */
	totalPatternsChecked: number;

	/**
	 * Validation duration in milliseconds
	 */
	durationMs: number;

	/**
	 * Compliance percentage (0-100)
	 */
	compliancePercentage: number;
}

/**
 * Consistency validator interface
 */
export interface IConsistencyValidator {
	/**
	 * Validate consistency of files
	 * @param files - Files to validate
	 * @param options - Validation options
	 * @returns Promise resolving to validation result
	 */
	validateConsistency(
		files: File[],
		options?: ConsistencyValidationOptions,
	): Promise<ConsistencyValidationResult>;

	/**
	 * Validate naming conventions
	 * @param files - Files to validate
	 * @returns Inconsistencies found
	 */
	validateNamingConventions(files: File[]): Promise<StructuralInconsistency[]>;

	/**
	 * Validate architectural patterns
	 * @param files - Files to validate
	 * @returns Inconsistencies found
	 */
	validateArchitecturalPatterns(
		files: File[],
	): Promise<StructuralInconsistency[]>;

	/**
	 * Validate interface consistency
	 * @param files - Files to validate
	 * @returns Inconsistencies found
	 */
	validateInterfaces(files: File[]): Promise<StructuralInconsistency[]>;

	/**
	 * Validate error handling patterns
	 * @param files - Files to validate
	 * @returns Inconsistencies found
	 */
	validateErrorHandling(files: File[]): Promise<StructuralInconsistency[]>;

	/**
	 * Validate dependencies
	 * @param files - Files to validate
	 * @returns Inconsistencies found
	 */
	validateDependencies(files: File[]): Promise<StructuralInconsistency[]>;
}
