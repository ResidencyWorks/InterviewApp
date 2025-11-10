import type {
	ISpeechAdapter,
	TranscriptionOptions,
	TranscriptionResult,
} from "../llm/domain/interfaces/ISpeechAdapter";
import {
	getAudioFormatFromUrl,
	isSupportedAudioFormat,
} from "./AudioFormatValidator";
import { generateMockTranscript } from "./MockTranscriptGenerator";
import { simulateResponseDelay } from "./ResponseTimeSimulator";

export interface FakeASRConfig {
	minDelayMs?: number;
	maxDelayMs?: number;
	confidence?: number;
	language?: string;
}

/**
 * Fake ASR service implementing ISpeechAdapter contract.
 * Returns deterministic mock transcripts with optional artificial delay.
 */
export class FakeASRService implements ISpeechAdapter {
	private readonly config: Required<FakeASRConfig> = {
		confidence: 0.93,
		language: "en",
		maxDelayMs: 1200,
		minDelayMs: 300,
	};

	constructor(config: FakeASRConfig = {}) {
		this.config = { ...this.config, ...config };
	}

	async transcribe(
		audioUrl: string,
		_options: TranscriptionOptions = {},
	): Promise<TranscriptionResult> {
		// Simulate latency
		await simulateResponseDelay(this.config.minDelayMs, this.config.maxDelayMs);

		// Basic format check (non-throwing; this is fake)
		const format = getAudioFormatFromUrl(audioUrl);
		const text = generateMockTranscript({
			audioUrl,
			format: format ?? "unknown",
		});

		return {
			confidence: this.config.confidence,
			duration: undefined,
			language: this.config.language,
			text,
		};
	}

	supportsFormat(format: string): boolean {
		return isSupportedAudioFormat(format);
	}

	getMaxFileSize(): number {
		// Arbitrary generous limit for fake service
		return 50 * 1024 * 1024; // 50 MB
	}

	getSupportedFormats(): string[] {
		return ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"];
	}
}
