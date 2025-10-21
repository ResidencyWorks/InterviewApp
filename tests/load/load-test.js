import { check, sleep } from "k6";
import http from "k6/http";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");

// Test configuration
export const options = {
	stages: [
		// Ramp up to 10 users over 30 seconds
		{ duration: "30s", target: 10 },
		// Stay at 10 users for 2 minutes
		{ duration: "2m", target: 10 },
		// Ramp up to 50 users over 1 minute
		{ duration: "1m", target: 50 },
		// Stay at 50 users for 3 minutes
		{ duration: "3m", target: 50 },
		// Ramp up to 100 users over 1 minute
		{ duration: "1m", target: 100 },
		// Stay at 100 users for 2 minutes
		{ duration: "2m", target: 100 },
		// Ramp down to 0 users over 30 seconds
		{ duration: "30s", target: 0 },
	],
	thresholds: {
		// 99% of requests must complete below 1 second, 95% below 500ms
		http_req_duration: ["p(99)<1000", "p(95)<500"],
		// Error rate must be below 1%
		http_req_failed: ["rate<0.01"],
		// Custom error rate threshold
		errors: ["rate<0.01"],
		// Custom response time threshold
		response_time: ["p(95)<500"],
	},
};

// Base URL from environment variable
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Test data
const testUsers = [
	{ email: "test1@example.com", name: "Test User 1" },
	{ email: "test2@example.com", name: "Test User 2" },
	{ email: "test3@example.com", name: "Test User 3" },
	{ email: "test4@example.com", name: "Test User 4" },
	{ email: "test5@example.com", name: "Test User 5" },
];

const testQuestions = [
	"Tell me about yourself",
	"What are your strengths and weaknesses?",
	"Why do you want to work here?",
	"Describe a challenging project you worked on",
	"How do you handle stress?",
];

// Helper function to get random test data
function getRandomUser() {
	return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function getRandomQuestion() {
	return testQuestions[Math.floor(Math.random() * testQuestions.length)];
}

// Test scenarios
export function setup() {
	// Setup function runs once before all VUs
	console.log("Starting load test setup...");

	// Test basic connectivity
	const healthCheck = http.get(`${BASE_URL}/api/health`);
	if (healthCheck.status !== 200) {
		throw new Error("Health check failed");
	}

	console.log("Load test setup completed");
	return { baseUrl: BASE_URL };
}

export default function (data) {
	// Main test function runs for each VU
	const scenarios = [
		testHealthEndpoint,
		testAuthentication,
		testEvaluationAPI,
		testContentPackAPI,
		testUserProfile,
	];

	// Randomly select a scenario
	const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
	scenario(data);

	// Wait between requests
	sleep(Math.random() * 2 + 1); // 1-3 seconds
}

// Test health endpoint
function testHealthEndpoint(data) {
	const response = http.get(`${data.baseUrl}/api/health`);

	const success = check(response, {
		"health endpoint status is 200": (r) => r.status === 200,
		"health endpoint response time < 100ms": (r) => r.timings.duration < 100,
		"health endpoint has required fields": (r) => {
			try {
				const body = JSON.parse(r.body);
				return body.status && body.timestamp;
			} catch (e) {
				return false;
			}
		},
	});

	errorRate.add(!success);
	responseTime.add(response.timings.duration);
}

// Test authentication endpoints
function testAuthentication(data) {
	const user = getRandomUser();

	// Test login endpoint
	const loginResponse = http.post(
		`${data.baseUrl}/api/auth/login`,
		JSON.stringify({
			email: user.email,
		}),
		{
			headers: { "Content-Type": "application/json" },
		},
	);

	const loginSuccess = check(loginResponse, {
		"login endpoint status is 200": (r) => r.status === 200,
		"login endpoint response time < 500ms": (r) => r.timings.duration < 500,
	});

	errorRate.add(!loginSuccess);
	responseTime.add(loginResponse.timings.duration);

	// Test callback endpoint (simulate)
	const callbackResponse = http.get(
		`${data.baseUrl}/api/auth/callback?token=test-token`,
	);

	const callbackSuccess = check(callbackResponse, {
		"callback endpoint responds": (r) => r.status === 200 || r.status === 400,
		"callback endpoint response time < 300ms": (r) => r.timings.duration < 300,
	});

	errorRate.add(!callbackSuccess);
	responseTime.add(callbackResponse.timings.duration);
}

// Test evaluation API
function testEvaluationAPI(data) {
	const question = getRandomQuestion();
	const response = `This is my response to the question: ${question}. I believe this demonstrates my experience and skills in this area.`;

	const evalResponse = http.post(
		`${data.baseUrl}/api/evaluate`,
		JSON.stringify({
			question: question,
			response: response,
			type: "text",
		}),
		{
			headers: { "Content-Type": "application/json" },
		},
	);

	const success = check(evalResponse, {
		"evaluation endpoint status is 200": (r) => r.status === 200,
		"evaluation endpoint response time < 2s": (r) => r.timings.duration < 2000,
		"evaluation response has score": (r) => {
			try {
				const body = JSON.parse(r.body);
				return body.score !== undefined;
			} catch (e) {
				return false;
			}
		},
	});

	errorRate.add(!success);
	responseTime.add(evalResponse.timings.duration);
}

// Test content pack API
function testContentPackAPI(data) {
	// Test getting content packs
	const listResponse = http.get(`${data.baseUrl}/api/content/packs`);

	const listSuccess = check(listResponse, {
		"content packs list status is 200": (r) => r.status === 200,
		"content packs list response time < 300ms": (r) => r.timings.duration < 300,
	});

	errorRate.add(!listSuccess);
	responseTime.add(listResponse.timings.duration);

	// Test getting specific content pack
	const packResponse = http.get(`${data.baseUrl}/api/content/packs/default`);

	const packSuccess = check(packResponse, {
		"content pack status is 200": (r) => r.status === 200,
		"content pack response time < 500ms": (r) => r.timings.duration < 500,
	});

	errorRate.add(!packSuccess);
	responseTime.add(packResponse.timings.duration);
}

// Test user profile endpoints
function testUserProfile(data) {
	const user = getRandomUser();

	// Test getting user profile
	const profileResponse = http.get(`${data.baseUrl}/api/user/profile`, {
		headers: { Authorization: `Bearer test-token-${user.email}` },
	});

	const profileSuccess = check(profileResponse, {
		"user profile status is 200 or 401": (r) =>
			r.status === 200 || r.status === 401,
		"user profile response time < 300ms": (r) => r.timings.duration < 300,
	});

	errorRate.add(!profileSuccess);
	responseTime.add(profileResponse.timings.duration);
}

export function teardown(data) {
	// Teardown function runs once after all VUs
	console.log("Load test teardown completed");
}
