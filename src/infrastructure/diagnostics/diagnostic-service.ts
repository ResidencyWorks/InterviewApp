import { healthService } from "@/features/scheduling/infrastructure/monitoring/health-service";
import type { ServiceHealthCheck } from "@/features/scheduling/infrastructure/monitoring/monitoring-types";
import { logger } from "@/infrastructure/logging/logger";

/**
 * Diagnostic information interface
 */
export interface DiagnosticInfo {
	timestamp: string;
	system: SystemInfo;
	application: ApplicationInfo;
	database: DatabaseInfo;
	cache: CacheInfo;
	external: ExternalServiceInfo;
	performance: PerformanceInfo;
	errors: ErrorInfo[];
}

export interface SystemInfo {
	platform: string;
	arch: string;
	nodeVersion: string;
	memory: {
		used: number;
		total: number;
		free: number;
	};
	cpu: {
		usage: number;
		cores: number;
	};
	uptime: number;
}

export interface ApplicationInfo {
	version: string;
	environment: string;
	buildTime: string;
	gitCommit: string;
	dependencies: Record<string, string>;
	routes: string[];
	proxy: string[];
}

export interface DatabaseInfo {
	connected: boolean;
	version?: string;
	connectionCount: number;
	queryCount: number;
	slowQueries: number;
	errors: number;
	lastError?: string;
}

export interface CacheInfo {
	connected: boolean;
	type: string;
	memoryUsage: number;
	hitRate: number;
	missRate: number;
	keys: number;
	errors: number;
	lastError?: string;
}

export interface ExternalServiceInfo {
	openai: ServiceStatus;
	posthog: ServiceStatus;
	sentry: ServiceStatus;
	supabase: ServiceStatus;
}

export interface ServiceStatus {
	connected: boolean;
	responseTime?: number;
	lastCheck: string;
	errors: number;
	lastError?: string;
}

export interface PerformanceInfo {
	responseTime: {
		average: number;
		p95: number;
		p99: number;
	};
	throughput: {
		requestsPerSecond: number;
		totalRequests: number;
	};
	errors: {
		rate: number;
		total: number;
	};
}

export interface ErrorInfo {
	id: string;
	message: string;
	stack?: string;
	timestamp: string;
	count: number;
	severity: "low" | "medium" | "high" | "critical";
	component: string;
	resolved: boolean;
}

/**
 * Diagnostic service for troubleshooting and system analysis
 */
export class DiagnosticService {
	private static instance: DiagnosticService;
	private errorHistory: Map<string, ErrorInfo> = new Map();
	private performanceMetrics: PerformanceInfo = {
		responseTime: { average: 0, p95: 0, p99: 0 },
		throughput: { requestsPerSecond: 0, totalRequests: 0 },
		errors: { rate: 0, total: 0 },
	};

	private constructor() {}

	static getInstance(): DiagnosticService {
		if (!DiagnosticService.instance) {
			DiagnosticService.instance = new DiagnosticService();
		}
		return DiagnosticService.instance;
	}

	/**
	 * Get comprehensive diagnostic information
	 */
	async getDiagnosticInfo(): Promise<DiagnosticInfo> {
		try {
			const [
				systemInfo,
				applicationInfo,
				databaseInfo,
				cacheInfo,
				externalInfo,
				performanceInfo,
				errors,
			] = await Promise.all([
				this.getSystemInfo(),
				this.getApplicationInfo(),
				this.getDatabaseInfo(),
				this.getCacheInfo(),
				this.getExternalServiceInfo(),
				this.getPerformanceInfo(),
				this.getErrorInfo(),
			]);

			return {
				timestamp: new Date().toISOString(),
				system: systemInfo,
				application: applicationInfo,
				database: databaseInfo,
				cache: cacheInfo,
				external: externalInfo,
				performance: performanceInfo,
				errors,
			};
		} catch (error) {
			logger.error("Failed to get diagnostic information", error as Error, {
				component: "DiagnosticService",
				action: "getDiagnosticInfo",
			});
			throw error;
		}
	}

	/**
	 * Get system information
	 */
	private async getSystemInfo(): Promise<SystemInfo> {
		const os = await import("node:os");

		return {
			platform: os.platform(),
			arch: os.arch(),
			nodeVersion: process.version,
			memory: {
				used: process.memoryUsage().heapUsed,
				total: process.memoryUsage().heapTotal,
				free: os.freemem(),
			},
			cpu: {
				usage: await this.getCpuUsage(),
				cores: os.cpus().length,
			},
			uptime: process.uptime(),
		};
	}

	/**
	 * Get application information
	 */
	private async getApplicationInfo(): Promise<ApplicationInfo> {
		const packageJson = await import("../../../package.json");

		return {
			version: packageJson.version,
			environment: process.env.NODE_ENV || "development",
			buildTime: process.env.BUILD_TIME || "unknown",
			gitCommit: process.env.GIT_COMMIT || "unknown",
			dependencies: packageJson.dependencies || {},
			routes: this.getApplicationRoutes(),
			proxy: this.getApplicationProxy(),
		};
	}

