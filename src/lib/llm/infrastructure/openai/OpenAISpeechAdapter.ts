/**
 * OpenAI Whisper speech-to-text adapter implementation
 */

import OpenAI from "openai";
import {
	LLMServiceError,
	ValidationError,
} from "../../domain/errors/LLMErrors";
import type {
	ISpeechAdapter,
	SpeechAdapterConfig,
	TranscriptionOptions,
	TranscriptionResult,
} from "../../domain/interfaces/ISpeechAdapter";

/**
 * OpenAI Speech Adapter implementation
 */
export class OpenAISpeechAdapter implements ISpeechAdapter {
	private client: OpenAI;
	private config: SpeechAdapterConfig;

	constructor(config: SpeechAdapterConfig) {
		this.config = config;
		this.client = new OpenAI({
			apiKey: config.apiKey,
			baseURL: config.baseURL,
			timeout: config.timeout ?? 30000,
			maxRetries: config.maxRetries ?? 3,
		});
	}

	/**
	 * Transcribe audio from a URL or base64 data
	 */
	async transcribe(
		audioUrl: string,
		options: TranscriptionOptions = {},
	): Promise<TranscriptionResult> {
		try {
			let audioFile: File;

			// Handle base64 data URLs
			if (audioUrl.startsWith("data:")) {
				const [header, base64Data] = audioUrl.split(",");
				const mimeType = header.match(/data:([^;]+)/)?.[1] || "audio/wav";

				// Convert base64 to buffer
				const audioBuffer = Buffer.from(base64Data, "base64");
				audioFile = new File([audioBuffer], "audio.wav", {
					type: mimeType,
				});
			} else {
				// Handle regular URLs
				if (!this.isValidUrl(audioUrl)) {
					throw new ValidationError("Invalid audio URL format", {
						audioUrl: ["Must be a valid URL or data URL"],
					});
				}

				// Fetch audio file
				const audioResponse = await fetch(audioUrl);
				if (!audioResponse.ok) {
					throw new LLMServiceError(
						`Failed to fetch audio file: ${audioResponse.statusText}`,
						{
							status: audioResponse.status,
							statusText: audioResponse.statusText,
						},
					);
				}

				const audioBuffer = await audioResponse.arrayBuffer();
				audioFile = new File([audioBuffer], "audio.wav", {
					type: "audio/wav",
				});
			}

			// Log API call details
			console.log("🎤 Making OpenAI Whisper API call:", {
				model: this.config.model ?? "whisper-1",
				fileSize: audioFile.size,
				fileType: audioFile.type,
				language: options.language,
				responseFormat: options.responseFormat ?? "json",
				temperature: options.temperature ?? 0.0,
			});

			// Transcribe using OpenAI Whisper
			const transcription = await this.client.audio.transcriptions.create({
				file: audioFile,
				model: this.config.model ?? "whisper-1",
				language: options.language,
				response_format: options.responseFormat ?? "json",
				temperature: options.temperature ?? 0.0,
				prompt: options.prompt,
			});

			// Log API response details
			const transcribedText =
				typeof transcription === "string" ? transcription : transcription.text;
			console.log("🎯 OpenAI Whisper API response received:", {
				textLength: transcribedText.length,
				textPreview:
					transcribedText.substring(0, 100) +
					(transcribedText.length > 100 ? "..." : ""),
				language: options.language,
			});

			// Parse the transcription result
			const text =
				typeof transcription === "string" ? transcription : transcription.text;

			return {
				text: text.trim(),
				confidence: 0.95, // Whisper doesn't provide confidence scores
				language: options.language,
			};
		} catch (error) {
			if (
				error instanceof LLMServiceError ||
				error instanceof ValidationError
			) {
				throw error;
			}

			// Handle OpenAI API errors
			if (error instanceof Error) {
				throw new LLMServiceError(
					`Speech transcription failed: ${error.message}`,
					error,
				);
			}

			throw new LLMServiceError(
				"Unknown error during speech transcription",
				error,
			);
		}
	}

	/**
	 * Check if the adapter supports the given audio format
	 */
	supportsFormat(format: string): boolean {
		const supportedFormats = this.getSupportedFormats();
		return supportedFormats.includes(format.toLowerCase());
	}

	/**
	 * Get maximum file size supported by the adapter
	 */
	getMaxFileSize(): number {
		// OpenAI Whisper supports up to 25MB
		return 25 * 1024 * 1024; // 25MB in bytes
	}

	/**
	 * Get supported audio formats
	 */
	getSupportedFormats(): string[] {
		return ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"];
	}

	/**
	 * Validate URL format
	 */
	private isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get the model name used by this adapter
	 */
	getModelName(): string {
		return this.config.model ?? "whisper-1";
	}

	/**
	 * Update adapter configuration
	 */
	updateConfig(config: Partial<SpeechAdapterConfig>): void {
		this.config = { ...this.config, ...config };

		// Recreate client with new configuration
		this.client = new OpenAI({
			apiKey: this.config.apiKey,
			baseURL: this.config.baseURL,
			timeout: this.config.timeout ?? 30000,
			maxRetries: this.config.maxRetries ?? 3,
		});
	}

	/**
	 * Get current configuration
	 */
	getConfig(): SpeechAdapterConfig {
		return { ...this.config };
	}
}
