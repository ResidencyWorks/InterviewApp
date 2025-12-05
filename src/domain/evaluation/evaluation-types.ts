import type {
	EvaluationRequest,
	EvaluationResponse,
	EvaluationResult,
} from "@/types/evaluation";

/**
 * Evaluation engine interface
 */
export interface EvaluationEngine {
	evaluate: (request: EvaluationRequest) => Promise<EvaluationResponse>;
	validate: (request: EvaluationRequest) => { valid: boolean; error?: string };
}

/**
 * Evaluation service interface
 */
export interface EvaluationServiceInterface {
	evaluate: (request: EvaluationRequest) => Promise<EvaluationResult>;
	getResult: (id: string) => Promise<EvaluationResult | null>;
	listResults: (
		userId: string,
		page?: number,
		limit?: number,
	) => Promise<EvaluationResult[]>;
	deleteResult: (id: string) => Promise<void>;
	getAnalytics: (userId: string) => Promise<Record<string, unknown>>;
}

/**
 * Evaluation configuration
 */
export interface EvaluationConfig {
	maxResponseLength: number;
	minResponseLength: number;
	maxAudioDuration: number;
	timeoutMs: number;
	retryAttempts: number;
	cacheResults: boolean;
	cacheTTL: number;
}

/**
 * Evaluation context
 */
export interface EvaluationContext {
	userId: string;
	sessionId?: string;
	contentPackId?: string;
	questionId?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Evaluation metrics
 */
export interface EvaluationMetrics {
	processingTime: number;
	wordCount: number;
	audioDuration?: number;
	apiCalls: number;
	cacheHits: number;
	errors: number;
}

/**
 * Evaluation cache entry
 */
export interface EvaluationCacheEntry {
	id: string;
	request: EvaluationRequest;
	response: EvaluationResponse;
	timestamp: number;
	ttl: number;
}

/**
 * Evaluation queue item
 */
export interface EvaluationQueueItem {
	id: string;
	request: EvaluationRequest;
	context: EvaluationContext;
	priority: number;
	createdAt: number;
	attempts: number;
	maxAttempts: number;
}

/**
 * Evaluation worker interface
 */
export interface EvaluationWorker {
	process: (item: EvaluationQueueItem) => Promise<EvaluationResult>;
	isHealthy: () => Promise<boolean>;
	getMetrics: () => Promise<EvaluationMetrics>;
}

/**
 * Evaluation API response
 */
export interface EvaluationAPIResponse {
	success: boolean;
	data?: EvaluationResult;
	error?: string;
	metrics?: EvaluationMetrics;
}

/**
 * Evaluation batch request
 */
export interface EvaluationBatchRequest {
	requests: EvaluationRequest[];
	context: EvaluationContext;
	options?: {
		parallel?: boolean;
		maxConcurrency?: number;
		timeout?: number;
	};
}

/**
 * Evaluation batch response
 */
export interface EvaluationBatchResponse {
	results: EvaluationResult[];
	errors: Array<{ index: number; error: string }>;
	metrics: EvaluationMetrics;
	totalTime: number;
}

/**
 * Evaluation health check
 */
export interface EvaluationHealthCheck {
	status: "healthy" | "degraded" | "unhealthy";
	engines: Array<{
		name: string;
		status: "healthy" | "unhealthy";
		latency: number;
		error?: string;
	}>;
	queue: {
		pending: number;
		processing: number;
		failed: number;
	};
	cache: {
		hitRate: number;
		size: number;
		memoryUsage: number;
	};
	lastChecked: string;
}
