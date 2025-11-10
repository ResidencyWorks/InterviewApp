import type { NextRequest, NextResponse } from "next/server";

/**
 * API route handler function type
 */
export type ApiRouteHandler = (
	request: NextRequest,
	context?: Record<string, unknown>,
) => Promise<NextResponse>;

/**
 * API middleware function type
 */
export type ApiMiddleware = (
	request: NextRequest,
	next: () => Promise<NextResponse>,
) => Promise<NextResponse>;

/**
 * API error handler function type
 */
export type ApiErrorHandler = (
	error: Error,
	request: NextRequest,
	context?: Record<string, unknown>,
) => Promise<NextResponse>;

/**
 * API validation function type
 */
export type ApiValidator<T = unknown> = (data: unknown) => {
	success: boolean;
	data?: T;
	error?: string;
};

/**
 * API rate limit configuration
 */
export interface RateLimitConfig {
	windowMs: number;
	maxRequests: number;
	keyGenerator?: (request: NextRequest) => string;
	skipSuccessfulRequests?: boolean;
	skipFailedRequests?: boolean;
}

/**
 * API authentication configuration
 */
export interface AuthConfig {
	required: boolean;
	roles?: string[];
	permissions?: string[];
	redirectTo?: string;
}

/**
 * API route configuration
 */
export interface RouteConfig {
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	path: string;
	handler: ApiRouteHandler;
	middleware?: ApiMiddleware[];
	auth?: AuthConfig;
	rateLimit?: RateLimitConfig;
	validation?: ApiValidator;
	description?: string;
	tags?: string[];
}

/**
 * API response builder options
 */
export interface ResponseBuilderOptions {
	status?: number;
	headers?: Record<string, string>;
	cache?: {
		maxAge?: number;
		sMaxAge?: number;
		staleWhileRevalidate?: number;
	};
}

/**
 * API error context
 */
export interface ApiErrorContext {
	request: NextRequest;
	route: string;
	method: string;
	userId?: string;
	timestamp: string;
	userAgent?: string;
	ipAddress?: string;
}

/**
 * API logging configuration
 */
export interface ApiLoggingConfig {
	enabled: boolean;
	level: "debug" | "info" | "warn" | "error";
	includeRequestBody?: boolean;
	includeResponseBody?: boolean;
	includeHeaders?: boolean;
	excludePaths?: string[];
}

/**
 * API monitoring configuration
 */
export interface ApiMonitoringConfig {
	enabled: boolean;
	trackPerformance: boolean;
	trackErrors: boolean;
	trackUsage: boolean;
	alertThresholds?: {
		responseTime?: number;
		errorRate?: number;
		requestRate?: number;
	};
}

/**
 * API security configuration
 */
export interface ApiSecurityConfig {
	cors?: {
		origin: string | string[];
		methods?: string[];
		allowedHeaders?: string[];
		credentials?: boolean;
	};
	helmet?: {
		contentSecurityPolicy?: boolean;
		hsts?: boolean;
		noSniff?: boolean;
		xssFilter?: boolean;
	};
	rateLimit?: RateLimitConfig;
}

/**
 * API configuration
 */
export interface ApiConfig {
	basePath: string;
	version: string;
	logging: ApiLoggingConfig;
	monitoring: ApiMonitoringConfig;
	security: ApiSecurityConfig;
	routes: RouteConfig[];
}
