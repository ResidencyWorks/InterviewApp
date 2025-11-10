const SUPPORTED = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"] as const;

export type SupportedFormat = (typeof SUPPORTED)[number];

export function isSupportedAudioFormat(format: string): boolean {
	return SUPPORTED.includes(format.toLowerCase() as SupportedFormat);
}

export function getAudioFormatFromUrl(audioUrl: string): string | null {
	try {
		if (audioUrl.startsWith("data:audio/")) {
			const mime = audioUrl.split(";")[0].replace("data:", "");
			const ext = mime.split("/")[1];
			return ext || null;
		}
		const url = new URL(audioUrl);
		const ext = url.pathname.split(".").pop()?.toLowerCase() || null;
		return ext;
	} catch {
		return null;
	}
}
