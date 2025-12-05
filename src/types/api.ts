/**
 * API type definitions
 * Defines types for API requests and responses
 */

export interface ApiResponse<T = unknown> {
	data?: T;
	error?: string;
	message?: string;
	status: number;
}

export interface ApiError {
	message: string;
	code: string;
	status: number;
	details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		total_pages: number;
	};
}

export interface AuthRequest {
	email: string;
	action?: "magiclink" | "signup" | "recovery";
}

export interface AuthResponse {
	message: string;
	session?: Record<string, unknown>;
}

export interface ApiEvaluationRequest {
	response: string;
	type: "text" | "audio";
	audio_url?: string;
	content_pack_id?: string;
}

export interface ApiEvaluationResponse {
	duration: number;
	word_count: number;
	wpm: number;
	categories: {
		clarity: number;
		structure: number;
		content: number;
		delivery: number;
	};
	feedback: string;
	score: number;
	timestamp: string;
}

export interface ContentUploadRequest {
	file: File;
	name: string;
	version: string;
}

export interface ContentUploadResponse {
	valid: boolean;
	version: string;
	timestamp: string;
	message: string;
	errors?: string[];
}

export interface StripeWebhookRequest {
	signature: string;
	body: string;
}

export interface StripeWebhookResponse {
	received: boolean;
	timestamp: string;
	message: string;
}
