/**
 * Monitoring and health check types
 */

/**
 * Health check status
 */
export type HealthStatus = "healthy" | "unhealthy" | "degraded" | "unknown";

/**
 * Service health check result
 */
export interface ServiceHealthCheck {
	service: string;
	status: HealthStatus;
	latency?: number;
	error?: string;
	timestamp: string;
	details?: Record<string, unknown>;
}

/**
 * Overall system health check result
 */
export interface SystemHealthCheck {
	status: HealthStatus;
	timestamp: string;
	services: ServiceHealthCheck[];
	uptime: number;
	version: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
	name: string;
	value: number;
	unit: string;
	timestamp: string;
	tags?: Record<string, string>;
}

/**
 * Performance threshold
 */
export interface PerformanceThreshold {
	name: string;
	warning: number;
	critical: number;
	unit: string;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
	id: string;
	name: string;
	value: number;
	threshold: number;
	severity: "warning" | "critical";
	timestamp: string;
	message: string;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
	healthCheckInterval: number;
	performanceCheckInterval: number;
	alertThresholds: PerformanceThreshold[];
	enabledServices: string[];
}

/**
 * Health check function type
 */
export type HealthCheckFunction = () => Promise<ServiceHealthCheck>;

/**
 * Performance metric collector function type
 */
export type PerformanceCollectorFunction = () => Promise<PerformanceMetrics[]>;

/**
 * Alert handler function type
 */
export type AlertHandlerFunction = (alert: PerformanceAlert) => Promise<void>;

/**
 * Monitoring service interface
 */
export interface MonitoringServiceInterface {
	registerHealthCheck: (service: string, check: HealthCheckFunction) => void;
	registerPerformanceCollector: (
		name: string,
		collector: PerformanceCollectorFunction,
	) => void;
	registerAlertHandler: (handler: AlertHandlerFunction) => void;
	getSystemHealth: () => Promise<SystemHealthCheck>;
	getServiceHealth: (service: string) => Promise<ServiceHealthCheck | null>;
	getPerformanceMetrics: (name?: string) => Promise<PerformanceMetrics[]>;
	checkThresholds: () => Promise<PerformanceAlert[]>;
	startMonitoring: () => void;
	stopMonitoring: () => void;
}