	/**
	 * Get database information
	 */
	private async getDatabaseInfo(): Promise<DatabaseInfo> {
		try {
			const health = await healthService.getSystemHealth();
			const dbHealth = health.services.find(
				(service) => service.service === "database",
			);
			let version = "unknown";

			if (dbHealth?.details && typeof dbHealth.details === "object") {
				const maybeVersion = (dbHealth.details as Record<string, unknown>)
					.version;
				if (typeof maybeVersion === "string") {
					version = maybeVersion;
				}
			}

			return {
				connected: dbHealth?.status === "healthy",
				version,
				connectionCount: 0, // Would need database-specific implementation
				queryCount: 0, // Would need database-specific implementation
				slowQueries: 0, // Would need database-specific implementation
				errors: 0, // Would need database-specific implementation
				lastError: dbHealth?.error,
			};
		} catch (error) {
			return {
				connected: false,
				connectionCount: 0,
				queryCount: 0,
				slowQueries: 0,
				errors: 1,
				lastError: (error as Error).message,
			};
		}
	}

	/**
	 * Get cache information
	 */
	private async getCacheInfo(): Promise<CacheInfo> {
		try {
			const health = await healthService.getSystemHealth();
			const cacheHealth = health.services.find(
				(service) => service.service === "redis",
			);

			return {
				connected: cacheHealth?.status === "healthy",
				type: "redis",
				memoryUsage: 0, // Would need Redis-specific implementation
				hitRate: 0, // Would need Redis-specific implementation
				missRate: 0, // Would need Redis-specific implementation
				keys: 0, // Would need Redis-specific implementation
				errors: 0, // Would need Redis-specific implementation
				lastError: cacheHealth?.error,
			};
		} catch (error) {
			return {
				connected: false,
				type: "redis",
				memoryUsage: 0,
				hitRate: 0,
				missRate: 0,
				keys: 0,
				errors: 1,
				lastError: (error as Error).message,
			};
		}
	}

	/**
	 * Get external service information
	 */
	private async getExternalServiceInfo(): Promise<ExternalServiceInfo> {
		try {
			const health = await healthService.getSystemHealth();

			return {
				openai: this.getServiceStatus(health.services, "openai"),
				posthog: this.getServiceStatus(health.services, "posthog"),
				sentry: this.getServiceStatus(health.services, "sentry"),
				supabase: this.getServiceStatus(health.services, "supabase"),
			};
		} catch (error) {
			const errorStatus: ServiceStatus = {
				connected: false,
				lastCheck: new Date().toISOString(),
				errors: 1,
				lastError: (error as Error).message,
			};

			return {
				openai: errorStatus,
				posthog: errorStatus,
				sentry: errorStatus,
				supabase: errorStatus,
			};
		}
	}

	/**
	 * Get performance information
	 */
	private async getPerformanceInfo(): Promise<PerformanceInfo> {
		return this.performanceMetrics;
	}

	/**
	 * Get error information
	 */
	private getErrorInfo(): ErrorInfo[] {
		return Array.from(this.errorHistory.values());
	}

	/**
	 * Record an error for diagnostic purposes
	 */
	recordError(
		error: Error,
		component: string,
		severity: "low" | "medium" | "high" | "critical" = "medium",
	): void {
		const errorKey = `${component}:${error.message}`;
		const existing = this.errorHistory.get(errorKey);

		if (existing) {
			existing.count++;
			existing.timestamp = new Date().toISOString();
		} else {
			this.errorHistory.set(errorKey, {
				id: errorKey,
				message: error.message,
				stack: error.stack,
				timestamp: new Date().toISOString(),
				count: 1,
				severity,
				component,
				resolved: false,
			});
		}

		// Keep only last 100 errors
		if (this.errorHistory.size > 100) {
			const oldestKey = this.errorHistory.keys().next().value;
			if (oldestKey) {
				this.errorHistory.delete(oldestKey);
			}
		}
	}

	/**
	 * Mark an error as resolved
	 */
	resolveError(errorId: string): boolean {
		const error = this.errorHistory.get(errorId);
		if (error) {
			error.resolved = true;
			return true;
		}
		return false;
	}

	/**
	 * Update performance metrics
	 */
	updatePerformanceMetrics(metrics: Partial<PerformanceInfo>): void {
		this.performanceMetrics = {
			...this.performanceMetrics,
			...metrics,
		};
	}

	/**
	 * Get CPU usage (simplified implementation)
	 */
	private async getCpuUsage(): Promise<number> {
		// This is a simplified implementation
		// In production, you'd want to use a more sophisticated CPU monitoring library
		return 0;
	}

	/**
	 * Get application routes
	 */
	private getApplicationRoutes(): string[] {
		// This would need to be implemented based on your routing system
		return [
			"/api/health",
			"/api/auth/login",
			"/api/auth/callback",
			"/api/evaluate",
			"/api/content/packs",
			"/api/user/profile",
		];
	}

