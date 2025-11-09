/**
 * URL helper utilities for consistent URL handling across the application
 */

import { getAppUrl } from "@/infrastructure/config/environment";

/**
 * Get the base URL for the application
 */
export const getBaseUrl = (): string => {
	return getAppUrl();
};

/**
 * Construct a full URL for a given path
 */
export const constructUrl = (path: string): string => {
	const baseUrl = getBaseUrl();
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	return `${baseUrl}${cleanPath}`;
};

/**
 * Get the URL for authentication callbacks
 */
export const getAuthCallbackUrl = (provider?: string): string => {
	const baseUrl = getBaseUrl();
	if (provider) {
		return `${baseUrl}/auth/callback/${provider}`;
	}
	return `${baseUrl}/auth/callback`;
};

/**
 * Get the URL for magic link redirects
 */
export const getMagicLinkUrl = (): string => {
	return constructUrl("/auth/callback");
};

/**
 * Get the URL for password reset redirects
 */
export const getPasswordResetUrl = (): string => {
	return constructUrl("/auth/reset-password");
};

/**
 * Get the URL for email confirmation redirects
 */
export const getEmailConfirmationUrl = (): string => {
	return constructUrl("/auth/confirm-email");
};

/**
 * Validate if a URL is from the same origin
 */
export const isSameOrigin = (url: string): boolean => {
	try {
		const baseUrl = getBaseUrl();
		const urlObj = new URL(url);
		const baseUrlObj = new URL(baseUrl);
		return urlObj.origin === baseUrlObj.origin;
	} catch {
		return false;
	}
};

/**
 * Get allowed redirect URLs for authentication
 */
export const getAllowedRedirectUrls = (): string[] => {
	const baseUrl = getBaseUrl();
	return [
		baseUrl,
		`${baseUrl}/`,
		`${baseUrl}/dashboard`,
		`${baseUrl}/profile`,
		`${baseUrl}/auth/callback`,
		// Add localhost for development
		"http://localhost:3000",
		"https://localhost:3000",
	];
};
