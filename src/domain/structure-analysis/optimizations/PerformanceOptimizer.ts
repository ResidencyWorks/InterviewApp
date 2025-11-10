/**
 * PerformanceOptimizer
 */

export class PerformanceOptimizer {
	throttle<T>(fn: (...args: unknown[]) => Promise<T>, delayMs: number) {
		let last = 0;
		return async (...args: unknown[]) => {
			const now = Date.now();
			if (now - last < delayMs) {
				await new Promise((r) => setTimeout(r, delayMs - (now - last)));
			}
			last = Date.now();
			return fn(...args);
		};
	}
}
