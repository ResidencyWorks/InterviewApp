import type { PostgrestError } from "@supabase/supabase-js";
import type { DatabaseResult, QueryOptions } from "./database-types";

/**
 * Serialize Supabase PostgrestError for logging
 * PostgrestError objects don't serialize well with console.error, so we extract the relevant properties
 * @param error - Supabase error or any error
 * @returns Serializable error object
 */
export function serializeError(error: unknown): Record<string, unknown> {
	if (!error) {
		return { message: "Unknown error", type: "null_or_undefined" };
	}

	// Handle standard Error objects first (most common)
	if (error instanceof Error) {
		const result: Record<string, unknown> = {
			message: error.message || "Error occurred",
			name: error.name || "Error",
			type: "Error",
		};

		if (error.stack) {
			result.stack = error.stack;
		}

		// Check for PostgrestError properties (Supabase database errors)
		const errorObj = error as unknown as Record<string, unknown>;
		if ("code" in errorObj) {
			result.code = errorObj.code;
			result.type = "PostgrestError";
		}
		if ("details" in errorObj) {
			result.details = errorObj.details;
		}
		if ("hint" in errorObj) {
			result.hint = errorObj.hint;
		}
		if ("status" in errorObj || "statusCode" in errorObj) {
			result.status = errorObj.status || errorObj.statusCode;
		}

		return result;
	}

	// Handle plain objects (including PostgrestError which might not be Error instance)
	if (typeof error === "object" && error !== null) {
		const errorObj = error as Record<string, unknown>;
		const result: Record<string, unknown> = {
			type: "object",
		};

		// Extract common error properties
		const knownProperties = [
			"message",
			"code",
			"details",
			"hint",
			"status",
			"statusCode",
			"name",
			"stack",
		];

		for (const prop of knownProperties) {
			if (prop in errorObj && errorObj[prop] !== undefined) {
				result[prop] = errorObj[prop];
			}
		}

		// Try to get all own property names (including non-enumerable)
		try {
			const allProps = Object.getOwnPropertyNames(errorObj);
			if (allProps.length > 0) {
				result._allProperties = allProps;
				// Try to get values for properties we haven't seen
				for (const prop of allProps) {
					if (!knownProperties.includes(prop) && prop !== "_allProperties") {
						try {
							const value = (errorObj as Record<string, unknown>)[prop];
							if (value !== undefined) {
								result[`_${prop}`] = value;
							}
						} catch {
							// Ignore errors accessing properties
						}
					}
				}
			}
		} catch {
			// Ignore errors getting property names
		}

		// If we found PostgrestError-like properties, mark it
		if ("code" in errorObj || "details" in errorObj || "hint" in errorObj) {
			result.type = "PostgrestError";
		}

		// If no message found, try to create one
		if (!result.message) {
			if (result.code) {
				result.message = `Error code: ${result.code}`;
			} else if (
				result._allProperties &&
				(result._allProperties as string[]).length === 0
			) {
				result.message = "Empty error object received from Supabase";
			} else {
				result.message = "Database operation failed";
			}
		}

		// If we still have minimal info, try to stringify the original error
		const resultKeys = Object.keys(result).filter((k) => !k.startsWith("_"));
		if (resultKeys.length <= 2) {
			try {
				// Try with replacer to get non-enumerable properties
				const stringified = JSON.stringify(error, (key, value) => {
					// Include all properties
					return value;
				});
				if (stringified && stringified !== "{}" && stringified !== "null") {
					result._rawStringified = stringified;
				} else {
					result._note = "Error object appears to be empty or non-serializable";
				}
			} catch (e) {
				result._stringifyError = e instanceof Error ? e.message : String(e);
			}
		}

		return result;
	}

	// Fallback for primitive types
	return {
		message: String(error),
		type: typeof error,
		value: error,
	};
}

/**
 * Handle Supabase error and convert to DatabaseResult
 * @param error - Supabase error
 * @returns DatabaseResult with error information
 */
export function handleDatabaseError(
	error: PostgrestError | null,
): DatabaseResult {
	if (!error) {
		return { data: null, error: null, success: true };
	}

	return {
		data: null,
		error: error.message || "Database operation failed",
		success: false,
	};
}

/**
 * Build select query string
 * @param select - Select fields
 * @returns Select query string
 */
