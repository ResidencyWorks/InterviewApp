/**
 * AnalysisMonitoringService (console-based placeholder)
 */

export class AnalysisMonitoringService {
	log(event: string, data?: Record<string, unknown>) {
		console.log(`[analysis] ${event}`, data ?? {});
	}
	error(event: string, data?: Record<string, unknown>) {
		console.error(`[analysis] ${event}`, data ?? {});
	}
}
