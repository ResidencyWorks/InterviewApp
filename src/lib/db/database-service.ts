import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildSelectQuery,
  calculatePagination,
  createErrorResult,
  createSuccessResult,
  handleDatabaseError,
  sanitizeTableName,
  validateQueryOptions,
} from './database-helpers'
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
} from './database-types'

/**
 * Database service for client-side operations
 */
export class DatabaseService implements DatabaseServiceInterface {
  private supabase: SupabaseClient

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient()
  }

  /**
   * Execute a query on a table
   * @param table - Table name
   * @param options - Query options
   * @returns Promise resolving to query result
   */
  async query<T>(
    table: string,
    options?: QueryOptions
  ): Promise<DatabaseResult<T[]>> {
    try {
      if (!validateQueryOptions(options)) {
        return createErrorResult('Invalid query options')
      }

      const sanitizedTable = sanitizeTableName(table)
      const { data, error } = await this.supabase
        .from(sanitizedTable)
        .select(buildSelectQuery(options?.select))
        .limit(options?.limit || 1000)

      if (error) {
        return handleDatabaseError(error)
      }

      return createSuccessResult(data as T[])
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Query failed'
      )
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
      const sanitizedTable = sanitizeTableName(table)
      const { data, error } = await this.supabase
        .from(sanitizedTable)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return handleDatabaseError(error)
      }

      return createSuccessResult(data)
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Find by ID failed'
      )
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
    data: any,
    options?: InsertOptions
  ): Promise<DatabaseResult<T>> {
    try {
      const sanitizedTable = sanitizeTableName(table)
      let query: any = this.supabase.from(sanitizedTable).insert(data)

      if (options?.returning) {
        query = query.select(options.returning)
      }

      if (options?.ignoreDuplicates) {
        // For now, just insert - upsert can be added later
        // query = query.upsert(data)
      }

      const { data: result, error } = await query

      if (error) {
        return handleDatabaseError(error)
      }

      return createSuccessResult(result?.[0] || result)
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Insert failed'
      )
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
    data: any,
    options?: UpdateOptions
  ): Promise<DatabaseResult<T>> {
    try {
      const sanitizedTable = sanitizeTableName(table)
      let query: any = this.supabase
        .from(sanitizedTable)
        .update(data)
        .eq('id', id)

      if (options?.returning) {
        query = query.select(options.returning)
      }

      if (options?.count) {
        // Count functionality can be added later
        // query = query.select('*', { count: options.count })
      }

      const { data: result, error } = await query

      if (error) {
        return handleDatabaseError(error)
      }

      return createSuccessResult(result?.[0] || result)
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Update failed'
      )
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
    options?: DeleteOptions
  ): Promise<DatabaseResult<boolean>> {
    try {
      const sanitizedTable = sanitizeTableName(table)
      let query: any = this.supabase.from(sanitizedTable).delete().eq('id', id)

      if (options?.returning) {
        query = query.select(options.returning)
      }

      if (options?.count) {
        // Count functionality can be added later
        // query = query.select('*', { count: options.count })
      }

      const { error } = await query

      if (error) {
        return handleDatabaseError(error)
      }

      return createSuccessResult(true)
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Delete failed'
      )
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
    options?: QueryOptions
  ): Promise<DatabaseResult<PaginatedResult<T>>> {
    try {
      const offset = (page - 1) * limit
      const queryOptions = { ...options, limit, offset }

      // Get data
      const dataResult = await this.query<T>(table, queryOptions)
      if (!dataResult.success) {
        return createErrorResult(dataResult.error || 'Pagination failed')
      }

      // Get count
      const countResult = await this.query<{ count: number }>(table, {
        ...options,
        select: 'count',
      })

      const count = countResult.data?.[0]?.count || 0
      const pagination = calculatePagination(count, page, limit)

      return createSuccessResult({
        data: dataResult.data || [],
        ...pagination,
      } as PaginatedResult<T>)
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Pagination failed'
      )
    }
  }

  /**
   * Execute raw SQL query
   * @param sql - SQL query
   * @param params - Query parameters
   * @returns Promise resolving to query result
   */
  async rawQuery<T>(sql: string, params?: any[]): Promise<DatabaseResult<T[]>> {
    try {
      const { data, error } = await this.supabase.rpc('execute_sql', {
        sql,
        params: params || [],
      })

      if (error) {
        return handleDatabaseError(error)
      }

      return createSuccessResult(data || [])
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Raw query failed'
      )
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
      'Transactions not supported in client-side database service'
    )
  }

  /**
   * Check database health
   * @returns Promise resolving to health check result
   */
  async healthCheck(): Promise<DatabaseHealthCheck> {
    const startTime = Date.now()

    try {
      const { error } = await this.supabase
        .from('_health_check')
        .select('*')
        .limit(1)
      const latency = Date.now() - startTime

      return {
        status: error ? 'unhealthy' : 'healthy',
        latency,
        error: error?.message,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
      }
    }
  }
}

/**
 * Database service for server-side operations
 */
export class ServerDatabaseService extends DatabaseService {
  constructor() {
    super(createServerClient())
  }

  /**
   * Execute a stored procedure
   * @param procedure - Procedure name
   * @param params - Procedure parameters
   * @returns Promise resolving to procedure result
   */
  async callProcedure<T>(
    procedure: string,
    params?: any
  ): Promise<DatabaseResult<T>> {
    try {
      const { data, error } = await (this as any).supabase.rpc(
        procedure,
        params
      )

      if (error) {
        return handleDatabaseError(error)
      }

      return createSuccessResult(data)
    } catch (error) {
      return createErrorResult(
        error instanceof Error ? error.message : 'Procedure call failed'
      )
    }
  }
}

// Export singleton instances
export const databaseService = new DatabaseService()
export const serverDatabaseService = new ServerDatabaseService()
