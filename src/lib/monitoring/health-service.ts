import { checkErrorMonitoringHealth } from "@/lib/error-monitoring";
import { checkOpenAIHealth } from "@/lib/openai";
import { checkRedisHealth } from "@/lib/redis";
import type {
	HealthCheckFunction,
	ServiceHealthCheck,
	SystemHealthCheck,
} from "./monitoring-types";

/**
 * Health check service for monitoring system components
 */
export class HealthService {
	private healthChecks = new Map<string, HealthCheckFunction>();
	private startTime = Date.now();

	/**
	 * Register a health check function for a service
	 * @param service - Service name
	 * @param check - Health check function
	 */
	registerHealthCheck(service: string, check: HealthCheckFunction): void {
		this.healthChecks.set(service, check);
	}

	/**
	 * Get health status for a specific service
	 * @param service - Service name
	 * @returns Promise resolving to service health check result
	 */
	async getServiceHealth(service: string): Promise<ServiceHealthCheck | null> {
		const check = this.healthChecks.get(service);
		if (!check) {
			return null;
		}

		try {
			return await check();
		} catch (error) {
			return {
				error: error instanceof Error ? error.message : "Unknown error",
				service,
				status: "unhealthy" as "healthy" | "unhealthy" | "degraded" | "unknown",
				timestamp: new Date().toISOString(),
			};
		}
	}

	/**
	 * Get overall system health status
	 * @returns Promise resolving to system health check result
	 */
	async getSystemHealth(): Promise<SystemHealthCheck> {
		const services: ServiceHealthCheck[] = [];
		let overallStatus: "healthy" | "unhealthy" | "degraded" | "unknown" =
			"healthy";

		// Check all registered services
		for (const [serviceName, check] of Array.from(
			this.healthChecks.entries(),
		)) {
			try {
				const result = await check();
				services.push(result);

				// Update overall status based on service status
				if (result.status === "unhealthy") {
					overallStatus = "unhealthy";
				} else if (
					result.status === "degraded" &&
					overallStatus === "healthy"
				) {
					overallStatus = "degraded";
				}
			} catch (error) {
				const errorResult: ServiceHealthCheck = {
					error: error instanceof Error ? error.message : "Unknown error",
					service: serviceName,
					status: "unhealthy" as
						| "healthy"
						| "unhealthy"
						| "degraded"
						| "unknown",
					timestamp: new Date().toISOString(),
				};
				services.push(errorResult);
				overallStatus = "unhealthy";
			}
		}

		return {
			services,
			status: overallStatus,
			timestamp: new Date().toISOString(),
			uptime: Date.now() - this.startTime,
			version: process.env.npm_package_version || "1.0.0",
		};
	}

	/**
	 * Check if system is healthy
	 * @returns Promise resolving to true if system is healthy
	 */
	async isHealthy(): Promise<boolean> {
		const health = await this.getSystemHealth();
		return health.status === "healthy";
	}

	/**
	 * Get unhealthy services
	 * @returns Promise resolving to array of unhealthy service names
	 */
	async getUnhealthyServices(): Promise<string[]> {
		const health = await this.getSystemHealth();
		return health.services
			.filter((service) => service.status === "unhealthy")
			.map((service) => service.service);
	}
}

/**
 * Redis health check
 */
export async function redisHealthCheck() {
	const startTime = Date.now();
	try {
		const isHealthy = await checkRedisHealth();
		const latency = Date.now() - startTime;

		return {
			details: {
				endpoint: process.env.UPSTASH_REDIS_REST_URL || "unknown",
				type: "cache",
			},
			latency,
			service: "redis",
			status: (isHealthy ? "healthy" : "unhealthy") as
				| "healthy"
				| "unhealthy"
				| "degraded"
				| "unknown",
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : "Unknown error",
			latency: Date.now() - startTime,
			service: "redis",
			status: "unhealthy" as "healthy" | "unhealthy" | "degraded" | "unknown",
			timestamp: new Date().toISOString(),
		};
	}
}

/**
 * OpenAI health check
 */
export async function openaiHealthCheck() {
	const startTime = Date.now();
	try {
		const isHealthy = await checkOpenAIHealth();
		const latency = Date.now() - startTime;

		return {
			details: {
				model: "gpt-4",
				type: "ai_service",
			},
			latency,
			service: "openai",
			status: (isHealthy ? "healthy" : "unhealthy") as
				| "healthy"
				| "unhealthy"
				| "degraded"
				| "unknown",
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : "Unknown error",
			latency: Date.now() - startTime,
			service: "openai",
			status: "unhealthy" as "healthy" | "unhealthy" | "degraded" | "unknown",
			timestamp: new Date().toISOString(),
		};
	}
}

/**
 * Error monitoring health check
 */
export async function errorMonitoringHealthCheck() {
	const startTime = Date.now();
	try {
		const isHealthy = await checkErrorMonitoringHealth();
		const latency = Date.now() - startTime;

		return {
			details: {
				provider: "sentry",
				type: "monitoring",
			},
			latency,
			service: "error_monitoring",
			status: (isHealthy ? "healthy" : "unhealthy") as
				| "healthy"
				| "unhealthy"
				| "degraded"
				| "unknown",
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : "Unknown error",
			latency: Date.now() - startTime,
			service: "error_monitoring",
			status: "unhealthy" as "healthy" | "unhealthy" | "degraded" | "unknown",
			timestamp: new Date().toISOString(),
		};
	}
}

/**
 * Database health check
 */
export async function databaseHealthCheck() {
	const startTime = Date.now();
	try {
		// Simple ping to Supabase
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
			{
				headers: {
					apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
				},
			},
		);
		const latency = Date.now() - startTime;

		return {
			details: {
				provider: "supabase",
				type: "database",
			},
			latency,
			service: "database",
			status: (response.ok ? "healthy" : "unhealthy") as
				| "healthy"
				| "unhealthy"
				| "degraded"
				| "unknown",
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : "Unknown error",
			latency: Date.now() - startTime,
			service: "database",
			status: "unhealthy" as "healthy" | "unhealthy" | "degraded" | "unknown",
			timestamp: new Date().toISOString(),
		};
	}
}

// Export singleton instance
export const healthService = new HealthService();

// Register default health checks
healthService.registerHealthCheck("redis", redisHealthCheck);
healthService.registerHealthCheck("openai", openaiHealthCheck);
healthService.registerHealthCheck(
	"error_monitoring",
	errorMonitoringHealthCheck,
);
healthService.registerHealthCheck("database", databaseHealthCheck);
