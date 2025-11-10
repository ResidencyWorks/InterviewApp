/**
 * Security middleware for LLM API endpoints
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	sanitizeErrorMessage,
	sanitizeText,
	validateApiKey,
	validateAudioUrl,
	validateContext,
	validateQuestion,
	validateRateLimit,
} from "./SecurityUtils";

/**
 * Rate limiting storage (in production, use Redis or similar)
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Security middleware configuration
 */
export interface SecurityMiddlewareConfig {
	enableRateLimit: boolean;
	maxRequestsPerMinute: number;
	enableInputValidation: boolean;
	enableOutputSanitization: boolean;
	allowedOrigins: string[];
	requireAuthentication: boolean;
}

/**
 * Default security configuration
 */
const DEFAULT_CONFIG: SecurityMiddlewareConfig = {
	enableRateLimit: true,
	maxRequestsPerMinute: 10,
	enableInputValidation: true,
	enableOutputSanitization: true,
	allowedOrigins: ["*"],
	requireAuthentication: true,
};

/**
 * Security middleware class
 */
export class SecurityMiddleware {
	private config: SecurityMiddlewareConfig;

	constructor(config: Partial<SecurityMiddlewareConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Apply security middleware to request
	 */
	async applySecurity(request: NextRequest): Promise<NextResponse | null> {
		try {
			// 1. CORS validation
			const corsResponse = this.validateCors(request);
			if (corsResponse) {
				return corsResponse;
			}

			// 2. Rate limiting
			if (this.config.enableRateLimit) {
				const rateLimitResponse = this.validateRateLimit(request);
				if (rateLimitResponse) {
					return rateLimitResponse;
				}
			}

			// 3. Authentication
			if (this.config.requireAuthentication) {
				const authResponse = this.validateAuthentication(request);
				if (authResponse) {
					return authResponse;
				}
			}

			// 4. Input validation
			if (this.config.enableInputValidation) {
				const validationResponse = await this.validateInput(request);
				if (validationResponse) {
					return validationResponse;
				}
			}

			// 5. Request size validation
			const sizeResponse = this.validateRequestSize(request);
			if (sizeResponse) {
				return sizeResponse;
			}

			return null; // No security violations
		} catch {
			return this.createSecurityErrorResponse(
				"Security validation failed",
				"SECURITY_VALIDATION_ERROR",
				500,
			);
		}
	}

	/**
	 * Validate CORS
	 */
	private validateCors(request: NextRequest): NextResponse | null {
		const origin = request.headers.get("origin");

		if (!origin) {
			return null; // Allow requests without origin (e.g., Postman)
		}

		if (this.config.allowedOrigins.includes("*")) {
			return null; // Allow all origins
		}

		if (!this.config.allowedOrigins.includes(origin)) {
			return this.createSecurityErrorResponse(
				"CORS policy violation",
				"CORS_ERROR",
				403,
			);
		}

		return null;
	}

	/**
	 * Validate rate limit
	 */
	private validateRateLimit(request: NextRequest): NextResponse | null {
		const identifier = this.getRateLimitIdentifier(request);

		if (
			!validateRateLimit(
				identifier,
				rateLimitStore,
				this.config.maxRequestsPerMinute as 10,
			)
		) {
			return this.createSecurityErrorResponse(
				"Rate limit exceeded",
				"RATE_LIMIT_EXCEEDED",
				429,
			);
		}

		return null;
	}

	/**
	 * Validate authentication
	 */
	private validateAuthentication(request: NextRequest): NextResponse | null {
		// Check for session or API key
		const session = request.headers.get("authorization");
		const apiKey = request.headers.get("x-api-key");

		if (!session && !apiKey) {
			return this.createSecurityErrorResponse(
				"Authentication required",
				"AUTHENTICATION_REQUIRED",
				401,
			);
		}

		// Validate API key format if provided
		if (apiKey && !validateApiKey(apiKey)) {
			return this.createSecurityErrorResponse(
				"Invalid API key format",
				"INVALID_API_KEY",
				401,
			);
		}

		return null;
	}

	/**
	 * Validate input data
	 */
	private async validateInput(
		request: NextRequest,
	): Promise<NextResponse | null> {
		try {
			const body = await request.json();

			// Validate text content
			if (body.content && !sanitizeText(body.content)) {
				return this.createSecurityErrorResponse(
					"Invalid text content",
					"INVALID_TEXT_CONTENT",
					400,
				);
			}

			// Validate audio URL
			if (body.audioUrl && !validateAudioUrl(body.audioUrl)) {
				return this.createSecurityErrorResponse(
					"Invalid audio URL",
					"INVALID_AUDIO_URL",
					400,
				);
			}

			// Validate question
			if (body.question && !validateQuestion(body.question)) {
				return this.createSecurityErrorResponse(
					"Invalid question format",
					"INVALID_QUESTION",
					400,
				);
			}

			// Validate context
			if (body.context && !validateContext(body.context)) {
				return this.createSecurityErrorResponse(
					"Invalid context data",
					"INVALID_CONTEXT",
					400,
				);
			}

			return null;
		} catch {
			return this.createSecurityErrorResponse(
				"Invalid request body",
				"INVALID_REQUEST_BODY",
				400,
			);
		}
	}

	/**
	 * Validate request size
	 */
	private validateRequestSize(request: NextRequest): NextResponse | null {
		const contentLength = request.headers.get("content-length");

		if (contentLength) {
			const size = parseInt(contentLength, 10);
			const maxSize = 1024 * 1024; // 1MB

			if (size > maxSize) {
				return this.createSecurityErrorResponse(
					"Request too large",
					"REQUEST_TOO_LARGE",
					413,
				);
			}
		}

		return null;
	}

	/**
	 * Get rate limit identifier
	 */
	private getRateLimitIdentifier(request: NextRequest): string {
		// Use user ID if available, otherwise use IP address
		const userId = request.headers.get("x-user-id");
		if (userId) {
			return `user:${userId}`;
		}

		const ip =
			request.headers.get("x-forwarded-for") ||
			request.headers.get("x-real-ip") ||
			"unknown";
		return `ip:${ip}`;
	}

	/**
	 * Create security error response
	 */
	private createSecurityErrorResponse(
		message: string,
		code: string,
		status: number,
	): NextResponse {
		const sanitizedMessage = sanitizeErrorMessage(new Error(message));

		return NextResponse.json(
			{
				error: {
					code,
					message: sanitizedMessage,
				},
				timestamp: new Date().toISOString(),
			},
			{ status },
		);
	}

	/**
	 * Sanitize response data
	 */
	sanitizeResponse(data: unknown): unknown {
		if (!this.config.enableOutputSanitization) {
			return data;
		}

		if (typeof data === "string") {
			return sanitizeText(data);
		}

		if (typeof data === "object" && data !== null) {
			const sanitized = { ...data } as Record<string, unknown>;

			// Sanitize string values
			for (const [key, value] of Object.entries(sanitized)) {
				if (typeof value === "string") {
					sanitized[key] = sanitizeText(value);
				}
			}

			return sanitized;
		}

		return data;
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<SecurityMiddlewareConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): SecurityMiddlewareConfig {
		return { ...this.config };
	}
}

/**
 * Create security middleware instance
 */
export function createSecurityMiddleware(
	config: Partial<SecurityMiddlewareConfig> = {},
): SecurityMiddleware {
	return new SecurityMiddleware(config);
}
