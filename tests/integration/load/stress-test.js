import { check, sleep } from "k6";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

// Custom metrics for stress testing
const errorRate = new Rate("errors");
const responseTime = new Trend("response_time");
const throughput = new Counter("requests_total");
const _memoryUsage = new Trend("memory_usage");
const _cpuUsage = new Trend("cpu_usage");

// Stress test configuration
export const options = {
	stages: [
		// Gradual ramp up to identify breaking point
		{ duration: "2m", target: 50 },
		{ duration: "3m", target: 100 },
		{ duration: "3m", target: 150 },
		{ duration: "3m", target: 200 },
		{ duration: "3m", target: 250 },
		{ duration: "3m", target: 300 },
		{ duration: "3m", target: 350 },
		{ duration: "3m", target: 400 },
		{ duration: "3m", target: 450 },
		{ duration: "3m", target: 500 },
		// Hold at peak load
		{ duration: "5m", target: 500 },
		// Ramp down
		{ duration: "2m", target: 0 },
	],
	thresholds: {
		// More lenient thresholds for stress testing
		http_req_duration: ["p(95)<2000", "p(99)<5000"],
		http_req_failed: ["rate<0.05"], // Allow up to 5% failure rate
		errors: ["rate<0.05"],
		response_time: ["p(95)<2000"],
	},
};

// Base URL
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Test data for stress testing
const stressTestData = {
	users: Array.from({ length: 100 }, (_, i) => ({
		email: `stress${i}@example.com`,
		name: `Stress User ${i}`,
	})),
	questions: [
		"Tell me about yourself and your professional background",
		"What are your greatest strengths and how do they apply to this role?",
		"Describe a challenging project you worked on and how you overcame obstacles",
		"How do you handle stress and pressure in the workplace?",
		"What is your greatest professional achievement and why?",
		"Where do you see yourself in 5 years professionally?",
		"How do you work effectively in a team environment?",
		"Describe a time when you had to learn a new technology quickly",
		"How do you prioritize tasks when you have multiple deadlines?",
		"What motivates you in your work?",
	],
	responses: [
		"I am a dedicated professional with extensive experience in software development and project management. I have successfully led multiple teams and delivered complex projects on time and within budget.",
		"My greatest strength is my ability to analyze complex problems and develop innovative solutions. I am also highly adaptable and can quickly learn new technologies and methodologies.",
		"I worked on a challenging project where we had to migrate a legacy system to a modern cloud-based architecture. The project required careful planning, risk management, and coordination with multiple stakeholders.",
		"I handle stress by staying organized, maintaining clear communication with my team, and breaking down large tasks into manageable pieces. I also ensure I take breaks and maintain a healthy work-life balance.",
		"My greatest achievement was leading a team that developed a new product that increased company revenue by 40%. This required innovative thinking, strong leadership, and excellent project management skills.",
	],
};

// Helper functions
function getRandomItem(array) {
	return array[Math.floor(Math.random() * array.length)];
}

function getRandomUser() {
	return getRandomItem(stressTestData.users);
}

function getRandomQuestion() {
	return getRandomItem(stressTestData.questions);
}

function getRandomResponse() {
	return getRandomItem(stressTestData.responses);
}

// Main test function
export default function () {
	const scenarios = [
		testHealthEndpoint,
		testAuthenticationStress,
		testEvaluationStress,
		testContentPackStress,
		testConcurrentUsers,
	];

	// Randomly select a scenario
	const scenario = getRandomItem(scenarios);
	scenario();

	// Minimal sleep for stress testing
	sleep(0.1);
}

// Health endpoint stress test
function testHealthEndpoint() {
	const response = http.get(`${BASE_URL}/api/health`);

	const success = check(response, {
		"health endpoint responds": (r) => r.status === 200 || r.status === 503,
		"health endpoint response time < 5s": (r) => r.timings.duration < 5000,
	});

	errorRate.add(!success);
	responseTime.add(response.timings.duration);
	throughput.add(1);
}

