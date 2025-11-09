/**
 * PerformanceOptimizer
 */

export class PerformanceOptimizer {
	throttle<T>(fn: (...args: any[]) => Promise<T>, delayMs: number) {
		let last = 0;
		return async (...args: any[]) => {
			const now = Date.now();
			if (now - last < delayMs) {
				await new Promise((r) => setTimeout(r, delayMs - (now - last)));
			}
			last = Date.now();
			return fn(...args);
		};
	}
}