	/**
	 * Get application proxy
	 */
	private getApplicationProxy(): string[] {
		// This would need to be implemented based on your proxy system
		return [
			"cors",
			"helmet",
			"compression",
			"rate-limit",
			"auth",
			"error-handler",
		];
	}

	/**
	 * Get service status from health check
	 */
	private getServiceStatus(
		services: ServiceHealthCheck[],
		serviceName: string,
	): ServiceStatus {
		const service = services.find((svc) => svc.service === serviceName);

		if (!service) {
			return {
				connected: false,
				lastCheck: new Date().toISOString(),
				errors: 1,
				lastError: "Service not found in health check",
			};
		}

		return {
			connected: service.status === "healthy",
			responseTime: service.latency,
			lastCheck: service.timestamp,
			errors: service.status === "healthy" ? 0 : 1,
			lastError: service.error,
		};
	}

	/**
	 * Generate diagnostic report
	 */
	async generateDiagnosticReport(): Promise<string> {
		const info = await this.getDiagnosticInfo();

		let report = `# Diagnostic Report\n\n`;
		report += `Generated: ${info.timestamp}\n\n`;

		// System Information
		report += `## System Information\n`;
		report += `- Platform: ${info.system.platform}\n`;
		report += `- Architecture: ${info.system.arch}\n`;
		report += `- Node Version: ${info.system.nodeVersion}\n`;
		report += `- Memory Usage: ${Math.round(info.system.memory.used / 1024 / 1024)}MB / ${Math.round(info.system.memory.total / 1024 / 1024)}MB\n`;
		report += `- CPU Cores: ${info.system.cpu.cores}\n`;
		report += `- Uptime: ${Math.round(info.system.uptime)}s\n\n`;

		// Application Information
		report += `## Application Information\n`;
		report += `- Version: ${info.application.version}\n`;
		report += `- Environment: ${info.application.environment}\n`;
		report += `- Build Time: ${info.application.buildTime}\n`;
		report += `- Git Commit: ${info.application.gitCommit}\n`;
		report += `- Routes: ${info.application.routes.length}\n`;
		report += `- Proxy: ${info.application.proxy.length}\n\n`;

		// Database Information
		report += `## Database Information\n`;
		report += `- Connected: ${info.database.connected ? "Yes" : "No"}\n`;
		if (info.database.version) {
			report += `- Version: ${info.database.version}\n`;
		}
		report += `- Connection Count: ${info.database.connectionCount}\n`;
		report += `- Query Count: ${info.database.queryCount}\n`;
		report += `- Slow Queries: ${info.database.slowQueries}\n`;
		report += `- Errors: ${info.database.errors}\n`;
		if (info.database.lastError) {
			report += `- Last Error: ${info.database.lastError}\n`;
		}
		report += `\n`;

		// Cache Information
		report += `## Cache Information\n`;
		report += `- Connected: ${info.cache.connected ? "Yes" : "No"}\n`;
		report += `- Type: ${info.cache.type}\n`;
		report += `- Memory Usage: ${info.cache.memoryUsage}MB\n`;
		report += `- Hit Rate: ${info.cache.hitRate}%\n`;
		report += `- Keys: ${info.cache.keys}\n`;
		report += `- Errors: ${info.cache.errors}\n`;
		if (info.cache.lastError) {
			report += `- Last Error: ${info.cache.lastError}\n`;
		}
		report += `\n`;

		// External Services
		report += `## External Services\n`;
		report += `- OpenAI: ${info.external.openai.connected ? "Connected" : "Disconnected"}\n`;
		report += `- PostHog: ${info.external.posthog.connected ? "Connected" : "Disconnected"}\n`;
		report += `- Sentry: ${info.external.sentry.connected ? "Connected" : "Disconnected"}\n`;
		report += `- Supabase: ${info.external.supabase.connected ? "Connected" : "Disconnected"}\n\n`;

		// Performance Information
		report += `## Performance Information\n`;
		report += `- Average Response Time: ${info.performance.responseTime.average}ms\n`;
		report += `- 95th Percentile: ${info.performance.responseTime.p95}ms\n`;
		report += `- 99th Percentile: ${info.performance.responseTime.p99}ms\n`;
		report += `- Requests/Second: ${info.performance.throughput.requestsPerSecond}\n`;
		report += `- Total Requests: ${info.performance.throughput.totalRequests}\n`;
		report += `- Error Rate: ${info.performance.errors.rate}%\n`;
		report += `- Total Errors: ${info.performance.errors.total}\n\n`;

		// Errors
		if (info.errors.length > 0) {
			report += `## Recent Errors\n`;
			info.errors.forEach((error) => {
				report += `- ${error.severity.toUpperCase()}: ${error.message} (${error.count} times)\n`;
				report += `  Component: ${error.component}\n`;
				report += `  Last Occurrence: ${error.timestamp}\n`;
				if (error.resolved) {
					report += `  Status: Resolved\n`;
				}
				report += `\n`;
			});
		}

		return report;
	}
}

// Export singleton instance
export const diagnosticService = DiagnosticService.getInstance();
