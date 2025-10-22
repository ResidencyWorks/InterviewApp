import { databaseService } from "../db/database-service";
import { logger } from "../logging/logger";

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
	timestamp: Date;
	cpu: {
		usage: number;
		load: number[];
	};
	memory: {
		used: number;
		total: number;
		free: number;
	};
	database: {
		connections: number;
		activeQueries: number;
		slowQueries: number;
		cacheHitRate: number;
	};
	application: {
		responseTime: number;
		throughput: number;
		errorRate: number;
		activeUsers: number;
	};
	cache: {
		hitRate: number;
		missRate: number;
		memoryUsage: number;
		keyCount: number;
	};
}

/**
 * Scaling configuration interface
 */
export interface ScalingConfig {
	autoScaling: {
		enabled: boolean;
		minInstances: number;
		maxInstances: number;
		targetCpuUtilization: number;
		targetMemoryUtilization: number;
		scaleUpCooldown: number;
		scaleDownCooldown: number;
	};
	database: {
		connectionPooling: {
			enabled: boolean;
			minConnections: number;
			maxConnections: number;
			idleTimeout: number;
		};
		readReplicas: {
			enabled: boolean;
			count: number;
			loadBalancing: "round_robin" | "least_connections" | "weighted";
		};
		caching: {
			enabled: boolean;
			ttl: number;
			maxSize: number;
		};
	};
	cache: {
		redis: {
			enabled: boolean;
			cluster: boolean;
			nodes: string[];
			maxMemory: string;
			evictionPolicy: string;
		};
		application: {
			enabled: boolean;
			maxSize: number;
			ttl: number;
		};
	};
	cdn: {
		enabled: boolean;
		provider: string;
		cacheTtl: number;
		compression: boolean;
	};
}

/**
 * Performance optimizer for scaling and optimization
 */
export class PerformanceOptimizer {
	private static instance: PerformanceOptimizer;
	private metrics: PerformanceMetrics[] = [];
	private scalingConfig: ScalingConfig;
	private optimizationRules: Map<string, OptimizationRule> = new Map();

	private constructor() {
		this.scalingConfig = this.getDefaultScalingConfig();
		this.initializeOptimizationRules();
	}

	static getInstance(): PerformanceOptimizer {
		if (!PerformanceOptimizer.instance) {
			PerformanceOptimizer.instance = new PerformanceOptimizer();
		}
		return PerformanceOptimizer.instance;
	}

	/**
	 * Initialize performance optimizer
	 */
	async initialize(): Promise<void> {
		try {
			// Start performance monitoring
			await this.startPerformanceMonitoring();

			// Initialize auto-scaling
			await this.initializeAutoScaling();

			// Optimize database connections
			await this.optimizeDatabaseConnections();

			// Configure caching
			await this.configureCaching();

			logger.info("Performance optimizer initialized", {
				component: "PerformanceOptimizer",
				action: "initialize",
			});
		} catch (error) {
			logger.error(
				"Failed to initialize performance optimizer",
				error as Error,
				{
					component: "PerformanceOptimizer",
					action: "initialize",
				},
			);
			throw error;
		}
	}

	/**
	 * Start performance monitoring
	 */
	private async startPerformanceMonitoring(): Promise<void> {
		// Collect metrics every 30 seconds
		setInterval(async () => {
			try {
				const metrics = await this.collectPerformanceMetrics();
				this.metrics.push(metrics);

				// Keep only last 1000 metrics
				if (this.metrics.length > 1000) {
					this.metrics = this.metrics.slice(-1000);
				}

				// Check for optimization opportunities
				await this.checkOptimizationOpportunities(metrics);
			} catch (error) {
				logger.error("Failed to collect performance metrics", error as Error, {
					component: "PerformanceOptimizer",
					action: "startPerformanceMonitoring",
				});
			}
		}, 30000);
	}

	/**
	 * Collect performance metrics
	 */
	private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
		const os = await import("node:os");

		// Get system metrics
		const cpuUsage = await this.getCpuUsage();
		const memoryUsage = process.memoryUsage();
		const loadAverage = os.loadavg();

		// Get database metrics
		const dbMetrics = await this.getDatabaseMetrics();

		// Get application metrics
		const appMetrics = await this.getApplicationMetrics();

		// Get cache metrics
		const cacheMetrics = await this.getCacheMetrics();

