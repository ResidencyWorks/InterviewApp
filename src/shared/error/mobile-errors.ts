export type MobileErrorCode =
	| "NETWORK_SLOW"
	| "NETWORK_OFFLINE"
	| "ASSET_DEFERRED"
	| "UNKNOWN";

export interface MobileError {
	code: MobileErrorCode;
	message: string;
	recoverable: boolean;
}

export function mapToMobileError(error: unknown): MobileError {
	if (typeof navigator !== "undefined" && !navigator.onLine) {
		return {
			code: "NETWORK_OFFLINE",
			message: "You appear to be offline.",
			recoverable: true,
		};
	}
	const msg =
		typeof error === "string" ? error : (error as Error | undefined)?.message;
	if (msg && /network.*slow|timeout|timed out/i.test(msg)) {
		return {
			code: "NETWORK_SLOW",
			message: "Network is slow. Trying again...",
			recoverable: true,
		};
	}
	return {
		code: "UNKNOWN",
		message: msg || "Something went wrong.",
		recoverable: true,
	};
}
