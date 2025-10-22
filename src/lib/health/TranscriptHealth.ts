import type { ISpeechAdapter } from "../llm/domain/interfaces/ISpeechAdapter";

export class TranscriptHealth {
	constructor(private readonly speech: ISpeechAdapter) {}

	async check(): Promise<{ status: "healthy" | "degraded" | "unhealthy" }> {
		try {
			// For fake adapter, assume healthy; for real adapter a noop check could be added
			const ok = this.speech.getSupportedFormats().length > 0;
			return { status: ok ? "healthy" : "degraded" };
		} catch {
			return { status: "unhealthy" };
		}
	}
}