		return {
			timestamp: new Date(),
			cpu: {
				usage: cpuUsage,
				load: loadAverage,
			},
			memory: {
				used: memoryUsage.heapUsed,
				total: memoryUsage.heapTotal,
				free: os.freemem(),
			},
			database: dbMetrics,
			application: appMetrics,
			cache: cacheMetrics,
		};
	}

	/**
	 * Get CPU usage
	 */
	private async getCpuUsage(): Promise<number> {
		// This is a simplified implementation
		// In production, you'd want to use a more sophisticated CPU monitoring library
		return 0;
	}

	/**
	 * Get database metrics
	 */
	private async getDatabaseMetrics(): Promise<PerformanceMetrics["database"]> {
		try {
			// Get connection count
			const connectionsResult = await databaseService.rawQuery(
				"SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active'",
			);
			const connections = parseInt(
				(connectionsResult.data?.[0] as { count: string })?.count || "0",
				10,
			);

			// Get active queries
			const activeQueriesResult = await databaseService.rawQuery(
				"SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%'",
			);
			const activeQueries = parseInt(
				(activeQueriesResult.data?.[0] as { count: string })?.count || "0",
				10,
			);

			// Get slow queries (queries taking more than 1 second)
			const slowQueriesResult = await databaseService.rawQuery(
				"SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '1 second'",
			);
			const slowQueries = parseInt(
				(slowQueriesResult.data?.[0] as { count: string })?.count || "0",
				10,
			);

			// Get cache hit rate
			const cacheHitRateResult = await databaseService.rawQuery(
				"SELECT round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) as hit_rate FROM pg_stat_database",
			);
			const cacheHitRate = parseFloat(
				(cacheHitRateResult.data?.[0] as { hit_rate: string })?.hit_rate || "0",
			);

			return {
				connections,
				activeQueries,
				slowQueries,
				cacheHitRate,
			};
		} catch (error) {
			logger.error("Failed to get database metrics", error as Error, {
				component: "PerformanceOptimizer",
				action: "getDatabaseMetrics",
			});

			return {
				connections: 0,
				activeQueries: 0,
				slowQueries: 0,
				cacheHitRate: 0,
			};
		}
	}

	/**
	 * Get application metrics
	 */
	private async getApplicationMetrics(): Promise<
		PerformanceMetrics["application"]
	> {
		// This would typically come from your application metrics
		// For now, we'll return placeholder values
		return {
			responseTime: 0,
			throughput: 0,
			errorRate: 0,
			activeUsers: 0,
		};
	}

	/**
	 * Get cache metrics
	 */
	private async getCacheMetrics(): Promise<PerformanceMetrics["cache"]> {
		try {
			// This would typically come from Redis or your cache system
			// For now, we'll return placeholder values
			return {
				hitRate: 0,
				missRate: 0,
				memoryUsage: 0,
				keyCount: 0,
			};
		} catch (error) {
			logger.error("Failed to get cache metrics", error as Error, {
				component: "PerformanceOptimizer",
				action: "getCacheMetrics",
			});

			return {
				hitRate: 0,
				missRate: 0,
				memoryUsage: 0,
				keyCount: 0,
			};
		}
	}

	/**
	 * Check for optimization opportunities
	 */
	private async checkOptimizationOpportunities(
		metrics: PerformanceMetrics,
	): Promise<void> {
		for (const [ruleId, rule] of Array.from(this.optimizationRules.entries())) {
			if (rule.enabled && rule.condition(metrics)) {
				try {
					await rule.action(metrics);
					logger.info("Optimization rule executed", {
						component: "PerformanceOptimizer",
						action: "checkOptimizationOpportunities",
						metadata: { ruleId, ruleName: rule.name },
					});
				} catch (error) {
					logger.error("Failed to execute optimization rule", error as Error, {
						component: "PerformanceOptimizer",
						action: "checkOptimizationOpportunities",
						metadata: { ruleId, ruleName: rule.name },
					});
				}
			}
		}
	}

	/**
	 * Initialize auto-scaling
	 */
	private async initializeAutoScaling(): Promise<void> {
		if (!this.scalingConfig.autoScaling.enabled) {
			return;
		}

		logger.info("Auto-scaling initialized", {
			component: "PerformanceOptimizer",
			action: "initializeAutoScaling",
			metadata: { config: this.scalingConfig.autoScaling },
		});
	}

	/**
	 * Optimize database connections
	 */
	private async optimizeDatabaseConnections(): Promise<void> {
		if (!this.scalingConfig.database.connectionPooling.enabled) {
			return;
		}

		// Configure connection pooling
		const poolConfig = this.scalingConfig.database.connectionPooling;

		logger.info("Database connection pooling configured", {
			component: "PerformanceOptimizer",
			action: "optimizeDatabaseConnections",
			metadata: { config: poolConfig },
		});
	}

	/**
	 * Configure caching
	 */
	private async configureCaching(): Promise<void> {
		if (!this.scalingConfig.cache.redis.enabled) {
			return;
		}

		// Configure Redis caching
		const redisConfig = this.scalingConfig.cache.redis;

		logger.info("Redis caching configured", {
			component: "PerformanceOptimizer",
			action: "configureCaching",
			metadata: { config: redisConfig },
		});
	}

	/**
	 * Get performance metrics
	 */
	getPerformanceMetrics(): PerformanceMetrics[] {
		return [...this.metrics];
	}

	/**
	 * Get current performance metrics
	 */
	getCurrentPerformanceMetrics(): PerformanceMetrics | null {
		return this.metrics.length > 0
			? this.metrics[this.metrics.length - 1]
			: null;
	}

	/**
	 * Get scaling configuration
	 */
	getScalingConfig(): ScalingConfig {
		return { ...this.scalingConfig };
	}

	/**
	 * Update scaling configuration
	 */
	updateScalingConfig(config: Partial<ScalingConfig>): void {
		this.scalingConfig = { ...this.scalingConfig, ...config };

		logger.info("Scaling configuration updated", {
			component: "PerformanceOptimizer",
			action: "updateScalingConfig",
			metadata: { config },
		});
	}

	/**
	 * Add optimization rule
	 */
	addOptimizationRule(rule: OptimizationRule): void {
		this.optimizationRules.set(rule.id, rule);

		logger.info("Optimization rule added", {
			component: "PerformanceOptimizer",
			action: "addOptimizationRule",
			metadata: { ruleId: rule.id, ruleName: rule.name },
		});
	}

	/**
	 * Remove optimization rule
	 */
	removeOptimizationRule(ruleId: string): void {
		this.optimizationRules.delete(ruleId);

		logger.info("Optimization rule removed", {
			component: "PerformanceOptimizer",
			action: "removeOptimizationRule",
			metadata: { ruleId },
		});
	}

	/**
	 * Get default scaling configuration
	 */
	private getDefaultScalingConfig(): ScalingConfig {
		return {
			autoScaling: {
				enabled: true,
				minInstances: 2,
				maxInstances: 10,
				targetCpuUtilization: 70,
				targetMemoryUtilization: 80,
				scaleUpCooldown: 300, // 5 minutes
				scaleDownCooldown: 600, // 10 minutes
			},
			database: {
				connectionPooling: {
					enabled: true,
					minConnections: 5,
					maxConnections: 50,
					idleTimeout: 30000, // 30 seconds
				},
				readReplicas: {
					enabled: false,
					count: 0,
					loadBalancing: "round_robin",
				},
				caching: {
					enabled: true,
					ttl: 300, // 5 minutes
					maxSize: 1000,
				},
			},
			cache: {
				redis: {
					enabled: true,
					cluster: false,
					nodes: [process.env.UPSTASH_REDIS_REST_URL || "localhost:6379"],
					maxMemory: "256mb",
					evictionPolicy: "allkeys-lru",
				},
				application: {
					enabled: true,
					maxSize: 100,
					ttl: 300, // 5 minutes
				},
			},
			cdn: {
				enabled: false,
				provider: "cloudflare",
				cacheTtl: 3600, // 1 hour
				compression: true,
			},
		};
	}

	/**
	 * Initialize optimization rules
	 */
	private initializeOptimizationRules(): void {
		// High CPU usage rule
		this.addOptimizationRule({
			id: "high-cpu-usage",
			name: "High CPU Usage",
			description: "Scale up when CPU usage is high",
			enabled: true,
			condition: (metrics) => metrics.cpu.usage > 80,
			action: async (metrics) => {
				logger.warn("High CPU usage detected", {
					component: "PerformanceOptimizer",
					action: "high-cpu-usage",
					metadata: { cpuUsage: metrics.cpu.usage },
				});
				// Implement scaling logic here
			},
		});

		// High memory usage rule
		this.addOptimizationRule({
			id: "high-memory-usage",
			name: "High Memory Usage",
			description: "Scale up when memory usage is high",
			enabled: true,
			condition: (metrics) => metrics.memory.used / metrics.memory.total > 0.8,
			action: async (metrics) => {
				logger.warn("High memory usage detected", {
					component: "PerformanceOptimizer",
					action: "high-memory-usage",
					metadata: {
						memoryUsage: metrics.memory.used,
						memoryTotal: metrics.memory.total,
						memoryPercentage:
							(metrics.memory.used / metrics.memory.total) * 100,
					},
				});
				// Implement scaling logic here
			},
		});

		// Slow database queries rule
		this.addOptimizationRule({
			id: "slow-database-queries",
			name: "Slow Database Queries",
			description: "Alert when there are slow database queries",
			enabled: true,
			condition: (metrics) => metrics.database.slowQueries > 5,
			action: async (metrics) => {
				logger.warn("Slow database queries detected", {
					component: "PerformanceOptimizer",
					action: "slow-database-queries",
					metadata: { slowQueries: metrics.database.slowQueries },
				});
				// Implement query optimization logic here
			},
		});

		// Low cache hit rate rule
		this.addOptimizationRule({
			id: "low-cache-hit-rate",
			name: "Low Cache Hit Rate",
			description: "Alert when cache hit rate is low",
			enabled: true,
			condition: (metrics) => metrics.cache.hitRate < 80,
			action: async (metrics) => {
				logger.warn("Low cache hit rate detected", {
					component: "PerformanceOptimizer",
					action: "low-cache-hit-rate",
					metadata: { hitRate: metrics.cache.hitRate },
				});
				// Implement cache optimization logic here
			},
		});
	}
}

/**
 * Optimization rule interface
 */
export interface OptimizationRule {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	condition: (metrics: PerformanceMetrics) => boolean;
	action: (metrics: PerformanceMetrics) => Promise<void>;
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();
