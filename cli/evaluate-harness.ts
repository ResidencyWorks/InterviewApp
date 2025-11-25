#!/usr/bin/env tsx
/**
 * CLI Harness for SLA Testing of Evaluation API
 *
 * Sends a configurable number of evaluation requests (mix of text and audio)
 * and reports latency percentiles (p50/p95/p99), success rate, and token usage.
 *
 * Usage:
 *   pnpm test:sla
 *   tsx cli/evaluate-harness.ts --count 30 --api-url http://localhost:3000
 */

import { v4 as uuidv4 } from "uuid";
import { calculateStats, formatStats } from "../src/lib/metrics/percentiles";

interface HarnessConfig {
	count: number;
	apiUrl: string;
	bearerToken: string;
	mixRatio: number; // 0-1, fraction of text-only requests
	timeout: number; // ms
}

interface EvaluationRequest {
	requestId: string;
	text?: string;
	audio_url?: string;
}

interface EvaluationResult {
	status: "completed" | "processing";
	jobId?: string;
	result?: {
		requestId: string;
		score: number;
		feedback: string;
		durationMs: number;
		tokensUsed?: number;
	};
}

interface RequestMetrics {
	requestId: string;
	startTime: number;
	endTime: number;
	durationMs: number;
	success: boolean;
	status: "completed" | "processing" | "error";
	score?: number;
	tokensUsed?: number;
	error?: string;
}

const SAMPLE_TEXTS = [
	"I have 5 years of experience as a software engineer, specializing in full-stack development with React and Node.js.",
	"During my time at TechCorp, I led a team of 3 developers to build a new customer dashboard that reduced support tickets by 30%.",
	"I'm passionate about clean code and test-driven development. I believe in writing maintainable, scalable software.",
	"My biggest achievement was optimizing our database queries, which reduced page load time from 3 seconds to under 500ms.",
	"I'm looking for a role where I can contribute to meaningful projects and continue growing as a technical leader.",
];

const SAMPLE_AUDIO_URLS = [
	"https://example.com/sample-interview-1.mp3",
	"https://example.com/sample-interview-2.mp3",
	"https://example.com/sample-interview-3.mp3",
];

