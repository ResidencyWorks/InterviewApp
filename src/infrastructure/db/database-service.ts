import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/infrastructure/supabase/client";
import { createClient as createServerClient } from "@/infrastructure/supabase/server";
import {
	buildSelectQuery,
	calculatePagination,
	createErrorResult,
	createSuccessResult,
	handleDatabaseError,
	sanitizeTableName,
	validateQueryOptions,
} from "./database-helpers";
import type {
	DatabaseHealthCheck,
	DatabaseResult,
	DatabaseServiceInterface,
	DatabaseTransaction,
	DeleteOptions,
	InsertOptions,
	PaginatedResult,
	QueryOptions,
	UpdateOptions,
} from "./database-types";

/**
 * Database service for client-side operations
 */
export class DatabaseService implements DatabaseServiceInterface {
	protected supabase: SupabaseClient;

	constructor(supabase?: SupabaseClient) {
		this.supabase = supabase || createClient();
	}

	/**
	 * Return the underlying Supabase client for callers that need direct access.
	 * Prefer higher-level helpers when possible.
	 */
	getClient(): SupabaseClient {
		return this.supabase;
	}

	/**
	 * Execute a query on a table
	 * @param table - Table name
	 * @param options - Query options
	 * @returns Promise resolving to query result
	 */
	async query<T>(
		table: string,
		options?: QueryOptions,
	): Promise<DatabaseResult<T[]>> {
		try {
			if (!validateQueryOptions(options)) {
				return createErrorResult("Invalid query options") as DatabaseResult<
					T[]
				>;
			}

			const sanitizedTable = sanitizeTableName(table);
			let query = this.supabase
				.from(sanitizedTable)
				.select(buildSelectQuery(options?.select));

			if (options?.orderBy) {
				query = query.order(options.orderBy, {
					ascending: (options.orderDirection || "asc") === "asc",
				});
			}

			if (options?.offset !== undefined || options?.limit !== undefined) {
				const limit = options?.limit || 1000;
				const offset = options?.offset || 0;
				query = query.range(offset, offset + limit - 1);
			} else {
				query = query.limit(options?.limit || 1000);
			}

			const { data, error } = await query;

			if (error) {
				return handleDatabaseError(error) as DatabaseResult<T[]>;
			}

			return createSuccessResult(data as T[]);
		} catch (error) {
			return createErrorResult(
				error instanceof Error ? error.message : "Query failed",
			) as DatabaseResult<T[]>;
		}
	}

	/**
	 * Find a record by ID
	 * @param table - Table name
	 * @param id - Record ID
	 * @returns Promise resolving to record or null
	 */
	async findById<T>(table: string, id: string): Promise<DatabaseResult<T>> {
		try {
			const sanitizedTable = sanitizeTableName(table);
			const { data, error } = await this.supabase
				.from(sanitizedTable)
				.select("*")
				.eq("id", id)
				.single();

			if (error) {
				return handleDatabaseError(error) as DatabaseResult<T>;
			}

			return createSuccessResult(data);
		} catch (error) {
			return createErrorResult(
				error instanceof Error ? error.message : "Find by ID failed",
			) as DatabaseResult<T>;
		}
	}

	/**
	 * Insert a new record
	 * @param table - Table name
	 * @param data - Record data
	 * @param options - Insert options
	 * @returns Promise resolving to inserted record
	 */
	async insert<T>(
		table: string,
		data: Record<string, unknown>,
		options?: InsertOptions,
	): Promise<DatabaseResult<T>> {
		try {
			const sanitizedTable = sanitizeTableName(table);
			const query = this.supabase.from(sanitizedTable).insert(data);

			const queryWithReturning = options?.returning
				? query.select(options.returning)
				: query;

			if (options?.ignoreDuplicates) {
				// For now, just insert - upsert can be added later
				// query = query.upsert(data)
			}

			const { data: result, error } = await queryWithReturning;

			if (error) {
				return handleDatabaseError(error) as DatabaseResult<T>;
			}

			return createSuccessResult((result?.[0] || result) as T);
		} catch (error) {
			return createErrorResult(
				error instanceof Error ? error.message : "Insert failed",
			) as DatabaseResult<T>;
		}
	}

