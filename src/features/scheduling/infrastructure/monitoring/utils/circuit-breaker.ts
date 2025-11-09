/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
	CLOSED = "CLOSED",
	OPEN = "OPEN",
	HALF_OPEN = "HALF_OPEN",
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
	/**
	 * Failure threshold to open the circuit
	 */
	failureThreshold: number;

	/**
	 * Timeout in milliseconds to wait before trying to close the circuit
	 */
	timeout: number;

	/**
	 * Number of successful calls needed to close the circuit from half-open state
	 */
	successThreshold: number;

	/**
	 * Time window in milliseconds for counting failures
	 */
	timeWindow: number;

	/**
	 * Whether to enable the circuit breaker
	 */
	enabled: boolean;

	/**
	 * Custom error filter function
	 */
	errorFilter?: (error: Error) => boolean;
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
	state: CircuitBreakerState;
	totalCalls: number;
	successfulCalls: number;
	failedCalls: number;
	lastFailureTime?: Date;
	lastSuccessTime?: Date;
	nextAttemptTime?: Date;
	consecutiveFailures: number;
	consecutiveSuccesses: number;
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerError extends Error {
	constructor(
		message: string,
		public readonly state: CircuitBreakerState,
		public readonly retryAfter?: number,
	) {
		super(message);
		this.name = "CircuitBreakerError";
	}
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
	private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
	private stats: CircuitBreakerStats;
	private config: CircuitBreakerConfig;
	private failureCount = 0;
	private successCount = 0;
	private lastFailureTime?: Date;
	private lastSuccessTime?: Date;
	private nextAttemptTime?: Date;

	constructor(config: CircuitBreakerConfig) {
		this.config = config;
		this.stats = {
			state: this.state,
			totalCalls: 0,
			successfulCalls: 0,
			failedCalls: 0,
			consecutiveFailures: 0,
			consecutiveSuccesses: 0,
		};
	}

	/**
	 * Execute a function with circuit breaker protection
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		if (!this.config.enabled) {
			return fn();
		}

		this.stats.totalCalls++;

		// Check if circuit is open
		if (this.state === CircuitBreakerState.OPEN) {
			if (this.nextAttemptTime && Date.now() < this.nextAttemptTime.getTime()) {
				const retryAfter = Math.ceil(
					(this.nextAttemptTime.getTime() - Date.now()) / 1000,
				);
				throw new CircuitBreakerError(
					"Circuit breaker is open",
					CircuitBreakerState.OPEN,
					retryAfter,
				);
			}
			// Move to half-open state
			this.state = CircuitBreakerState.HALF_OPEN;
			this.stats.state = this.state;
		}

		try {
			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure(error as Error);
			throw error;
		}
	}

	/**
	 * Handle successful execution
	 */
	private onSuccess(): void {
		this.lastSuccessTime = new Date();
		this.stats.lastSuccessTime = this.lastSuccessTime;
		this.stats.successfulCalls++;
		this.stats.consecutiveSuccesses++;
		this.successCount++;

		if (this.state === CircuitBreakerState.HALF_OPEN) {
			if (this.successCount >= this.config.successThreshold) {
				this.state = CircuitBreakerState.CLOSED;
				this.stats.state = this.state;
				this.resetCounters();
			}
		} else if (this.state === CircuitBreakerState.CLOSED) {
			this.failureCount = 0;
			this.stats.consecutiveFailures = 0;
		}
	}

	/**
	 * Handle failed execution
	 */
	private onFailure(error: Error): void {
		// Check if error should be counted as a failure
		if (this.config.errorFilter && !this.config.errorFilter(error)) {
			return;
		}

		this.lastFailureTime = new Date();
		this.stats.lastFailureTime = this.lastFailureTime;
		this.stats.failedCalls++;
		this.stats.consecutiveFailures++;
		this.failureCount++;

		if (this.state === CircuitBreakerState.CLOSED) {
			if (this.failureCount >= this.config.failureThreshold) {
				this.state = CircuitBreakerState.OPEN;
				this.stats.state = this.state;
				this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
				this.stats.nextAttemptTime = this.nextAttemptTime;
			}
		} else if (this.state === CircuitBreakerState.HALF_OPEN) {
			this.state = CircuitBreakerState.OPEN;
			this.stats.state = this.state;
			this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
			this.stats.nextAttemptTime = this.nextAttemptTime;
			this.resetCounters();
		}
	}

	/**
	 * Reset counters
	 */
	private resetCounters(): void {
		this.failureCount = 0;
		this.successCount = 0;
		this.stats.consecutiveFailures = 0;
		this.stats.consecutiveSuccesses = 0;
	}

	/**
	 * Get current state
	 */
	getState(): CircuitBreakerState {
		return this.state;
	}

	/**
	 * Get statistics
	 */
	getStats(): CircuitBreakerStats {
		return { ...this.stats };
	}

	/**
	 * Get configuration
	 */
	getConfig(): CircuitBreakerConfig {
		return { ...this.config };
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<CircuitBreakerConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Reset circuit breaker to closed state
	 */
	reset(): void {
		this.state = CircuitBreakerState.CLOSED;
		this.stats.state = this.state;
		this.resetCounters();
		this.nextAttemptTime = undefined;
		this.stats.nextAttemptTime = undefined;
	}

	/**
	 * Check if circuit breaker is healthy
	 */
	isHealthy(): boolean {
		return this.state === CircuitBreakerState.CLOSED;
	}

	/**
	 * Check if circuit breaker is available for requests
	 */
	isAvailable(): boolean {
		if (!this.config.enabled) {
			return true;
		}

		if (this.state === CircuitBreakerState.CLOSED) {
			return true;
		}

		if (this.state === CircuitBreakerState.HALF_OPEN) {
			return true;
		}

		if (this.state === CircuitBreakerState.OPEN) {
			if (
				this.nextAttemptTime &&
				Date.now() >= this.nextAttemptTime.getTime()
			) {
				return true;
			}
			return false;
		}

		return false;
	}

	/**
	 * Get time until next attempt (in seconds)
	 */
	getTimeUntilNextAttempt(): number {
		if (this.state !== CircuitBreakerState.OPEN || !this.nextAttemptTime) {
			return 0;
		}

		const timeUntilNext = this.nextAttemptTime.getTime() - Date.now();
		return Math.max(0, Math.ceil(timeUntilNext / 1000));
	}

	/**
	 * Get failure rate
	 */
	getFailureRate(): number {
		if (this.stats.totalCalls === 0) {
			return 0;
		}
		return this.stats.failedCalls / this.stats.totalCalls;
	}

	/**
	 * Get success rate
	 */
	getSuccessRate(): number {
		if (this.stats.totalCalls === 0) {
			return 0;
		}
		return this.stats.successfulCalls / this.stats.totalCalls;
	}
}

/**
 * Circuit breaker manager for multiple services
 */
export class CircuitBreakerManager {
	private circuitBreakers: Map<string, CircuitBreaker> = new Map();

	/**
	 * Create or get a circuit breaker for a service
	 */
	getCircuitBreaker(
		serviceName: string,
		config: CircuitBreakerConfig,
	): CircuitBreaker {
		if (!this.circuitBreakers.has(serviceName)) {
			this.circuitBreakers.set(serviceName, new CircuitBreaker(config));
		}
		return this.circuitBreakers.get(serviceName)!;
	}

	/**
	 * Execute a function with circuit breaker protection for a specific service
	 */
	async execute<T>(serviceName: string, fn: () => Promise<T>): Promise<T> {
		const circuitBreaker = this.circuitBreakers.get(serviceName);
		if (!circuitBreaker) {
			throw new Error(`Circuit breaker not found for service: ${serviceName}`);
		}
		return circuitBreaker.execute(fn);
	}

	/**
	 * Get all circuit breaker statistics
	 */
	getAllStats(): Record<string, CircuitBreakerStats> {
		const stats: Record<string, CircuitBreakerStats> = {};
		this.circuitBreakers.forEach((circuitBreaker, serviceName) => {
			stats[serviceName] = circuitBreaker.getStats();
		});
		return stats;
	}

	/**
	 * Get circuit breaker statistics for a specific service
	 */
	getStats(serviceName: string): CircuitBreakerStats | undefined {
		return this.circuitBreakers.get(serviceName)?.getStats();
	}

	/**
	 * Reset a circuit breaker for a specific service
	 */
	reset(serviceName: string): void {
		this.circuitBreakers.get(serviceName)?.reset();
	}

	/**
	 * Reset all circuit breakers
	 */
	resetAll(): void {
		this.circuitBreakers.forEach((circuitBreaker) => {
			circuitBreaker.reset();
		});
	}

	/**
	 * Check if a service is healthy
	 */
	isHealthy(serviceName: string): boolean {
		return this.circuitBreakers.get(serviceName)?.isHealthy() ?? true;
	}

	/**
	 * Check if a service is available
	 */
	isAvailable(serviceName: string): boolean {
		return this.circuitBreakers.get(serviceName)?.isAvailable() ?? true;
	}

	/**
	 * Get overall health status
	 */
	getOverallHealth(): {
		healthy: string[];
		unhealthy: string[];
		total: number;
	} {
		const healthy: string[] = [];
		const unhealthy: string[] = [];

		this.circuitBreakers.forEach((circuitBreaker, serviceName) => {
			if (circuitBreaker.isHealthy()) {
				healthy.push(serviceName);
			} else {
				unhealthy.push(serviceName);
			}
		});

		return {
			healthy,
			unhealthy,
			total: this.circuitBreakers.size,
		};
	}
}

/**
 * Default circuit breaker configurations
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
	failureThreshold: 5,
	timeout: 30000, // 30 seconds
	successThreshold: 3,
	timeWindow: 60000, // 1 minute
	enabled: true,
};

export const STRICT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
	failureThreshold: 3,
	timeout: 60000, // 1 minute
	successThreshold: 2,
	timeWindow: 30000, // 30 seconds
	enabled: true,
};

export const LENIENT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
	failureThreshold: 10,
	timeout: 15000, // 15 seconds
	successThreshold: 5,
	timeWindow: 120000, // 2 minutes
	enabled: true,
};

/**
 * Convenience functions
 */
export function createCircuitBreaker(
	config: CircuitBreakerConfig,
): CircuitBreaker {
	return new CircuitBreaker(config);
}

export function createDefaultCircuitBreaker(): CircuitBreaker {
	return new CircuitBreaker(DEFAULT_CIRCUIT_BREAKER_CONFIG);
}

export function createStrictCircuitBreaker(): CircuitBreaker {
	return new CircuitBreaker(STRICT_CIRCUIT_BREAKER_CONFIG);
}

export function createLenientCircuitBreaker(): CircuitBreaker {
	return new CircuitBreaker(LENIENT_CIRCUIT_BREAKER_CONFIG);
}

export function createCircuitBreakerManager(): CircuitBreakerManager {
	return new CircuitBreakerManager();
}
