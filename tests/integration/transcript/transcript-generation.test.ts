import { describe, expect, it } from "vitest";
import { FakeASRService } from "@/lib/asr/FakeASRService";
import { TranscriptService } from "@/lib/transcript/TranscriptService";

describe("Transcript generation", () => {
	it("returns a transcript under timeout", async () => {
		const asr = new FakeASRService({ minDelayMs: 50, maxDelayMs: 100 });
		const service = new TranscriptService(asr);
		const result = await service.transcribe({
			audioUrl: "https://example.com/audio.wav",
			timeoutMs: 1000,
		});
		expect(result.text.length).toBeGreaterThan(10);
	});

	it("times out when delay exceeds timeout", async () => {
		const asr = new FakeASRService({ minDelayMs: 300, maxDelayMs: 400 });
		const service = new TranscriptService(asr);
		await expect(
			service.transcribe({
				audioUrl: "https://example.com/audio.wav",
				timeoutMs: 100,
			}),
		).rejects.toThrow(/timed out/i);
	});
});
