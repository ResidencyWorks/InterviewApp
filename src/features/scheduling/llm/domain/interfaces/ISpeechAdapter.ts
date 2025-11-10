/**
 * Interface for speech-to-text adapters
 */

/**
 * Speech transcription result
 */
export interface TranscriptionResult {
	text: string;
	confidence: number;
	language?: string;
	duration?: number;
}

/**
 * Speech adapter interface for converting audio to text
 */
export interface ISpeechAdapter {
	/**
	 * Transcribe audio from a URL
	 * @param audioUrl - URL of the audio file to transcribe
	 * @param options - Optional transcription options
	 * @returns Promise resolving to transcription result
	 */
	transcribe(
		audioUrl: string,
		options?: TranscriptionOptions,
	): Promise<TranscriptionResult>;

	/**
	 * Check if the adapter supports the given audio format
	 * @param format - Audio format (e.g., 'wav', 'mp3', 'm4a')
	 * @returns True if format is supported
	 */
	supportsFormat(format: string): boolean;

	/**
	 * Get maximum file size supported by the adapter
	 * @returns Maximum file size in bytes
	 */
	getMaxFileSize(): number;

	/**
	 * Get supported audio formats
	 * @returns Array of supported audio formats
	 */
	getSupportedFormats(): string[];
}

/**
 * Transcription options
 */
export interface TranscriptionOptions {
	/**
	 * Language hint for transcription
	 */
	language?: string;

	/**
	 * Response format (json, text, srt, verbose_json, vtt)
	 */
	responseFormat?: "json" | "text" | "srt" | "verbose_json" | "vtt";

	/**
	 * Temperature for transcription (0.0 to 1.0)
	 */
	temperature?: number;

	/**
	 * Custom prompt for transcription
	 */
	prompt?: string;
}

/**
 * Speech adapter configuration
 */
export interface SpeechAdapterConfig {
	/**
	 * API key for the speech service
	 */
	apiKey: string;

	/**
	 * Model to use for transcription
	 */
	model?: string;

	/**
	 * Base URL for the API (if different from default)
	 */
	baseURL?: string;

	/**
	 * Request timeout in milliseconds
	 */
	timeout?: number;

	/**
	 * Maximum retry attempts
	 */
	maxRetries?: number;
}
