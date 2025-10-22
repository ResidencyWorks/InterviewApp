import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

// Custom metrics for performance tracking
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");
const throughput = new Counter("requests_total");
const evaluationTime = new Trend("evaluation_time");
const authTime = new Trend("auth_time");
const contentTime = new Trend("content_time");

// Performance benchmark configuration
export const options = {
	scenarios: {
		// Baseline performance test
		baseline: {
			executor: "constant-vus",
			vus: 10,
			duration: "5m",
			exec: "baselineTest",
		},
		// Peak performance test
		peak: {
			executor: "ramping-vus",
			startTime: "5m",
			stages: [
				{ duration: "2m", target: 50 },
				{ duration: "3m", target: 100 },
				{ duration: "2m", target: 150 },
				{ duration: "1m", target: 0 },
			],
			exec: "peakTest",
		},
		// Stress test
		stress: {
			executor: "ramping-vus",
			startTime: "13m",
			stages: [
				{ duration: "1m", target: 200 },
				{ duration: "2m", target: 300 },
				{ duration: "1m", target: 400 },
				{ duration: "1m", target: 0 },
			],
			exec: "stressTest",
		},
	},
	thresholds: {
		// Performance thresholds
		http_req_duration: ["p(95)<500", "p(99)<1000"],
		http_req_failed: ["rate<0.01"],
		errors: ["rate<0.01"],
		response_time: ["p(95)<500"],
		evaluation_time: ["p(95)<2000"],
		auth_time: ["p(95)<300"],
		content_time: ["p(95)<500"],
	},
};

// Base URL
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Test data
const testData = {
	users: [
		{ email: "perf1@example.com", name: "Performance User 1" },
		{ email: "perf2@example.com", name: "Performance User 2" },
		{ email: "perf3@example.com", name: "Performance User 3" },
	],
	questions: [
		"Tell me about yourself and your background",
		"What are your greatest strengths and weaknesses?",
		"Why are you interested in this position?",
		"Describe a challenging project you worked on",
		"How do you handle stress and pressure?",
		"What is your greatest achievement?",
		"Where do you see yourself in 5 years?",
		"How do you work in a team environment?",
	],
	responses: [
		"I am a dedicated professional with extensive experience in software development. I have worked on various projects and have a strong background in both frontend and backend technologies.",
		"My greatest strength is my ability to learn quickly and adapt to new technologies. I am also very detail-oriented and enjoy solving complex problems. My weakness is that I sometimes spend too much time perfecting details.",
		"I am interested in this position because it aligns with my career goals and allows me to work with cutting-edge technologies. I am excited about the opportunity to contribute to your team.",
		"I worked on a challenging project where we had to migrate a legacy system to a modern architecture. The project required careful planning and coordination with multiple teams.",
		"I handle stress by staying organized and breaking down large tasks into smaller, manageable pieces. I also make sure to take breaks and maintain a healthy work-life balance.",
	],
};

// Helper functions
function getRandomItem(array) {
	return array[Math.floor(Math.random() * array.length)];
}

function getRandomUser() {
	return getRandomItem(testData.users);
}

function getRandomQuestion() {
	return getRandomItem(testData.questions);
}

function getRandomResponse() {
	return getRandomItem(testData.responses);
}

// Baseline performance test
export function baselineTest() {
	const scenarios = [
		testHealthCheck,
		testAuthenticationFlow,
		testEvaluationAPI,
		testContentPackAPI,
	];

	const scenario = getRandomItem(scenarios);
	scenario();

	sleep(1);
}

// Peak performance test
export function peakTest() {
	const scenarios = [
		testHealthCheck,
		testAuthenticationFlow,
		testEvaluationAPI,
		testContentPackAPI,
		testUserProfile,
	];

	const scenario = getRandomItem(scenarios);
	scenario();

	sleep(0.5);
}

// Stress test
export function stressTest() {
	const scenarios = [testHealthCheck, testEvaluationAPI, testContentPackAPI];

	const scenario = getRandomItem(scenarios);
	scenario();

	sleep(0.1);
}

// Individual test functions
function testHealthCheck() {
	const startTime = Date.now();
	const response = http.get(`${BASE_URL}/api/health`);
	const _duration = Date.now() - startTime;

	const success = check(response, {
		"health check status is 200": (r) => r.status === 200,
		"health check response time < 100ms": (r) => r.timings.duration < 100,
		"health check has valid JSON": (r) => {
			try {
				JSON.parse(r.body);
				return true;
			} catch (_e) {
				return false;
			}
		},
	});

	errorRate.add(!success);
	responseTime.add(response.timings.duration);
	throughput.add(1);
}

