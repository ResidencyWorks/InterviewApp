import { logger } from "../logging/logger";
import { healthService } from "./health-service";

/**
 * Alert severity levels
 */
export enum AlertSeverity {
	LOW = "low",
	MEDIUM = "medium",
	HIGH = "high",
	CRITICAL = "critical",
}

/**
 * Alert types
 */
export enum AlertType {
	SYSTEM_HEALTH = "system_health",
	PERFORMANCE = "performance",
	ERROR_RATE = "error_rate",
	SECURITY = "security",
	CAPACITY = "capacity",
	DEPENDENCY = "dependency",
}

/**
 * Alert interface
 */
export interface Alert {
	id: string;
	type: AlertType;
	severity: AlertSeverity;
	title: string;
	description: string;
	timestamp: Date;
	resolved: boolean;
	metadata?: Record<string, unknown>;
}

/**
 * Alerting service for monitoring and notifications
 */
export class AlertingService {
	private static instance: AlertingService;
	private alerts: Map<string, Alert> = new Map();
	private thresholds = {
		errorRate: 0.05, // 5% error rate threshold
		responseTime: 1000, // 1 second response time threshold
		cpuUsage: 0.8, // 80% CPU usage threshold
		memoryUsage: 0.85, // 85% memory usage threshold
		diskUsage: 0.9, // 90% disk usage threshold
	};

	private constructor() {}

	static getInstance(): AlertingService {
		if (!AlertingService.instance) {
			AlertingService.instance = new AlertingService();
		}
		return AlertingService.instance;
	}

	/**
	 * Create a new alert
	 */
	createAlert(
		type: AlertType,
		severity: AlertSeverity,
		title: string,
		description: string,
		metadata?: Record<string, unknown>,
	): Alert {
		const alert: Alert = {
			id: this.generateAlertId(),
			type,
			severity,
			title,
			description,
			timestamp: new Date(),
			resolved: false,
			metadata,
		};

		this.alerts.set(alert.id, alert);
		this.sendAlert(alert);

		logger.warn(`Alert created: ${title}`, {
			component: "AlertingService",
			action: "createAlert",
			metadata: { alertId: alert.id, type, severity },
		});

		return alert;
	}

	/**
	 * Resolve an alert
	 */
	resolveAlert(alertId: string): boolean {
		const alert = this.alerts.get(alertId);
		if (!alert) return false;

		alert.resolved = true;
		this.alerts.set(alertId, alert);

		logger.info(`Alert resolved: ${alert.title}`, {
			component: "AlertingService",
			action: "resolveAlert",
			metadata: { alertId },
		});

		return true;
	}

	/**
	 * Get active alerts
	 */
	getActiveAlerts(): Alert[] {
		return Array.from(this.alerts.values()).filter((alert) => !alert.resolved);
	}

	/**
	 * Get alerts by type
	 */
	getAlertsByType(type: AlertType): Alert[] {
		return Array.from(this.alerts.values()).filter(
			(alert) => alert.type === type,
		);
	}

	/**
	 * Get alerts by severity
	 */
	getAlertsBySeverity(severity: AlertSeverity): Alert[] {
		return Array.from(this.alerts.values()).filter(
			(alert) => alert.severity === severity,
		);
	}

	/**
	 * Check system health and create alerts if needed
	 */
	async checkSystemHealth(): Promise<void> {
		try {
			const health = await healthService.getSystemHealth();

			if (health.status === "unhealthy") {
				this.createAlert(
					AlertType.SYSTEM_HEALTH,
					AlertSeverity.CRITICAL,
					"System Health Critical",
					"One or more system components are unhealthy",
					{ services: health.services },
				);
			} else if (health.status === "degraded") {
				this.createAlert(
					AlertType.SYSTEM_HEALTH,
					AlertSeverity.HIGH,
					"System Health Degraded",
					"System performance is degraded",
					{ services: health.services },
				);
			}
		} catch (error) {
			this.createAlert(
				AlertType.SYSTEM_HEALTH,
				AlertSeverity.CRITICAL,
				"Health Check Failed",
				"Unable to perform system health check",
				{ error: error instanceof Error ? error.message : "Unknown error" },
			);
		}
	}

	/**
	 * Monitor error rates
	 */
	monitorErrorRate(errorCount: number, totalRequests: number): void {
		const errorRate = errorCount / totalRequests;

		if (errorRate > this.thresholds.errorRate) {
			this.createAlert(
				AlertType.ERROR_RATE,
				AlertSeverity.HIGH,
				"High Error Rate Detected",
				`Error rate is ${(errorRate * 100).toFixed(2)}%, exceeding threshold of ${(this.thresholds.errorRate * 100).toFixed(2)}%`,
				{ errorRate, errorCount, totalRequests },
			);
		}
	}

	/**
	 * Monitor response times
	 */
	monitorResponseTime(responseTime: number, endpoint: string): void {
		if (responseTime > this.thresholds.responseTime) {
			this.createAlert(
				AlertType.PERFORMANCE,
				AlertSeverity.MEDIUM,
				"Slow Response Time",
				`Response time for ${endpoint} is ${responseTime}ms, exceeding threshold of ${this.thresholds.responseTime}ms`,
				{ responseTime, endpoint },
			);
		}
	}

	/**
	 * Monitor security events
	 */
	monitorSecurityEvent(event: string, details: Record<string, unknown>): void {
		this.createAlert(
			AlertType.SECURITY,
			AlertSeverity.HIGH,
			"Security Event Detected",
			event,
			details,
		);
	}

	/**
	 * Monitor capacity usage
	 */
	monitorCapacity(metric: string, usage: number, threshold: number): void {
		if (usage > threshold) {
			this.createAlert(
				AlertType.CAPACITY,
				AlertSeverity.MEDIUM,
				"High Resource Usage",
				`${metric} usage is ${(usage * 100).toFixed(2)}%, approaching threshold of ${(threshold * 100).toFixed(2)}%`,
				{ metric, usage, threshold },
			);
		}
	}

	/**
	 * Monitor dependency health
	 */
	monitorDependency(dependency: string, isHealthy: boolean): void {
		if (!isHealthy) {
			this.createAlert(
				AlertType.DEPENDENCY,
				AlertSeverity.HIGH,
				"Dependency Unhealthy",
				`${dependency} is not responding or returning errors`,
				{ dependency },
			);
		}
	}

	/**
	 * Send alert notification
	 */
	private async sendAlert(alert: Alert): Promise<void> {
		// In a real implementation, this would send notifications via:
		// - Email
		// - Slack
		// - PagerDuty
		// - SMS
		// - Webhook

		logger.error(`ALERT: ${alert.title}`, undefined, {
			component: "AlertingService",
			action: "sendAlert",
			metadata: {
				alertId: alert.id,
				type: alert.type,
				severity: alert.severity,
				...alert.metadata,
			},
		});

		// For now, just log the alert
		// In production, integrate with notification services
	}

	/**
	 * Generate unique alert ID
	 */
	private generateAlertId(): string {
		return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Clean up old resolved alerts
	 */
	cleanupOldAlerts(maxAgeHours = 24): void {
		const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

		for (const [id, alert] of Array.from(this.alerts.entries())) {
			if (alert.resolved && alert.timestamp < cutoffTime) {
				this.alerts.delete(id);
			}
		}
	}
}

// Export singleton instance
export const alertingService = AlertingService.getInstance();
