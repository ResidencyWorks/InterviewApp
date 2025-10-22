/**
 * Circuit breaker implementation for handling service failures
 */

import type { CircuitBreakerConfig } from "../../types/config.js";

/**
 * Circuit breaker events
 */
export interface CircuitBreakerEvent {
	type: "state_change" | "failure" | "success" | "timeout";
	state: CircuitBreakerState;
	timestamp: Date;
	details?: Record<string, unknown>;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
	totalRequests: number;
	totalFailures: number;
	totalSuccesses: number;
	failureRate: number;
	successRate: number;
	averageResponseTime: number;
	lastStateChange: Date;
	stateHistory: Array<{
		state: CircuitBreakerState;
		timestamp: Date;
		duration: number;
	}>;
}

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
	private totalRequests = 0;
	private totalFailures = 0;
	private totalSuccesses = 0;
	private responseTimes: number[] = [];
	private stateHistory: Array<{
		state: CircuitBreakerState;
		timestamp: Date;
		duration: number;
	}> = [];
	private lastStateChange = new Date();
	private eventListeners: Array<(event: CircuitBreakerEvent) => void> = [];

	constructor(config: CircuitBreakerConfig) {
		this.config = config;
		this.recordStateChange("closed");
	}

	/**
	 * Execute a function through the circuit breaker
	 */
	async execute<T>(operation: () => Promise<T>): Promise<T> {
		const startTime = Date.now();
		this.totalRequests++;

		// Check if circuit breaker is open and should remain open
		if (this.state === "open") {
			if (this.nextAttemptTime && Date.now() < this.nextAttemptTime.getTime()) {
				this.emitEvent({
					type: "timeout",
					state: this.state,
					timestamp: new Date(),
					details: {
						nextAttemptTime: this.nextAttemptTime,
					},
				});
				throw new Error(
					`Circuit breaker is open. Next attempt allowed at ${this.nextAttemptTime.toISOString()}`,
				);
			}
			// Move to half-open state
			this.recordStateChange("half-open");
		}

		try {
			const result = await operation();
			const responseTime = Date.now() - startTime;
			this.responseTimes.push(responseTime);

			// Keep only last 1000 response times
			if (this.responseTimes.length > 1000) {
				this.responseTimes = this.responseTimes.slice(-1000);
			}

			this.onSuccess();
			return result;
		} catch (error) {
			const responseTime = Date.now() - startTime;
			this.responseTimes.push(responseTime);

			this.onFailure();
			throw error;
		}
	}

	/**
	 * Handle successful operation
	 */
	private onSuccess(): void {
		this.successCount++;
		this.totalSuccesses++;
		this.lastSuccessTime = new Date();

		// Emit success event
		this.emitEvent({
			type: "success",
			state: this.state,
			timestamp: new Date(),
			details: {
				successCount: this.successCount,
				failureCount: this.failureCount,
			},
		});

		if (this.state === "half-open") {
			// If we're in half-open state and got a success, close the circuit
			this.recordStateChange("closed");
			this.failureCount = 0;
		}
	}

	/**
	 * Handle failed operation
	 */
	private onFailure(): void {
		this.failureCount++;
		this.totalFailures++;
		this.lastFailureTime = new Date();

		// Emit failure event
		this.emitEvent({
			type: "failure",
			state: this.state,
			timestamp: new Date(),
			details: {
				failureCount: this.failureCount,
				successCount: this.successCount,
			},
		});

		if (this.state === "half-open") {
			// If we're in half-open state and got a failure, open the circuit
			this.recordStateChange("open");
			this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
		} else if (
			this.state === "closed" &&
			this.failureCount >= this.config.threshold
		) {
			// If we're in closed state and hit the failure threshold, open the circuit
			this.recordStateChange("open");
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

	/**
	 * Add event listener
	 */
	addEventListener(listener: (event: CircuitBreakerEvent) => void): void {
		this.eventListeners.push(listener);
	}

	/**
	 * Remove event listener
	 */
	removeEventListener(listener: (event: CircuitBreakerEvent) => void): void {
		const index = this.eventListeners.indexOf(listener);
		if (index > -1) {
			this.eventListeners.splice(index, 1);
		}
	}

	/**
	 * Emit event to listeners
	 */
	private emitEvent(event: CircuitBreakerEvent): void {
		this.eventListeners.forEach((listener) => {
			try {
				listener(event);
			} catch (error) {
				// Don't let listener errors break the circuit breaker
				console.error("Circuit breaker event listener error:", error);
			}
		});
	}

	/**
	 * Record state change
	 */
	private recordStateChange(newState: CircuitBreakerState): void {
		const now = new Date();
		const previousState = this.state;

		if (previousState !== newState) {
			// Record duration of previous state
			if (this.stateHistory.length > 0) {
				const lastEntry = this.stateHistory[this.stateHistory.length - 1];
				lastEntry.duration = now.getTime() - lastEntry.timestamp.getTime();
			}

			// Add new state entry
			this.stateHistory.push({
				state: newState,
				timestamp: now,
				duration: 0,
			});

			// Keep only last 100 state changes
			if (this.stateHistory.length > 100) {
				this.stateHistory = this.stateHistory.slice(-100);
			}

			this.lastStateChange = now;
			this.state = newState;

			// Emit state change event
			this.emitEvent({
				type: "state_change",
				state: newState,
				timestamp: now,
				details: {
					previousState,
					failureCount: this.failureCount,
					successCount: this.successCount,
				},
			});
		}
	}

	/**
	 * Get comprehensive metrics
	 */
	getMetrics(): CircuitBreakerMetrics {
		const totalRequests = this.totalRequests;
		const failureRate =
			totalRequests > 0 ? (this.totalFailures / totalRequests) * 100 : 0;
		const successRate =
			totalRequests > 0 ? (this.totalSuccesses / totalRequests) * 100 : 0;
		const averageResponseTime =
			this.responseTimes.length > 0
				? this.responseTimes.reduce((sum, time) => sum + time, 0) /
					this.responseTimes.length
				: 0;

		return {
			totalRequests,
			totalFailures: this.totalFailures,
			totalSuccesses: this.totalSuccesses,
			failureRate,
			successRate,
			averageResponseTime,
			lastStateChange: this.lastStateChange,
			stateHistory: [...this.stateHistory],
		};
	}

	/**
	 * Reset metrics
	 */
	resetMetrics(): void {
		this.totalRequests = 0;
		this.totalFailures = 0;
		this.totalSuccesses = 0;
		this.responseTimes = [];
		this.stateHistory = [];
		this.lastStateChange = new Date();
		this.recordStateChange("closed");
	}

	/**
	 * Check if circuit breaker is healthy
	 */
	isHealthy(): boolean {
		return this.state === "closed" && this.failureCount < this.config.threshold;
	}

	/**
	 * Get time until next attempt (if circuit is open)
	 */
	getTimeUntilNextAttempt(): number | null {
		if (this.state !== "open" || !this.nextAttemptTime) {
			return null;
		}

		const now = Date.now();
		const nextAttempt = this.nextAttemptTime.getTime();
		return Math.max(0, nextAttempt - now);
	}

	/**
	 * Force circuit breaker to open (for testing)
	 */
	forceOpen(): void {
		this.failureCount = this.config.threshold;
		this.recordStateChange("open");
		this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
	}

	/**
	 * Force circuit breaker to close (for testing)
	 */
	forceClose(): void {
		this.failureCount = 0;
		this.successCount = 0;
		this.nextAttemptTime = undefined;
		this.recordStateChange("closed");
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
