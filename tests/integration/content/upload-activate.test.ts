import { describe, expect, it } from "vitest";

// This is a lightweight smoke test that ensures the routes exist.
// Full Next.js route handler integration usually needs Next test runner; here we assert handlers export.

import * as activateRoute from "@/app/api/content/activate/route";
import * as listRoute from "@/app/api/content/list/route";
import * as uploadRoute from "@/app/api/content/upload/route";

describe("content api routes", () => {
	it("exports POST on upload", () => {
		expect(typeof (uploadRoute as unknown as { POST: unknown }).POST).toBe(
			"function",
		);
	});
	it("exports GET on list", () => {
		expect(typeof (listRoute as unknown as { GET: unknown }).GET).toBe(
			"function",
		);
	});
	it("exports POST on activate", () => {
		expect(typeof (activateRoute as unknown as { POST: unknown }).POST).toBe(
			"function",
		);
	});
});