function testAuthenticationFlow() {
	const user = getRandomUser();
	const _startTime = Date.now();

	// Test login
	const loginResponse = http.post(
		`${BASE_URL}/api/auth/login`,
		JSON.stringify({
			email: user.email,
		}),
		{
			headers: { "Content-Type": "application/json" },
		},
	);

	const loginSuccess = check(loginResponse, {
		"login status is 200": (r) => r.status === 200,
		"login response time < 300ms": (r) => r.timings.duration < 300,
	});

	errorRate.add(!loginSuccess);
	authTime.add(loginResponse.timings.duration);
	throughput.add(1);

	// Test callback
	const callbackResponse = http.get(
		`${BASE_URL}/api/auth/callback?token=test-token`,
	);

	const callbackSuccess = check(callbackResponse, {
		"callback responds": (r) => r.status === 200 || r.status === 400,
		"callback response time < 200ms": (r) => r.timings.duration < 200,
	});

	errorRate.add(!callbackSuccess);
	authTime.add(callbackResponse.timings.duration);
	throughput.add(1);
}

function testEvaluationAPI() {
	const question = getRandomQuestion();
	const response = getRandomResponse();
	const _startTime = Date.now();

	const evalResponse = http.post(
		`${BASE_URL}/api/evaluate`,
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
		"evaluation status is 200": (r) => r.status === 200,
		"evaluation response time < 2s": (r) => r.timings.duration < 2000,
		"evaluation has score": (r) => {
			try {
				const body = JSON.parse(r.body);
				return body.score !== undefined && body.score >= 0 && body.score <= 100;
			} catch (_e) {
				return false;
			}
		},
		"evaluation has feedback": (r) => {
			try {
				const body = JSON.parse(r.body);
				return body.feedback && body.feedback.length > 0;
			} catch (_e) {
				return false;
			}
		},
	});

	errorRate.add(!success);
	evaluationTime.add(evalResponse.timings.duration);
	responseTime.add(evalResponse.timings.duration);
	throughput.add(1);
}

function testContentPackAPI() {
	const _startTime = Date.now();

	// Test list content packs
	const listResponse = http.get(`${BASE_URL}/api/content/packs`);

	const listSuccess = check(listResponse, {
		"content packs list status is 200": (r) => r.status === 200,
		"content packs list response time < 300ms": (r) => r.timings.duration < 300,
	});

	errorRate.add(!listSuccess);
	contentTime.add(listResponse.timings.duration);
	throughput.add(1);

	// Test get specific content pack
	const packResponse = http.get(`${BASE_URL}/api/content/packs/default`);

	const packSuccess = check(packResponse, {
		"content pack status is 200": (r) => r.status === 200,
		"content pack response time < 500ms": (r) => r.timings.duration < 500,
		"content pack has questions": (r) => {
			try {
				const body = JSON.parse(r.body);
				return body.questions && body.questions.length > 0;
			} catch (_e) {
				return false;
			}
		},
	});

	errorRate.add(!packSuccess);
	contentTime.add(packResponse.timings.duration);
	throughput.add(1);
}

function testUserProfile() {
	const user = getRandomUser();
	const _startTime = Date.now();

	const profileResponse = http.get(`${BASE_URL}/api/user/profile`, {
		headers: { Authorization: `Bearer test-token-${user.email}` },
	});

	const success = check(profileResponse, {
		"user profile status is 200 or 401": (r) =>
			r.status === 200 || r.status === 401,
		"user profile response time < 300ms": (r) => r.timings.duration < 300,
	});

	errorRate.add(!success);
	responseTime.add(profileResponse.timings.duration);
	throughput.add(1);
}

// Setup function
export function setup() {
	console.log("Starting performance benchmark setup...");

	// Verify system is ready
	const healthCheck = http.get(`${BASE_URL}/api/health`);
	if (healthCheck.status !== 200) {
		throw new Error("System not ready for performance testing");
	}

	console.log("Performance benchmark setup completed");
	return { baseUrl: BASE_URL };
}

// Teardown function
export function teardown(_data) {
	console.log("Performance benchmark teardown completed");
}
