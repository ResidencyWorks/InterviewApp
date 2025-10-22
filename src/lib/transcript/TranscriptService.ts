import type {
	ISpeechAdapter,
	TranscriptionOptions,
	TranscriptionResult,
} from "../llm/domain/interfaces/ISpeechAdapter";

export interface TranscriptRequest {
	audioUrl: string;
	timeoutMs?: number;
	options?: TranscriptionOptions;
}

export class TranscriptService {
	private readonly adapter: ISpeechAdapter;

	constructor(adapter: ISpeechAdapter) {
		this.adapter = adapter;
	}

	async transcribe(request: TranscriptRequest): Promise<TranscriptionResult> {
		const { audioUrl, options, timeoutMs } = request;
		if (!audioUrl) {
			throw new Error("TranscriptService: audioUrl is required");
		}

		if (!timeoutMs || timeoutMs <= 0) {
			return await this.adapter.transcribe(audioUrl, options);
		}

		return await this.withTimeout(
			this.adapter.transcribe(audioUrl, options),
			timeoutMs,
			"Transcript generation timed out",
		);
	}

	private async withTimeout<T>(
		promise: Promise<T>,
		ms: number,
		message: string,
	): Promise<T> {
		let timer: NodeJS.Timeout | undefined;
		try {
			return await Promise.race<T>([
				promise,
				new Promise<T>((_, reject) => {
					timer = setTimeout(() => reject(new Error(message)), ms);
				}),
			]);
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
}
