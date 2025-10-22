export function hasLimitedResources(): boolean {
	if (typeof navigator === "undefined") return false;
	// Basic signal: low battery or memory hints would require specific APIs; use user agent hint
	const ua = navigator.userAgent.toLowerCase();
	return (
		ua.includes("android go") || ua.includes("mobi") || ua.includes("lowend")
	);
}
