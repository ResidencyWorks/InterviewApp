export function isPeakUsage(hour: number = new Date().getHours()): boolean {
	// Simple heuristic: 6-9pm considered peak
	return hour >= 18 && hour <= 21;
}
