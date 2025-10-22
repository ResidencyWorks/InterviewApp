export type Alert = {
	level: "info" | "warn" | "error";
	message: string;
	at: number;
};

export class PerformanceAlerts {
	private listeners: Array<(a: Alert) => void> = [];

	on(listener: (a: Alert) => void): () => void {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	emit(alert: Alert): void {
		for (const l of this.listeners) l(alert);
	}
}

export const performanceAlerts = new PerformanceAlerts();
