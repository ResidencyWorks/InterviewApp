import { describe, expect, it } from "vitest";

// Error Codes Contract
// Source: specs/001-ai-asr-eval/spec.md

const ERROR_CODES = {
	audio_too_long: { type: "PERMANENT", retry: false },
	malformed_gpt_output: { type: "TRANSIENT", retry: true },
	transcription_empty: { type: "PERMANENT", retry: false },
	network_error: { type: "TRANSIENT", retry: true },
	provider_timeout: { type: "TRANSIENT", retry: true },
	rate_limited: { type: "TRANSIENT", retry: true },
	auth_failed: { type: "PERMANENT", retry: false },
	webhook_delivery_failed: { type: "TRANSIENT", retry: true },
	tokens_unavailable: { type: "INFO", retry: false },
};

describe("Error Codes Contract", () => {
	it("verifies audio_too_long is PERMANENT", () => {
		expect(ERROR_CODES.audio_too_long.type).toBe("PERMANENT");
		expect(ERROR_CODES.audio_too_long.retry).toBe(false);
	});

	it("verifies malformed_gpt_output is TRANSIENT", () => {
		expect(ERROR_CODES.malformed_gpt_output.type).toBe("TRANSIENT");
		expect(ERROR_CODES.malformed_gpt_output.retry).toBe(true);
	});

	it("verifies transcription_empty is PERMANENT", () => {
		expect(ERROR_CODES.transcription_empty.type).toBe("PERMANENT");
		expect(ERROR_CODES.transcription_empty.retry).toBe(false);
	});

	it("verifies network_error is TRANSIENT", () => {
		expect(ERROR_CODES.network_error.type).toBe("TRANSIENT");
		expect(ERROR_CODES.network_error.retry).toBe(true);
	});

	it("verifies provider_timeout is TRANSIENT", () => {
		expect(ERROR_CODES.provider_timeout.type).toBe("TRANSIENT");
		expect(ERROR_CODES.provider_timeout.retry).toBe(true);
	});

	it("verifies rate_limited is TRANSIENT", () => {
		expect(ERROR_CODES.rate_limited.type).toBe("TRANSIENT");
		expect(ERROR_CODES.rate_limited.retry).toBe(true);
	});

	it("verifies auth_failed is PERMANENT", () => {
		expect(ERROR_CODES.auth_failed.type).toBe("PERMANENT");
		expect(ERROR_CODES.auth_failed.retry).toBe(false);
	});

	it("verifies webhook_delivery_failed is TRANSIENT", () => {
		expect(ERROR_CODES.webhook_delivery_failed.type).toBe("TRANSIENT");
		expect(ERROR_CODES.webhook_delivery_failed.retry).toBe(true);
	});
});