async function sendEvaluationRequest(
	config: HarnessConfig,
	request: EvaluationRequest,
): Promise<RequestMetrics> {
	const startTime = Date.now();

	try {
		const response = await fetch(`${config.apiUrl}/api/evaluate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${config.bearerToken}`,
			},
			body: JSON.stringify(request),
			signal: AbortSignal.timeout(config.timeout),
		});

		const endTime = Date.now();
		const durationMs = endTime - startTime;

		if (!response.ok) {
			return {
				requestId: request.requestId,
				startTime,
				endTime,
				durationMs,
				success: false,
				status: "error",
				error: `HTTP ${response.status}: ${response.statusText}`,
			};
		}

		const result = (await response.json()) as EvaluationResult;

		return {
			requestId: request.requestId,
			startTime,
			endTime,
			durationMs,
			success: result.status === "completed",
			status: result.status,
			score: result.result?.score,
			tokensUsed: result.result?.tokensUsed,
		};
	} catch (error) {
		const endTime = Date.now();
		const durationMs = endTime - startTime;

		return {
			requestId: request.requestId,
			startTime,
			endTime,
			durationMs,
			success: false,
			status: "error",
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function generateRequest(index: number, mixRatio: number): EvaluationRequest {
	const requestId = uuidv4();
	const isTextOnly = Math.random() < mixRatio;

	if (isTextOnly) {
		return {
			requestId,
			text: SAMPLE_TEXTS[index % SAMPLE_TEXTS.length],
		};
	}

	return {
		requestId,
		audio_url: SAMPLE_AUDIO_URLS[index % SAMPLE_AUDIO_URLS.length],
	};
}

async function runHarness(config: HarnessConfig): Promise<void> {
	console.log("🚀 Starting Evaluation API SLA Harness");
	console.log("======================================");
	console.log(`API URL: ${config.apiUrl}`);
	console.log(`Request Count: ${config.count}`);
	console.log(
		`Mix Ratio: ${Math.round(config.mixRatio * 100)}% text, ${Math.round((1 - config.mixRatio) * 100)}% audio`,
	);
	console.log(`Timeout: ${config.timeout}ms`);
	console.log();

	// Generate requests
	const requests: EvaluationRequest[] = [];
	for (let i = 0; i < config.count; i++) {
		requests.push(generateRequest(i, config.mixRatio));
	}

	console.log(`📝 Generated ${requests.length} requests`);
	console.log();

	// Send requests sequentially to avoid overwhelming the API
	const metrics: RequestMetrics[] = [];
	let completedCount = 0;

	for (let i = 0; i < requests.length; i++) {
		const request = requests[i];
		process.stdout.write(`\rSending request ${i + 1}/${requests.length}...`);

		const metric = await sendEvaluationRequest(config, request);
		metrics.push(metric);

		if (metric.success) {
			completedCount++;
		}

		// Small delay between requests
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	console.log("\n");
	console.log("✅ All requests completed");
	console.log();

	// Calculate statistics
	const allLatencies = metrics.map((m) => m.durationMs);
	const successfulLatencies = metrics
		.filter((m) => m.success)
		.map((m) => m.durationMs);

	const allStats = calculateStats(allLatencies);
	const successStats =
		successfulLatencies.length > 0 ? calculateStats(successfulLatencies) : null;

	const tokensUsed = metrics
		.filter((m) => m.tokensUsed !== undefined)
		.map((m) => m.tokensUsed as number);
	const tokenStats = tokensUsed.length > 0 ? calculateStats(tokensUsed) : null;

	// Print results
	console.log("📊 Results Summary");
	console.log("==================");
	console.log();

	console.log("Request Status:");
	console.log(`  Total: ${metrics.length}`);
	console.log(
		`  Completed: ${completedCount} (${((completedCount / metrics.length) * 100).toFixed(1)}%)`,
	);
	console.log(
		`  Processing: ${metrics.filter((m) => m.status === "processing").length}`,
	);
	console.log(
		`  Failed: ${metrics.filter((m) => m.status === "error").length}`,
	);
	console.log();

	console.log("⏱️  Latency Statistics (All Requests):");
	console.log(formatStats(allStats));
	console.log();

	if (successStats) {
		console.log("✅ Latency Statistics (Successful Only):");
		console.log(formatStats(successStats));
		console.log();
	}

	if (tokenStats) {
		console.log("🪙 Token Usage Statistics:");
		console.log(formatStats(tokenStats, " tokens"));
		console.log();
	}

	// SLA Compliance Check
	console.log("🎯 SLA Compliance:");
	const p95Target = 10000; // 10s in ms
	const p95Actual = successStats?.p95 ?? allStats.p95;
	const p95Pass = p95Actual < p95Target;

	console.log(`  Target: p95 < ${p95Target}ms`);
	console.log(`  Actual: p95 = ${p95Actual.toFixed(2)}ms`);
	console.log(`  Status: ${p95Pass ? "✅ PASS" : "❌ FAIL"}`);
	console.log();

	// Error summary
	const errors = metrics.filter((m) => m.error);
	if (errors.length > 0) {
		console.log("⚠️  Errors:");
		const errorCounts = new Map<string, number>();
		for (const error of errors) {
			const msg = error.error || "Unknown error";
			errorCounts.set(msg, (errorCounts.get(msg) || 0) + 1);
		}
		const errorEntries = Array.from(errorCounts.entries());
		for (let i = 0; i < errorEntries.length; i++) {
			const [msg, count] = errorEntries[i];
			console.log(`  - ${msg}: ${count} occurrence(s)`);
		}
		console.log();
	}

	// Exit with appropriate code
	if (!p95Pass || completedCount === 0) {
		process.exit(1);
	}
}

// Parse CLI arguments
function parseArgs(): HarnessConfig {
	const args = process.argv.slice(2);
	const config: HarnessConfig = {
		count: 25,
		apiUrl: process.env.API_BASE_URL || "http://localhost:3000",
		bearerToken: process.env.BEARER_TOKEN || "test-token",
		mixRatio: 0.7, // 70% text, 30% audio
		timeout: 30000, // 30s
	};

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case "--count":
			case "-c":
				config.count = Number.parseInt(args[++i], 10);
				break;
			case "--api-url":
			case "-u":
				config.apiUrl = args[++i];
				break;
			case "--token":
			case "-t":
				config.bearerToken = args[++i];
				break;
			case "--mix-ratio":
			case "-m":
				config.mixRatio = Number.parseFloat(args[++i]);
				break;
			case "--timeout":
				config.timeout = Number.parseInt(args[++i], 10);
				break;
			case "--help":
			case "-h":
				console.log(`
Usage: tsx cli/evaluate-harness.ts [options]

Options:
  -c, --count <n>        Number of requests to send (default: 25)
  -u, --api-url <url>    API base URL (default: http://localhost:3000)
  -t, --token <token>    Bearer token for authentication (default: test-token)
  -m, --mix-ratio <r>    Ratio of text vs audio (0-1, default: 0.7)
  --timeout <ms>         Request timeout in milliseconds (default: 30000)
  -h, --help             Show this help message

Environment Variables:
  API_BASE_URL           API base URL (overridden by --api-url)
  BEARER_TOKEN           Bearer token (overridden by --token)

Examples:
  pnpm test:sla
  tsx cli/evaluate-harness.ts --count 50
  tsx cli/evaluate-harness.ts --api-url https://api.example.com --token abc123
        `);
				process.exit(0);
		}
	}

	return config;
}

// Main execution
const config = parseArgs();
runHarness(config).catch((error) => {
	console.error("❌ Harness failed:", error);
	process.exit(1);
});
