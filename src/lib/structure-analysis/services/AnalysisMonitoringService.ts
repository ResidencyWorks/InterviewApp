/**
 * AnalysisMonitoringService (console-based placeholder)
 */

export class AnalysisMonitoringService {
	log(event: string, data?: Record<string, unknown>) {
		// eslint-disable-next-line no-console
		console.log(`[analysis] ${event}`, data ?? {});
	}
	error(event: string, data?: Record<string, unknown>) {
		// eslint-disable-next-line no-console
		console.error(`[analysis] ${event}`, data ?? {});
	}
}