	/**
	 * Update a record
	 * @param table - Table name
	 * @param id - Record ID
	 * @param data - Update data
	 * @param options - Update options
	 * @returns Promise resolving to updated record
	 */
	async update<T>(
		table: string,
		id: string,
		data: Record<string, unknown>,
		options?: UpdateOptions,
	): Promise<DatabaseResult<T>> {
		try {
			const sanitizedTable = sanitizeTableName(table);
			const query = this.supabase
				.from(sanitizedTable)
				.update(data)
				.eq("id", id);

			const queryWithReturning = options?.returning
				? query.select(options.returning)
				: query;

			if (options?.count) {
				// Count functionality can be added later
				// query = query.select('*', { count: options.count })
			}

			const { data: result, error } = await queryWithReturning;

			if (error) {
				return handleDatabaseError(error) as DatabaseResult<T>;
			}

			return createSuccessResult((result?.[0] || result) as T);
		} catch (error) {
			return createErrorResult(
				error instanceof Error ? error.message : "Update failed",
			) as DatabaseResult<T>;
		}
	}

	/**
	 * Delete a record
	 * @param table - Table name
	 * @param id - Record ID
	 * @param options - Delete options
	 * @returns Promise resolving to success status
	 */
	async delete(
		table: string,
		id: string,
		options?: DeleteOptions,
	): Promise<DatabaseResult<boolean>> {
		try {
			const sanitizedTable = sanitizeTableName(table);
			const query = this.supabase.from(sanitizedTable).delete().eq("id", id);

			const queryWithReturning = options?.returning
				? query.select(options.returning)
				: query;

			if (options?.count) {
				// Count functionality can be added later
				// query = query.select('*', { count: options.count })
			}

			const { error } = await queryWithReturning;

			if (error) {
				return handleDatabaseError(error) as DatabaseResult<boolean>;
			}

			return createSuccessResult(true);
		} catch (error) {
			return createErrorResult(
				error instanceof Error ? error.message : "Delete failed",
			) as DatabaseResult<boolean>;
		}
	}

	/**
	 * Get paginated results
	 * @param table - Table name
	 * @param page - Page number
	 * @param limit - Items per page
	 * @param options - Query options
	 * @returns Promise resolving to paginated result
	 */
	async paginate<T>(
		table: string,
		page: number,
		limit: number,
		options?: QueryOptions,
	): Promise<DatabaseResult<PaginatedResult<T>>> {
		try {
			const offset = (page - 1) * limit;
			const queryOptions = { ...options, limit, offset };

			// Get data
			const dataResult = await this.query<T>(table, queryOptions);
			if (!dataResult.success) {
				return createErrorResult(
					dataResult.error || "Pagination failed",
				) as DatabaseResult<PaginatedResult<T>>;
			}

			// Get count
			const countResult = await this.query<{ count: number }>(table, {
				...options,
				select: "count",
			});

			const count = countResult.data?.[0]?.count || 0;
			const pagination = calculatePagination(count, page, limit);

			return createSuccessResult({
				data: dataResult.data || [],
				...pagination,
			} as PaginatedResult<T>);
		} catch (error) {
			return createErrorResult(
				error instanceof Error ? error.message : "Pagination failed",
			) as DatabaseResult<PaginatedResult<T>>;
		}
	}

	/**
	 * Execute raw SQL query
	 * @param sql - SQL query
	 * @param params - Query parameters
	 * @returns Promise resolving to query result
	 */
	async rawQuery<T>(
		sql: string,
		params?: unknown[],
	): Promise<DatabaseResult<T[]>> {
		try {
			const { data, error } = await this.supabase.rpc("execute_sql", {
				params: params || [],
				sql,
			});

			if (error) {
				return handleDatabaseError(error) as DatabaseResult<T[]>;
			}

			return createSuccessResult(data || []);
		} catch (error) {
			return createErrorResult(
				error instanceof Error ? error.message : "Raw query failed",
			) as DatabaseResult<T[]>;
		}
	}

