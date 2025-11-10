import type { CircuitBreaker } from "@/features/scheduling/llm/infrastructure/retry/CircuitBreaker";

export class TranscriptCircuitBreaker {
	private readonly breaker: CircuitBreaker;

	constructor(breaker: CircuitBreaker) {
		this.breaker = breaker;
	}

	async execute<T>(fn: () => Promise<T>): Promise<T> {
		return await this.breaker.execute(fn);
	}
}
