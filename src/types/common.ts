/**
 * Common types and interfaces used across the application
 */

/**
 * Base entity interface
 */
export interface BaseEntity {
	id: string;
	created_at: string;
	updated_at: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
	data?: T;
	error?: string;
	message?: string;
	status: number;
	success: boolean;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
	page: number;
	limit: number;
	sort_by?: string;
	sort_order?: "asc" | "desc";
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		total_pages: number;
		has_next: boolean;
		has_prev: boolean;
	};
}

/**
 * Error response
 */
export interface ErrorResponse {
	error: string;
	code?: string;
	details?: Record<string, unknown>;
	timestamp: string;
}

/**
 * Success response
 */
export interface SuccessResponse<T = unknown> {
	data: T;
	message?: string;
	timestamp: string;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
	url: string;
	filename: string;
	size: number;
	mime_type: string;
	uploaded_at: string;
}

/**
 * Search parameters
 */
export interface SearchParams {
	query?: string;
	filters?: Record<string, unknown>;
	pagination?: PaginationParams;
}

/**
 * Audit trail entry
 */
export interface AuditEntry {
	id: string;
	user_id: string;
	action: string;
	resource_type: string;
	resource_id: string;
	changes?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	created_at: string;
}

/**
 * Configuration interface
 */
export interface AppConfig {
	app_name: string;
	version: string;
	environment: "development" | "staging" | "production";
	debug: boolean;
	features: Record<string, boolean>;
}

/**
 * Feature flag interface
 */
export interface FeatureFlag {
	name: string;
	enabled: boolean;
	description?: string;
	conditions?: Record<string, unknown>;
}

/**
 * Notification interface
 */
export interface Notification {
	id: string;
	user_id: string;
	type: "info" | "success" | "warning" | "error";
	title: string;
	message: string;
	read: boolean;
	created_at: string;
	expires_at?: string;
	action_url?: string;
}

/**
 * System status interface
 */
export interface SystemStatus {
	status: "operational" | "degraded" | "outage";
	message?: string;
	last_updated: string;
	services: {
		[key: string]: "operational" | "degraded" | "outage";
	};
}
