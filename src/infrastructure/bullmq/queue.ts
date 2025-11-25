import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/environment";

// BullMQ requires a native Redis protocol connection (TCP, not HTTP REST)
// Upstash provides BOTH connection types:
// 1. REST API: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (for @upstash/redis)
// 2. Native Redis: REDIS_URL (for BullMQ/ioredis)
//
// Get your native Redis URL from Upstash Dashboard:
// - Go to https://console.upstash.com
// - Click your database
// - Find "Redis Connect" section
// - Copy the URL that starts with redis:// or rediss://
//
// Format: rediss://default:YOUR_PASSWORD@equipped-chow-27101.upstash.io:6379

// Use Upstash Redis with BullMQ
// Extract endpoint from REST URL and use token as password
if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
	throw new Error(
		"UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set for BullMQ to work.",
	);
}

// Extract host from REST URL (e.g., https://equipped-chow-27101.upstash.io -> equipped-chow-27101.upstash.io)
const restUrl = new URL(env.UPSTASH_REDIS_REST_URL);

export const connection = new IORedis({
	host: restUrl.hostname,
	port: 6379,
	password: env.UPSTASH_REDIS_REST_TOKEN,
	tls: {},
	maxRetriesPerRequest: null, // Required by BullMQ
	enableReadyCheck: false,
});

export const EVALUATION_QUEUE_NAME = "evaluationQueue";

export const evaluationQueue = new Queue(EVALUATION_QUEUE_NAME, {
	connection,
	defaultJobOptions: {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 1000, // 1s, 2s, 4s
		},
		removeOnComplete: 100, // Keep last 100 completed
		removeOnFail: 1000, // Keep last 1000 failed
	},
});