export function buildSelectQuery(select?: string): string {
	return select || "*";
}

/**
 * Build filter query
 * @param filters - Filter object
 * @returns Filter query object
 */
export function buildFilterQuery(
	filters?: Record<string, unknown>,
): Record<string, string> {
	if (!filters) return {};

	const query: Record<string, string> = {};

	for (const [key, value] of Object.entries(filters)) {
		if (value !== undefined && value !== null) {
			if (Array.isArray(value)) {
				query[key] = `in.(${value.join(",")})`;
			} else if (typeof value === "string" && value.includes("*")) {
				query[key] = `like.${value.replace(/\*/g, "%")}`;
			} else {
				query[key] = `eq.${value}`;
			}
		}
	}

	return query;
}

/**
 * Build order query
 * @param orderBy - Order by field
 * @param orderDirection - Order direction
 * @returns Order query string
 */
export function buildOrderQuery(
	orderBy?: string,
	orderDirection?: "asc" | "desc",
): string {
	if (!orderBy) return "";
	return `${orderBy}.${orderDirection || "asc"}`;
}

/**
 * Calculate pagination metadata
 * @param count - Total count
 * @param page - Current page
 * @param limit - Items per page
 * @returns Pagination metadata
 */
export function calculatePagination(
	count: number,
	page: number,
	limit: number,
) {
	const totalPages = Math.ceil(count / limit);
	const hasNext = page < totalPages;
	const hasPrev = page > 1;

	return {
		count,
		hasNext,
		hasPrev,
		limit,
		page,
		totalPages,
	};
}

/**
 * Validate query options
 * @param options - Query options to validate
 * @returns True if valid
 */
export function validateQueryOptions(options?: QueryOptions): boolean {
	if (!options) return true;

	if (options.limit && options.limit < 0) return false;
	if (options.offset && options.offset < 0) return false;
	if (
		options.orderDirection &&
		!["asc", "desc"].includes(options.orderDirection)
	)
		return false;

	return true;
}

/**
 * Sanitize table name
 * @param tableName - Table name to sanitize
 * @returns Sanitized table name
 */
export function sanitizeTableName(tableName: string): string {
	// Remove any characters that could be used for SQL injection
	return tableName.replace(/[^a-zA-Z0-9_]/g, "");
}

/**
 * Sanitize column name
 * @param columnName - Column name to sanitize
 * @returns Sanitized column name
 */
export function sanitizeColumnName(columnName: string): string {
	// Remove any characters that could be used for SQL injection
	return columnName.replace(/[^a-zA-Z0-9_]/g, "");
}

/**
 * Create success result
 * @param data - Result data
 * @returns Success DatabaseResult
 */
export function createSuccessResult<T>(data: T): DatabaseResult<T> {
	return {
		data,
		error: null,
		success: true,
	};
}

/**
 * Create error result
 * @param error - Error message
 * @returns Error DatabaseResult
 */
export function createErrorResult(error: string): DatabaseResult {
	return {
		data: null,
		error,
		success: false,
	};
}

/**
 * Check if result is successful
 * @param result - Database result
 * @returns True if successful
 */
export function isSuccessResult<T>(
	result: DatabaseResult<T>,
): result is DatabaseResult<T> & { data: T } {
	return result.success && result.data !== null;
}

/**
 * Extract data from result or throw error
 * @param result - Database result
 * @returns Data or throws error
 */
export function extractDataOrThrow<T>(result: DatabaseResult<T>): T {
	if (!result.success || result.data === null) {
		throw new Error(result.error || "Database operation failed");
	}
	return result.data;
}

/**
 * Retry database operation with exponential backoff
 * @param operation - Operation to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise resolving to operation result
 */
export async function retryOperation<T>(
	operation: () => Promise<DatabaseResult<T>>,
	maxRetries = 3,
	baseDelay = 1000,
): Promise<DatabaseResult<T>> {
	let lastError: string | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const result = await operation();
			if (result.success) {
				return result;
			}
			lastError = result.error;
		} catch (error) {
			lastError = error instanceof Error ? error.message : "Unknown error";
		}

		if (attempt < maxRetries) {
			const delay = baseDelay * 2 ** attempt;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	return createErrorResult(
		lastError || "Operation failed after retries",
	) as DatabaseResult<T>;
}
