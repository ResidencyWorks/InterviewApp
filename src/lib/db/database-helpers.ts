import type { PostgrestError } from "@supabase/supabase-js";
import type { DatabaseResult, QueryOptions } from "./database-types";

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
	filters?: Record<string, any>,
): Record<string, any> {
	if (!filters) return {};

	const query: Record<string, any> = {};

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

	return createErrorResult(lastError || "Operation failed after retries");
}
