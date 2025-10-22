import { getFallbackTranscript } from "../fallback/APIFallbackHandler";
import type { TranscriptionResult } from "../llm/domain/interfaces/ISpeechAdapter";

export interface RecoveryOptions {
	useFallbackOnError?: boolean;
}

export async function recoverTranscript(
	error: unknown,
	options: RecoveryOptions = { useFallbackOnError: true },
): Promise<TranscriptionResult | null> {
	if (!options.useFallbackOnError) return null;
	const text = getFallbackTranscript();
	return {
		text,
		confidence: 0.5,
		language: "en",
		duration: undefined,
	};
}
