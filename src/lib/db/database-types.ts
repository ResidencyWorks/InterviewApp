/**
 * Database operation result interface
 */
export interface DatabaseResult<T = any> {
  data: T | null
  error: string | null
  success: boolean
}

/**
 * Database query options
 */
export interface QueryOptions {
  select?: string
  filters?: Record<string, any>
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Database insert options
 */
export interface InsertOptions {
  returning?: string
  ignoreDuplicates?: boolean
}

/**
 * Database update options
 */
export interface UpdateOptions {
  returning?: string
  count?: 'exact' | 'planned' | 'estimated'
}

/**
 * Database delete options
 */
export interface DeleteOptions {
  returning?: string
  count?: 'exact' | 'planned' | 'estimated'
}

/**
 * Pagination result interface
 */
export interface PaginatedResult<T> {
  data: T[]
  count: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Database transaction interface
 */
export interface DatabaseTransaction {
  commit: () => Promise<void>
  rollback: () => Promise<void>
  query: <T>(sql: string, params?: any[]) => Promise<DatabaseResult<T>>
}

/**
 * Database service interface
 */
export interface DatabaseServiceInterface {
  query: <T>(
    table: string,
    options?: QueryOptions
  ) => Promise<DatabaseResult<T[]>>
  findById: <T>(table: string, id: string) => Promise<DatabaseResult<T>>
  insert: <T>(
    table: string,
    data: any,
    options?: InsertOptions
  ) => Promise<DatabaseResult<T>>
  update: <T>(
    table: string,
    id: string,
    data: any,
    options?: UpdateOptions
  ) => Promise<DatabaseResult<T>>
  delete: (
    table: string,
    id: string,
    options?: DeleteOptions
  ) => Promise<DatabaseResult<boolean>>
  paginate: <T>(
    table: string,
    page: number,
    limit: number,
    options?: QueryOptions
  ) => Promise<DatabaseResult<PaginatedResult<T>>>
  transaction: () => Promise<DatabaseTransaction>
}

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  url: string
  anonKey: string
  serviceRoleKey?: string
  schema?: string
}

/**
 * Database health check result
 */
export interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy'
  latency: number
  error?: string
  timestamp: string
}
