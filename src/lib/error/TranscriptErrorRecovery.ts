export interface IRecoverableError extends Error {
	recoverable: true;
	hint?: string;
}

export interface IRecoveryOutcome<T> {
	ok: boolean;
	value?: T;
	error?: Error;
}

export async function withRecovery<T>(
	operation: () => Promise<T>,
	fallback: () => Promise<T>,
	onError?: (error: Error) => void,
): Promise<IRecoveryOutcome<T>> {
	try {
		const value = await operation();
		return { ok: true, value };
	} catch (error) {
		if (onError && error instanceof Error) onError(error);
		try {
			const value = await fallback();
			return { ok: true, value };
		} catch (fallbackError) {
			return { ok: false, error: (fallbackError as Error) ?? (error as Error) };
		}
	}
}

import { getFallbackTranscript } from "../fallback/APIFallbackHandler";
import type { TranscriptionResult } from "../llm/domain/interfaces/ISpeechAdapter";

export interface RecoveryOptions {
	useFallbackOnError?: boolean;
}

export async function recoverTranscript(
	_error: unknown,
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
