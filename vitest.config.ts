import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		include: [
			"tests/unit/**/*.{test,spec}.{ts,tsx,js}",
			"tests/integration/**/*.{test,spec}.{ts,tsx,js}",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			reportsDirectory: "./coverage",
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80,
				},
			},
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/build/**",
				"**/coverage/**",
				"**/tests/**",
				"**/*.config.{ts,js}",
				"**/*.d.ts",
				"**/types/**",
				"**/__mocks__/**",
				"**/__fixtures__/**",
				"**/stories/**",
				"**/*.stories.{ts,tsx}",
				"**/*.test.{ts,tsx}",
				"**/*.spec.{ts,tsx}",
			],
		},
		environment: "jsdom",
		globals: true,
		setupFiles: ["./tests/setup.ts"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
			"tests/e2e/**",
		],
	},
});
