import { env } from "../infrastructure/config/environment";

export const evaluationConfig = {
	syncTimeoutMs: env.SYNC_TIMEOUT_MS,
	rateLimitRpm: env.RATE_LIMIT_RPM,
	webhookSecret: env.EVALUATION_WEBHOOK_SECRET,
};
