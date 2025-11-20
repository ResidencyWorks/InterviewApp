import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/environment";

// BullMQ requires a persistent Redis connection (not HTTP)
// We use REDIS_URL if available, otherwise fallback to localhost for dev
const redisUrl = env.REDIS_URL || "redis://localhost:6379";

// Create a shared connection for the queue
// Note: Workers will need their own connection
export const connection = new IORedis(redisUrl, {
	maxRetriesPerRequest: null, // Required by BullMQ
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