	/**
	 * Start a database transaction
	 * @returns Promise resolving to transaction object
	 */
	async transaction(): Promise<DatabaseTransaction> {
		// Note: Supabase doesn't support explicit transactions in the client
		// This is a placeholder for future implementation
		throw new Error(
			"Transactions not supported in client-side database service",
		);
	}

	/**
	 * Check database health
	 * @returns Promise resolving to health check result
	 */
	async healthCheck(): Promise<DatabaseHealthCheck> {
		const startTime = Date.now();

		try {
			const { error } = await this.supabase
				.from("_health_check")
				.select("*")
				.limit(1);
			const latency = Date.now() - startTime;

			return {
				error: error?.message,
				latency,
				status: error ? "unhealthy" : "healthy",
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : "Health check failed",
				latency: Date.now() - startTime,
				status: "unhealthy",
				timestamp: new Date().toISOString(),
			};
		}
	}
}

/**
 * Database service for server-side operations
 */
export class ServerDatabaseService extends DatabaseService {
	async initialize() {
		this.supabase = await createServerClient();
	}

	/**
	 * Execute a stored procedure
	 * @param procedure - Procedure name
	 * @param params - Procedure parameters
	 * @returns Promise resolving to procedure result
	 */
	async callProcedure<T>(
		procedure: string,
		params?: Record<string, unknown>,
	): Promise<DatabaseResult<T>> {
		try {
			const { data, error } = await this.supabase.rpc(procedure, params);

			if (error) {
				return handleDatabaseError(error) as DatabaseResult<T>;
			}

			return createSuccessResult(data);
		} catch (error) {
			return createErrorResult(
				error instanceof Error ? error.message : "Procedure call failed",
			) as DatabaseResult<T>;
		}
	}
}

// Export singleton instances
export const databaseService = new DatabaseService();

// Lazy-loaded server database service to avoid cookies() being called during build
let _serverDatabaseService: ServerDatabaseService | null = null;

export async function getServerDatabaseService(): Promise<ServerDatabaseService> {
	if (!_serverDatabaseService) {
		_serverDatabaseService = new ServerDatabaseService();
		await _serverDatabaseService.initialize();
	}
	return _serverDatabaseService;
}

// For backward compatibility, but this should be avoided in build contexts
export const serverDatabaseService = {
	get callProcedure() {
		return async <T>(procedure: string, params?: Record<string, unknown>) =>
			(await getServerDatabaseService()).callProcedure<T>(procedure, params);
	},
	get delete() {
		return async (table: string, id: string, options?: DeleteOptions) =>
			(await getServerDatabaseService()).delete(table, id, options);
	},
	get findById() {
		return async <T>(table: string, id: string) =>
			(await getServerDatabaseService()).findById<T>(table, id);
	},
	get healthCheck() {
		return async () => (await getServerDatabaseService()).healthCheck();
	},
	get insert() {
		return async <T>(
			table: string,
			data: Record<string, unknown>,
			options?: InsertOptions,
		) => (await getServerDatabaseService()).insert<T>(table, data, options);
	},
	get paginate() {
		return async <T>(
			table: string,
			page: number,
			limit: number,
			options?: QueryOptions,
		) =>
			(await getServerDatabaseService()).paginate<T>(
				table,
				page,
				limit,
				options,
			);
	},
	get query() {
		return async <T>(table: string, options?: QueryOptions) =>
			(await getServerDatabaseService()).query<T>(table, options);
	},
	get rawQuery() {
		return async <T>(sql: string, params?: unknown[]) =>
			(await getServerDatabaseService()).rawQuery<T>(sql, params);
	},
	get transaction() {
		return async () => (await getServerDatabaseService()).transaction();
	},
	get update() {
		return async (
			table: string,
			id: string,
			data: Record<string, unknown>,
			options?: UpdateOptions,
		) => (await getServerDatabaseService()).update(table, id, data, options);
	},
};
