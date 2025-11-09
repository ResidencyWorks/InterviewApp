/**
 * Internationalization configuration and utilities
 */

export interface LocaleConfig {
	code: string;
	name: string;
	flag: string;
	direction: "ltr" | "rtl";
}

export const supportedLocales: LocaleConfig[] = [
	{
		code: "en",
		name: "English",
		flag: "🇺🇸",
		direction: "ltr",
	},
	{
		code: "es",
		name: "Español",
		flag: "🇪🇸",
		direction: "ltr",
	},
	{
		code: "fr",
		name: "Français",
		flag: "🇫🇷",
		direction: "ltr",
	},
	{
		code: "de",
		name: "Deutsch",
		flag: "🇩🇪",
		direction: "ltr",
	},
	{
		code: "zh",
		name: "中文",
		flag: "🇨🇳",
		direction: "ltr",
	},
	{
		code: "ja",
		name: "日本語",
		flag: "🇯🇵",
		direction: "ltr",
	},
];

export const defaultLocale = "en";

/**
 * Translation keys interface
 */
export interface TranslationKeys {
	// Common
	common: {
		loading: string;
		error: string;
		success: string;
		cancel: string;
		confirm: string;
		save: string;
		delete: string;
		edit: string;
		close: string;
		back: string;
		next: string;
		previous: string;
	};

	// Navigation
	navigation: {
		home: string;
		dashboard: string;
		drills: string;
		profile: string;
		settings: string;
		logout: string;
	};

	// Authentication
	auth: {
		login: string;
		logout: string;
		signup: string;
		email: string;
		password: string;
		confirmPassword: string;
		forgotPassword: string;
		resetPassword: string;
		magicLinkSent: string;
		checkEmail: string;
	};

	// Evaluation
	evaluation: {
		submitResponse: string;
		recording: string;
		stopRecording: string;
		playRecording: string;
		pauseRecording: string;
		evaluationResults: string;
		overallScore: string;
		feedback: string;
		categories: string;
		duration: string;
		wordCount: string;
		wordsPerMinute: string;
	};

	// Content Pack
	contentPack: {
		upload: string;
		validate: string;
		load: string;
		version: string;
		lastUpdated: string;
		status: string;
		active: string;
		inactive: string;
	};

	// Errors
	errors: {
		networkError: string;
		serverError: string;
		validationError: string;
		authenticationError: string;
		authorizationError: string;
		notFound: string;
		rateLimitExceeded: string;
		fileTooLarge: string;
		invalidFileType: string;
	};
}

/**
 * Default English translations
 */
export const defaultTranslations: TranslationKeys = {
	common: {
		loading: "Loading...",
		error: "Error",
		success: "Success",
		cancel: "Cancel",
		confirm: "Confirm",
		save: "Save",
		delete: "Delete",
		edit: "Edit",
		close: "Close",
		back: "Back",
		next: "Next",
		previous: "Previous",
	},
	navigation: {
		home: "Home",
		dashboard: "Dashboard",
		drills: "Drills",
		profile: "Profile",
		settings: "Settings",
		logout: "Logout",
	},
	auth: {
		login: "Login",
		logout: "Logout",
		signup: "Sign Up",
		email: "Email",
		password: "Password",
		confirmPassword: "Confirm Password",
		forgotPassword: "Forgot Password?",
		resetPassword: "Reset Password",
		magicLinkSent: "Magic link sent!",
		checkEmail: "Please check your email for the login link.",
	},
	evaluation: {
		submitResponse: "Submit Response",
		recording: "Recording...",
		stopRecording: "Stop Recording",
		playRecording: "Play Recording",
		pauseRecording: "Pause Recording",
		evaluationResults: "Evaluation Results",
		overallScore: "Overall Score",
		feedback: "Feedback",
		categories: "Categories",
		duration: "Duration",
		wordCount: "Word Count",
		wordsPerMinute: "Words Per Minute",
	},
	contentPack: {
		upload: "Upload",
		validate: "Validate",
		load: "Load",
		version: "Version",
		lastUpdated: "Last Updated",
		status: "Status",
		active: "Active",
		inactive: "Inactive",
	},
	errors: {
		networkError: "Network error. Please check your connection.",
		serverError: "Server error. Please try again later.",
		validationError: "Please check your input and try again.",
		authenticationError: "Authentication failed. Please log in again.",
		authorizationError: "You don't have permission to perform this action.",
		notFound: "The requested resource was not found.",
		rateLimitExceeded: "Too many requests. Please try again later.",
		fileTooLarge: "File is too large. Please choose a smaller file.",
		invalidFileType: "Invalid file type. Please choose a valid file.",
	},
};

/**
 * Translation function type
 */
export type TranslationFunction = (
	key: string,
	params?: Record<string, string | number>,
) => string;

/**
 * I18n context interface
 */
export interface I18nContext {
	locale: string;
	translations: TranslationKeys;
	t: TranslationFunction;
	setLocale: (locale: string) => void;
}

/**
 * Get nested translation value
 */
export function getNestedTranslation(
	translations: TranslationKeys,
	key: string,
): string {
	const keys = key.split(".");
	let value: unknown = translations;

	for (const k of keys) {
		value = (value as Record<string, unknown>)?.[k];
		if (value === undefined) {
			return key; // Return key if translation not found
		}
	}

	return typeof value === "string" ? value : key;
}

/**
 * Format translation with parameters
 */
export function formatTranslation(
	translation: string,
	params?: Record<string, string | number>,
): string {
	if (!params) return translation;

	return translation.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		return params[key]?.toString() || match;
	});
}

/**
 * Get locale from request headers or default
 */
export function getLocaleFromRequest(request: Request): string {
	const acceptLanguage = request.headers.get("accept-language");
	if (!acceptLanguage) return defaultLocale;

	const languages = acceptLanguage
		.split(",")
		.map((lang) => lang.split(";")[0].trim().toLowerCase());

	for (const lang of languages) {
		const locale = supportedLocales.find((l) => l.code === lang);
		if (locale) return locale.code;
	}

	return defaultLocale;
}

/**
 * Get locale configuration
 */
export function getLocaleConfig(locale: string): LocaleConfig {
	return supportedLocales.find((l) => l.code === locale) || supportedLocales[0];
}
