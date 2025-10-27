export function normalizeFakeASRError(error: unknown): {
	code: string;
	message: string;
} {
	if (typeof error === "string")
		return { code: "FAKE_ASR_ERROR", message: error };
	if (error instanceof Error)
		return { code: "FAKE_ASR_ERROR", message: error.message };
	return { code: "FAKE_ASR_ERROR", message: "Unknown ASR error" };
}
