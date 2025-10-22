export async function simulateResponseDelay(
	minMs = 300,
	maxMs = 1200,
): Promise<void> {
	const clampedMin = Math.max(0, Math.min(minMs, maxMs));
	const clampedMax = Math.max(clampedMin, maxMs);
	const delay = Math.floor(
		clampedMin + Math.random() * (clampedMax - clampedMin + 1),
	);
	await new Promise((resolve) => setTimeout(resolve, delay));
}
