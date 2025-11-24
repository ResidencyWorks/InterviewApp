export interface IErrorTrackingService {
	captureException(error: Error, context?: Record<string, unknown>): void;
	captureMessage(message: string, context?: Record<string, unknown>): void;
}

class ConsoleErrorTrackingService implements IErrorTrackingService {
	captureException(error: Error, context?: Record<string, unknown>): void {
		console.error("[error]", error, context);
	}

	captureMessage(message: string, context?: Record<string, unknown>): void {
		console.warn("[error-message]", message, context);
	}
}

let service: IErrorTrackingService = new ConsoleErrorTrackingService();

export function setErrorTrackingService(custom: IErrorTrackingService): void {
	service = custom;
}

export function captureException(
	error: Error,
	context?: Record<string, unknown>,
): void {
	service.captureException(error, context);
}

export function captureMessage(
	message: string,
	context?: Record<string, unknown>,
): void {
	service.captureMessage(message, context);
}
