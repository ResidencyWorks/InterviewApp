import OpenAI from "openai";

/**
 * Transcribes audio using OpenAI Whisper API.
 * @param audioUrl - HTTPS URL to the audio file
 * @returns Transcript text and duration in milliseconds
 */
export async function transcribeAudio(
	audioUrl: string,
): Promise<{ transcript: string; durationMs: number }> {
	const startTime = Date.now();

	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
	});

	try {
		// Download audio from URL
		const response = await fetch(audioUrl);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch audio from ${audioUrl}: ${response.statusText}`,
			);
		}

		const audioBuffer = await response.arrayBuffer();
		const audioBlob = new Blob([audioBuffer]);
		const audioFile = new File([audioBlob], "audio.mp3", {
			type: "audio/mpeg",
		});

		// Transcribe using Whisper
		const transcription = await openai.audio.transcriptions.create({
			file: audioFile,
			model: "whisper-1",
			language: "en",
			response_format: "verbose_json",
		});

		const durationMs = Date.now() - startTime;

		return {
			transcript: transcription.text,
			durationMs,
		};
	} catch (error) {
		console.error("Whisper transcription error:", error);

		if (error instanceof OpenAI.APIError) {
			throw new Error(`Whisper API error (${error.status}): ${error.message}`);
		}

		throw error;
	}
}