// Authentication stress test
function testAuthenticationStress() {
	const user = getRandomUser();

	// Test login endpoint under stress
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
		"login endpoint responds": (r) =>
			r.status === 200 || r.status === 429 || r.status === 503,
		"login response time < 5s": (r) => r.timings.duration < 5000,
	});

	errorRate.add(!loginSuccess);
	responseTime.add(loginResponse.timings.duration);
	throughput.add(1);

	// Test callback endpoint under stress
	const callbackResponse = http.get(
		`${BASE_URL}/api/auth/callback?token=stress-test-token`,
	);

	const callbackSuccess = check(callbackResponse, {
		"callback endpoint responds": (r) =>
			r.status === 200 || r.status === 400 || r.status === 429,
		"callback response time < 3s": (r) => r.timings.duration < 3000,
	});

	errorRate.add(!callbackSuccess);
	responseTime.add(callbackResponse.timings.duration);
	throughput.add(1);
}

// Evaluation API stress test
function testEvaluationStress() {
	const question = getRandomQuestion();
	const response = getRandomResponse();

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
		"evaluation endpoint responds": (r) =>
			r.status === 200 || r.status === 429 || r.status === 503,
		"evaluation response time < 10s": (r) => r.timings.duration < 10000,
		"evaluation has valid response": (r) => {
			if (r.status !== 200) return true; // Allow non-200 responses under stress
			try {
				const body = JSON.parse(r.body);
				return body.score !== undefined || body.error !== undefined;
			} catch (_e) {
				return false;
			}
		},
	});

	errorRate.add(!success);
	responseTime.add(evalResponse.timings.duration);
	throughput.add(1);
}

// Content pack API stress test
function testContentPackStress() {
	// Test list endpoint under stress
	const listResponse = http.get(`${BASE_URL}/api/content/packs`);

	const listSuccess = check(listResponse, {
		"content packs list responds": (r) =>
			r.status === 200 || r.status === 429 || r.status === 503,
		"content packs list response time < 3s": (r) => r.timings.duration < 3000,
	});

	errorRate.add(!listSuccess);
	responseTime.add(listResponse.timings.duration);
	throughput.add(1);

	// Test specific pack endpoint under stress
	const packResponse = http.get(`${BASE_URL}/api/content/packs/default`);

	const packSuccess = check(packResponse, {
		"content pack responds": (r) =>
			r.status === 200 || r.status === 429 || r.status === 503,
		"content pack response time < 5s": (r) => r.timings.duration < 5000,
	});

	errorRate.add(!packSuccess);
	responseTime.add(packResponse.timings.duration);
	throughput.add(1);
}

// Concurrent users stress test
function testConcurrentUsers() {
	const user = getRandomUser();

	// Simulate multiple concurrent requests from the same user
	const requests = [
		http.get(`${BASE_URL}/api/user/profile`, {
			headers: { Authorization: `Bearer stress-token-${user.email}` },
		}),
		http.get(`${BASE_URL}/api/content/packs`),
		http.get(`${BASE_URL}/api/health`),
	];

	requests.forEach((response, index) => {
		const success = check(response, {
			[`concurrent request ${index + 1} responds`]: (r) =>
				r.status === 200 ||
				r.status === 401 ||
				r.status === 429 ||
				r.status === 503,
			[`concurrent request ${index + 1} response time < 5s`]: (r) =>
				r.timings.duration < 5000,
		});

		errorRate.add(!success);
		responseTime.add(response.timings.duration);
		throughput.add(1);
	});
}

// Setup function
export function setup() {
	console.log("Starting stress test setup...");

	// Verify system is ready
	const healthCheck = http.get(`${BASE_URL}/api/health`);
	if (healthCheck.status !== 200) {
		console.log("Warning: System may not be ready for stress testing");
	}

	console.log("Stress test setup completed");
	return { baseUrl: BASE_URL };
}

// Teardown function
export function teardown(_data) {
	console.log("Stress test teardown completed");
}
