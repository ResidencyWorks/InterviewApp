import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const THRESHOLD = 80;

console.log("Running coverage check...");

try {
	// Run vitest with coverage enabled
	execSync("npx vitest run --coverage --reporter=verbose", {
		stdio: "inherit",
	});
} catch {
	console.error("❌ Tests failed during coverage check");
	process.exit(1);
}

// Parse coverage from JSON report
try {
	const coveragePath = join(process.cwd(), "coverage", "coverage-final.json");
	const coverageData = JSON.parse(readFileSync(coveragePath, "utf-8"));

	// Calculate totals from coverage-final.json
	let totalStatements = 0;
	let coveredStatements = 0;
	let totalBranches = 0;
	let coveredBranches = 0;
	let totalFunctions = 0;
	let coveredFunctions = 0;
	let totalLines = 0;
	let coveredLines = 0;

	for (const filePath in coverageData) {
		const file = coverageData[filePath];
		if (!file.s || !file.b || !file.f) continue;

		// Statements
		for (const count of Object.values(file.s as Record<string, number>)) {
			totalStatements++;
			if (count > 0) coveredStatements++;
		}

		// Branches
		for (const branchData of Object.values(
			file.b as Record<string, number[]>,
		)) {
			for (const count of branchData) {
				totalBranches++;
				if (count > 0) coveredBranches++;
			}
		}

		// Functions
		for (const count of Object.values(file.f as Record<string, number>)) {
			totalFunctions++;
			if (count > 0) coveredFunctions++;
		}

		// Lines (use statement map as proxy)
		totalLines += Object.keys(file.s as Record<string, number>).length;
		coveredLines += Object.values(file.s as Record<string, number>).filter(
			(c) => c > 0,
		).length;
	}

	const total = {
		statements: (coveredStatements / totalStatements) * 100 || 0,
		branches: (coveredBranches / totalBranches) * 100 || 0,
		functions: (coveredFunctions / totalFunctions) * 100 || 0,
		lines: (coveredLines / totalLines) * 100 || 0,
	};
	const metrics = {
		statements: total.statements,
		branches: total.branches,
		functions: total.functions,
		lines: total.lines,
	};

	console.log("\n📊 Coverage Summary:");
	console.log(`  Statements: ${metrics.statements.toFixed(2)}%`);
	console.log(`  Branches:   ${metrics.branches.toFixed(2)}%`);
	console.log(`  Functions:  ${metrics.functions.toFixed(2)}%`);
	console.log(`  Lines:      ${metrics.lines.toFixed(2)}%`);

	const failures: string[] = [];
	for (const [metric, value] of Object.entries(metrics)) {
		if (value < THRESHOLD) {
			failures.push(
				`${metric}: ${value.toFixed(2)}% (required: ${THRESHOLD}%)`,
			);
		}
	}

	if (failures.length > 0) {
		console.error("\n❌ Coverage check failed! Thresholds not met:");
		for (const failure of failures) {
			console.error(`  - ${failure}`);
		}
		process.exit(1);
	}

	console.log(`\n✅ Coverage check passed! All metrics ≥ ${THRESHOLD}%`);
} catch (error) {
	console.error(
		"❌ Failed to parse coverage report:",
		error instanceof Error ? error.message : error,
	);
	process.exit(1);
}
