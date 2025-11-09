import { beforeEach, describe, expect, it, vi } from "vitest";

type MockFn = ReturnType<typeof vi.fn>;
type AuthMock = {
	getUser: MockFn;
	signInWithOtp: MockFn;
	signOut: MockFn;
	updateUser: MockFn;
};

// Mock the entire Supabase client module
vi.mock("@/infrastructure/supabase/client", () => {
	const mockAuth = {
		getUser: vi.fn(),
		signInWithOtp: vi.fn(),
		signOut: vi.fn(),
		updateUser: vi.fn(),
	};

	return {
		createClient: () => ({
			auth: mockAuth,
		}),
	};
});

// Mock the server client module
vi.mock("@/infrastructure/supabase/server", () => {
	const mockAuth = {
		getUser: vi.fn(),
		signInWithOtp: vi.fn(),
		signOut: vi.fn(),
		updateUser: vi.fn(),
	};

	return {
		createClient: () => ({
			auth: mockAuth,
		}),
	};
});

// Mock Next.js cookies
vi.mock("next/headers", () => ({
	cookies: () => ({
		getAll: vi.fn(() => []),
		set: vi.fn(),
	}),
}));

// Import after mocking
import { AuthService } from "@/features/auth/application/services/auth-service";

describe("AuthService", () => {
	let authService: AuthService;
	let mockAuth: AuthMock;

	beforeEach(async () => {
		vi.clearAllMocks();
		authService = new AuthService();

		// Get the mocked auth methods
		const { createClient } = await import("@/infrastructure/supabase/client");
		const client = createClient();
		mockAuth = client.auth as unknown as AuthMock;
	});

	describe("signInWithMagicLink", () => {
		it("should send magic link successfully", async () => {
			const email = "test@example.com";
			const mockResponse = { error: null };

			mockAuth.signInWithOtp.mockResolvedValue(mockResponse);

			await expect(
				authService.signInWithMagicLink({
					email,
					options: {
						emailRedirectTo: "http://localhost:3000/auth/callback",
					},
				}),
			).resolves.toBeUndefined();

			expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
				email,
				options: {
					emailRedirectTo: "http://localhost:3000/auth/callback",
				},
			});
		});

		it("should handle sign in error", async () => {
			const email = "test@example.com";
			const errorMessage = "Invalid email";
			const mockResponse = { error: { message: errorMessage } };

			mockAuth.signInWithOtp.mockResolvedValue(mockResponse);

			await expect(
				authService.signInWithMagicLink({
					email,
					options: {
						emailRedirectTo: "http://localhost:3000/auth/callback",
					},
				}),
			).rejects.toThrow("Sign in failed");
		});

		it("should validate email format", async () => {
			const invalidEmail = "invalid-email";

			await expect(
				authService.signInWithMagicLink({
					email: invalidEmail,
				}),
			).rejects.toThrow("Sign in failed");
		});
	});

	describe("signOut", () => {
		it("should sign out successfully", async () => {
			const mockResponse = { error: null };

			mockAuth.signOut.mockResolvedValue(mockResponse);

			await expect(authService.signOut()).resolves.toBeUndefined();

			expect(mockAuth.signOut).toHaveBeenCalled();
		});

		it("should handle sign out error", async () => {
			const errorMessage = "Sign out failed";
			const mockResponse = { error: { message: errorMessage } };

			mockAuth.signOut.mockResolvedValue(mockResponse);

			await expect(authService.signOut()).rejects.toThrow(errorMessage);
		});
	});

	describe("getUser", () => {
		it("should return current user", async () => {
			const mockUser = {
				email: "test@example.com",
				id: "123",
				user_metadata: { full_name: "Test User" },
			};
			const mockResponse = { data: { user: mockUser }, error: null };

			mockAuth.getUser.mockResolvedValue(mockResponse);

			const result = await authService.getUser();

			expect(mockAuth.getUser).toHaveBeenCalled();
			expect(result).toEqual(mockUser);
		});

		it("should handle get user error", async () => {
			const errorMessage = "Failed to get user";
			const mockResponse = {
				data: { user: null },
				error: { message: errorMessage },
			};

			mockAuth.getUser.mockResolvedValue(mockResponse);

			const result = await authService.getUser();
			expect(result).toBeNull();
		});
	});

	describe("updateProfile", () => {
		it("should update profile successfully", async () => {
			const profileData = {
				avatar_url: "https://example.com/avatar.jpg",
				full_name: "Updated Name",
			};
			const mockUser = {
				email: "test@example.com",
				id: "123",
				user_metadata: profileData,
			};
			const mockResponse = { data: { user: mockUser }, error: null };

			mockAuth.updateUser.mockResolvedValue(mockResponse);

			const result = await authService.updateProfile(profileData);

			expect(mockAuth.updateUser).toHaveBeenCalledWith({
				data: profileData,
			});
			expect(result).toEqual(mockUser);
		});

		it("should handle profile update error", async () => {
			const profileData = { full_name: "Updated Name" };
			const errorMessage = "Profile update failed";
			const mockResponse = {
				data: { user: null },
				error: { message: errorMessage },
			};

			mockAuth.updateUser.mockResolvedValue(mockResponse);

			await expect(authService.updateProfile(profileData)).rejects.toThrow(
				"Profile update failed",
			);
		});
	});
});
