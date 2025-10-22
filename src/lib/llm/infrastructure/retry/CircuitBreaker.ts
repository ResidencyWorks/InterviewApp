/**
 * Circuit breaker implementation for handling service failures
 */

import type { CircuitBreakerConfig } from "../../types/config.js";

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = "closed" | "open" | "half-open";

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
	state: CircuitBreakerState;
	failureCount: number;
	successCount: number;
	lastFailureTime?: Date;
	lastSuccessTime?: Date;
	nextAttemptTime?: Date;
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
	private state: CircuitBreakerState = "closed";
	private failureCount = 0;
	private successCount = 0;
	private lastFailureTime?: Date;
	private lastSuccessTime?: Date;
	private nextAttemptTime?: Date;
	private config: CircuitBreakerConfig;

	constructor(config: CircuitBreakerConfig) {
		this.config = config;
	}

	/**
	 * Execute a function through the circuit breaker
	 */
	async execute<T>(operation: () => Promise<T>): Promise<T> {
		// Check if circuit breaker is open and should remain open
		if (this.state === "open") {
			if (this.nextAttemptTime && Date.now() < this.nextAttemptTime.getTime()) {
				throw new Error(
					`Circuit breaker is open. Next attempt allowed at ${this.nextAttemptTime.toISOString()}`,
				);
			}
			// Move to half-open state
			this.state = "half-open";
		}

		try {
			const result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	/**
	 * Handle successful operation
	 */
	private onSuccess(): void {
		this.successCount++;
		this.lastSuccessTime = new Date();

		if (this.state === "half-open") {
			// If we're in half-open state and got a success, close the circuit
			this.state = "closed";
			this.failureCount = 0;
		}
	}

	/**
	 * Handle failed operation
	 */
	private onFailure(): void {
		this.failureCount++;
		this.lastFailureTime = new Date();

		if (this.state === "half-open") {
			// If we're in half-open state and got a failure, open the circuit
			this.state = "open";
			this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
		} else if (
			this.state === "closed" &&
			this.failureCount >= this.config.threshold
		) {
			// If we're in closed state and hit the failure threshold, open the circuit
			this.state = "open";
			this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
		}
	}

	/**
	 * Get current circuit breaker statistics
	 */
	getStats(): CircuitBreakerStats {
		return {
			state: this.state,
			failureCount: this.failureCount,
			successCount: this.successCount,
			lastFailureTime: this.lastFailureTime,
			lastSuccessTime: this.lastSuccessTime,
			nextAttemptTime: this.nextAttemptTime,
		};
	}

	/**
	 * Reset the circuit breaker to closed state
	 */
	reset(): void {
		this.state = "closed";
		this.failureCount = 0;
		this.successCount = 0;
		this.lastFailureTime = undefined;
		this.lastSuccessTime = undefined;
		this.nextAttemptTime = undefined;
	}

	/**
	 * Check if the circuit breaker is available for requests
	 */
	isAvailable(): boolean {
		if (this.state === "closed") {
			return true;
		}

		if (this.state === "half-open") {
			return true;
		}

		if (this.state === "open") {
			return this.nextAttemptTime
				? Date.now() >= this.nextAttemptTime.getTime()
				: false;
		}

		return false;
	}

	/**
	 * Get the current state
	 */
	getState(): CircuitBreakerState {
		return this.state;
	}

	/**
	 * Update circuit breaker configuration
	 */
	updateConfig(config: Partial<CircuitBreakerConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): CircuitBreakerConfig {
		return { ...this.config };
	}
}

/**
 * Create a circuit breaker instance
 */
export function createCircuitBreaker(
	config: CircuitBreakerConfig,
): CircuitBreaker {
	return new CircuitBreaker(config);
}
