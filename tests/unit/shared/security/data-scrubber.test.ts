import { describe, expect, it } from "vitest";
import { DataScrubber } from "@/shared/security/data-scrubber";

describe("DataScrubber", () => {
	describe("scrubObject", () => {
		it("should scrub email fields", () => {
			const obj = {
				email: "user@example.com",
				name: "John Doe",
			};
			const result = DataScrubber.scrubObject(obj);
			expect(result.email).toBe("[REDACTED]");
			expect(result.name).toBe("[REDACTED]");
		});

		it("should scrub phone number fields", () => {
			const obj = {
				phone: "555-123-4567",
				phoneNumber: "(555) 987-6543",
			};
			const result = DataScrubber.scrubObject(obj);
			expect(result.phone).toBe("[REDACTED]");
			expect(result.phoneNumber).toBe("[REDACTED]");
		});

		it("should scrub name fields", () => {
			const obj = {
				name: "John Doe",
				fullName: "Jane Smith",
				userName: "jdoe",
			};
			const result = DataScrubber.scrubObject(obj);
			expect(result.name).toBe("[REDACTED]");
			expect(result.fullName).toBe("[REDACTED]");
			expect(result.userName).toBe("[REDACTED]");
		});

		it("should scrub nested objects recursively", () => {
			const obj = {
				user: {
					email: "user@example.com",
					name: "John Doe",
					metadata: {
						phone: "555-123-4567",
					},
				},
				other: "safe data",
			};
			const result = DataScrubber.scrubObject(obj);
			expect(
				(
					result.user as {
						email: string;
						name: string;
						metadata: { phone: string };
					}
				).email,
			).toBe("[REDACTED]");
			expect(
				(
					result.user as {
						email: string;
						name: string;
						metadata: { phone: string };
					}
				).name,
			).toBe("[REDACTED]");
			expect(
				(
					result.user as {
						email: string;
						name: string;
						metadata: { phone: string };
					}
				).metadata.phone,
			).toBe("[REDACTED]");
			expect(result.other).toBe("safe data");
		});

		it("should scrub arrays of objects", () => {
			const obj = {
				users: [
					{ email: "user1@example.com", name: "User 1" },
					{ email: "user2@example.com", name: "User 2" },
				],
			};
			const result = DataScrubber.scrubObject(obj);
			expect((result.users as { email: string; name: string }[])[0].email).toBe(
				"[REDACTED]",
			);
			expect((result.users as { email: string; name: string }[])[0].name).toBe(
				"[REDACTED]",
			);
			expect((result.users as { email: string; name: string }[])[1].email).toBe(
				"[REDACTED]",
			);
			expect((result.users as { email: string; name: string }[])[1].name).toBe(
				"[REDACTED]",
			);
		});

		it("should preserve non-PHI fields", () => {
			const obj = {
				id: "123",
				timestamp: "2025-01-27",
				status: "active",
				count: 42,
			};
			const result = DataScrubber.scrubObject(obj);
			expect(result.id).toBe("123");
			expect(result.timestamp).toBe("2025-01-27");
			expect(result.status).toBe("active");
			expect(result.count).toBe(42);
		});

		it("should handle case-insensitive field matching", () => {
			const obj = {
				Email: "user@example.com",
				EMAIL_ADDRESS: "admin@example.com",
				userEmail: "test@example.com",
			};
			const result = DataScrubber.scrubObject(obj);
			expect(result.Email).toBe("[REDACTED]");
			expect(result.EMAIL_ADDRESS).toBe("[REDACTED]");
			expect(result.userEmail).toBe("[REDACTED]");
		});

		it("should handle null and undefined values", () => {
			const obj = {
				email: null,
				name: undefined,
				phone: "555-123-4567",
			};
			const result = DataScrubber.scrubObject(obj);
			expect(result.email).toBeNull();
			expect(result.name).toBeUndefined();
			expect(result.phone).toBe("[REDACTED]");
		});

		it("should handle empty objects", () => {
			const result = DataScrubber.scrubObject({});
			expect(result).toEqual({});
		});

		it("should not modify arrays of primitives", () => {
			const obj = {
				tags: ["tag1", "tag2", "tag3"],
				numbers: [1, 2, 3],
			};
			const result = DataScrubber.scrubObject(obj);
			expect(result.tags).toEqual(["tag1", "tag2", "tag3"]);
			expect(result.numbers).toEqual([1, 2, 3]);
		});

		it("should scrub address-related fields", () => {
			const obj = {
				address: "123 Main St",
				street: "456 Oak Ave",
				zip: "12345",
				postalCode: "67890",
			};
			const result = DataScrubber.scrubObject(obj);
			expect(result.address).toBe("[REDACTED]");
			expect(result.street).toBe("[REDACTED]");
			expect(result.zip).toBe("[REDACTED]");
			expect(result.postalCode).toBe("[REDACTED]");
		});
	});
});
