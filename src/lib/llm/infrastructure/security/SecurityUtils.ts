/**
 * Security utilities for LLM service
 */

import crypto from "crypto";

/**
 * Security constants
 */
const SECURITY_CONSTANTS = {
	// API key validation
	MIN_API_KEY_LENGTH: 20,
	MAX_API_KEY_LENGTH: 200,
	API_KEY_PREFIX: "sk-",

	// Input validation
	MAX_TEXT_LENGTH: 50000,
	MAX_AUDIO_URL_LENGTH: 2048,
	MAX_QUESTION_LENGTH: 1000,
	MAX_CONTEXT_LENGTH: 5000,

	// Rate limiting
	RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
	RATE_LIMIT_MAX_REQUESTS: 10,

	// Sanitization
	ALLOWED_HTML_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li"],
	MAX_NESTED_OBJECTS: 10,
} as const;

/**
 * Validate OpenAI API key format
 */
export function validateApiKey(apiKey: string): boolean {
	if (!apiKey || typeof apiKey !== "string") {
		return false;
	}

	// Check length
	if (
		apiKey.length < SECURITY_CONSTANTS.MIN_API_KEY_LENGTH ||
		apiKey.length > SECURITY_CONSTANTS.MAX_API_KEY_LENGTH
	) {
		return false;
	}

	// Check prefix
	if (!apiKey.startsWith(SECURITY_CONSTANTS.API_KEY_PREFIX)) {
		return false;
	}

	// Check for valid characters (alphanumeric and hyphens)
	const validPattern = /^sk-[a-zA-Z0-9-]+$/;
	return validPattern.test(apiKey);
}

/**
 * Sanitize text input
 */
export function sanitizeText(text: string): string {
	if (!text || typeof text !== "string") {
		return "";
	}

	// Remove null bytes and control characters
	// biome-ignore lint/suspicious/noControlCharactersInRegex: we want to remove all control characters
	let sanitized = text.replace(/[\u0000-\u001F\u007F]/g, "");

	// Limit length
	if (sanitized.length > SECURITY_CONSTANTS.MAX_TEXT_LENGTH) {
		sanitized = sanitized.substring(0, SECURITY_CONSTANTS.MAX_TEXT_LENGTH);
	}

	// Remove potentially dangerous HTML/script tags
	sanitized = sanitizeHtml(sanitized);

	// Normalize whitespace
	sanitized = sanitized.replace(/\s+/g, " ").trim();

	return sanitized;
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
	// Remove script tags and event handlers
	let sanitized = html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
		.replace(/javascript:/gi, "");

	// Allow only specific HTML tags
	const allowedTags = SECURITY_CONSTANTS.ALLOWED_HTML_TAGS.join("|");
	const tagRegex = new RegExp(`<(?!/?(?:${allowedTags})(?:s|>))[^>]*>`, "gi");
	sanitized = sanitized.replace(tagRegex, "");

	return sanitized;
}

/**
 * Validate URL for audio submissions
 */
export function validateAudioUrl(url: string): boolean {
	if (!url || typeof url !== "string") {
		return false;
	}

	// Check length
	if (url.length > SECURITY_CONSTANTS.MAX_AUDIO_URL_LENGTH) {
		return false;
	}

	try {
		const parsedUrl = new URL(url);

		// Only allow HTTPS URLs
		if (parsedUrl.protocol !== "https:") {
			return false;
		}

		// Check for valid audio file extensions
		const validExtensions = [".mp3", ".wav", ".m4a", ".ogg", ".webm"];
		const hasValidExtension = validExtensions.some((ext) =>
			parsedUrl.pathname.toLowerCase().endsWith(ext),
		);

		return hasValidExtension;
	} catch {
		return false;
	}
}

/**
 * Validate question text
 */
export function validateQuestion(question: string): boolean {
	if (!question || typeof question !== "string") {
		return false;
	}

	const sanitized = sanitizeText(question);
	return (
		sanitized.length > 0 &&
		sanitized.length <= SECURITY_CONSTANTS.MAX_QUESTION_LENGTH
	);
}

/**
 * Validate context object
 */
export function validateContext(context: unknown): boolean {
	if (!context || typeof context !== "object") {
		return false;
	}

	// Check for circular references and deep nesting
	try {
		const serialized = JSON.stringify(context);
		const parsed = JSON.parse(serialized);

		// Check depth
		const depth = getObjectDepth(parsed);
		if (depth > SECURITY_CONSTANTS.MAX_NESTED_OBJECTS) {
			return false;
		}

		// Check size
		if (serialized.length > SECURITY_CONSTANTS.MAX_CONTEXT_LENGTH) {
			return false;
		}

		return true;
	} catch {
		return false;
	}
}

/**
 * Get object depth
 */
function getObjectDepth(obj: unknown, currentDepth = 0): number {
	if (currentDepth > SECURITY_CONSTANTS.MAX_NESTED_OBJECTS) {
		return currentDepth;
	}

	if (obj === null || typeof obj !== "object") {
		return currentDepth;
	}

	if (Array.isArray(obj)) {
		return Math.max(
			...obj.map((item) => getObjectDepth(item, currentDepth + 1)),
		);
	}

	const values = Object.values(obj);
	if (values.length === 0) {
		return currentDepth;
	}

	return Math.max(
		...values.map((value) => getObjectDepth(value, currentDepth + 1)),
	);
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length = 32): string {
	return crypto.randomBytes(length).toString("hex");
}

/**
 * Hash sensitive data
 */
export function hashSensitiveData(data: string): string {
	return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Mask API key for logging
 */
export function maskApiKey(apiKey: string): string {
	if (!apiKey || apiKey.length < 8) {
		return "***";
	}

	const prefix = apiKey.substring(0, 4);
	const suffix = apiKey.substring(apiKey.length - 4);
	const middle = "*".repeat(apiKey.length - 8);

	return `${prefix}${middle}${suffix}`;
}

/**
 * Validate rate limit
 */
export function validateRateLimit(
	identifier: string,
	requests: Map<string, number[]>,
	maxRequests = SECURITY_CONSTANTS.RATE_LIMIT_MAX_REQUESTS,
	windowMs = SECURITY_CONSTANTS.RATE_LIMIT_WINDOW_MS,
): boolean {
	const now = Date.now();
	const windowStart = now - windowMs;

	// Get existing requests for this identifier
	const userRequests = requests.get(identifier) || [];

	// Filter requests within the time window
	const recentRequests = userRequests.filter(
		(timestamp) => timestamp > windowStart,
	);

	// Check if under rate limit
	if (recentRequests.length >= maxRequests) {
		return false;
	}

	// Add current request
	recentRequests.push(now);
	requests.set(identifier, recentRequests);

	return true;
}

/**
 * Sanitize error message for client
 */
export function sanitizeErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		// Remove sensitive information from error messages
		let message = error.message;

		// Remove API keys
		message = message.replace(/sk-[a-zA-Z0-9-]+/g, "***");

		// Remove file paths
		message = message.replace(/\/[^\s]*/g, "***");

		// Remove IP addresses
		message = message.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "***");

		return message;
	}

	return "An error occurred";
}

/**
 * Validate request size
 */
export function validateRequestSize(requestBody: unknown): boolean {
	try {
		const serialized = JSON.stringify(requestBody);
		const maxSize = 1024 * 1024; // 1MB
		return serialized.length <= maxSize;
	} catch {
		return false;
	}
}
