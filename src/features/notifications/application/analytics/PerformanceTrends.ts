export interface TrendPoint {
	t: number;
	value: number;
}

export class PerformanceTrends {
	private readonly points: TrendPoint[] = [];

	addPoint(value: number): void {
		this.points.push({ t: Date.now(), value });
		if (this.points.length > 1000) this.points.shift();
	}

	getMovingAverage(window = 10): number {
		const recent = this.points.slice(-window);
		if (recent.length === 0) return 0;
		const sum = recent.reduce((s, p) => s + p.value, 0);
		return sum / recent.length;
	}
}
