import type { RetryService } from "@/features/scheduling/llm/infrastructure/retry/RetryService";

export class TranscriptRetry {
	private readonly retry: RetryService;

	constructor(retry: RetryService) {
		this.retry = retry;
	}

	async execute<T>(op: () => Promise<T>): Promise<T> {
		const result = await this.retry.execute(op, {});
		return result.result;
	}
}
