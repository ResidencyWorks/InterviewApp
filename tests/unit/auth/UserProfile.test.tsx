import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserProfile } from "@/components/auth/UserProfile";

// Mock useAuth hook
const mockUser = {
	email: "test@example.com",
	id: "123",
	user_metadata: {
		avatar_url: "https://example.com/avatar.jpg",
		entitlement_level: "PREMIUM",
		full_name: "Test User",
	},
};

const mockUseAuth = vi.fn(() => ({
	loading: false,
	signIn: vi.fn(),
	signOut: vi.fn(),
	user: mockUser,
})) as any;

vi.mock("@/hooks/useAuth", () => ({
	useAuth: mockUseAuth,
}));

// Mock auth service
const mockUpdateProfile = vi.fn();
vi.mock("@/lib/auth/auth-service", () => ({
	authService: {
		updateProfile: mockUpdateProfile,
	},
}));

// Mock window.open
const mockOpen = vi.fn();
Object.defineProperty(window, "open", {
	value: mockOpen,
	writable: true,
});

describe("UserProfile", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render profile form with user data", () => {
		render(<UserProfile />);

		expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
		expect(
			screen.getByDisplayValue("https://example.com/avatar.jpg"),
		).toBeInTheDocument();
		expect(screen.getByText("PREMIUM")).toBeInTheDocument();
	});

	it("should show error when user is not logged in", () => {
		mockUseAuth.mockReturnValue({
			loading: false,
			signIn: vi.fn(),
			signOut: vi.fn(),
			user: null,
		});

		render(<UserProfile />);

		expect(
			screen.getByText(/you must be logged in to view your profile/i),
		).toBeInTheDocument();
	});

	it("should handle form submission", async () => {
		mockUpdateProfile.mockResolvedValue({ success: true });

		render(<UserProfile />);

		const fullNameInput = screen.getByDisplayValue("Test User");
		const submitButton = screen.getByRole("button", {
			name: /update profile/i,
		});

		fireEvent.change(fullNameInput, { target: { value: "Updated Name" } });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockUpdateProfile).toHaveBeenCalledWith({
				avatar_url: "https://example.com/avatar.jpg",
				full_name: "Updated Name",
			});
		});
	});

	it("should show success message after successful update", async () => {
		mockUpdateProfile.mockResolvedValue({ success: true });

		render(<UserProfile />);

		const submitButton = screen.getByRole("button", {
			name: /update profile/i,
		});
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(
				screen.getByText(/profile updated successfully/i),
			).toBeInTheDocument();
		});
	});

	it("should show error message on update failure", async () => {
		const errorMessage = "Update failed";
		mockUpdateProfile.mockRejectedValue(new Error(errorMessage));

		render(<UserProfile />);

		const submitButton = screen.getByRole("button", {
			name: /update profile/i,
		});
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});
	});

	it("should show loading state during update", async () => {
		mockUpdateProfile.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 100)),
		);

		render(<UserProfile />);

		const submitButton = screen.getByRole("button", {
			name: /update profile/i,
		});
		fireEvent.click(submitButton);

		expect(screen.getByText(/updating/i)).toBeInTheDocument();
		expect(submitButton).toBeDisabled();
	});

	it("should handle input changes", () => {
		render(<UserProfile />);

		const fullNameInput = screen.getByDisplayValue("Test User");
		const avatarInput = screen.getByDisplayValue(
			"https://example.com/avatar.jpg",
		);

		fireEvent.change(fullNameInput, { target: { value: "New Name" } });
		fireEvent.change(avatarInput, {
			target: { value: "https://new-avatar.com/image.jpg" },
		});

		expect(fullNameInput).toHaveValue("New Name");
		expect(avatarInput).toHaveValue("https://new-avatar.com/image.jpg");
	});

	it("should show upgrade button for FREE users", () => {
		mockUseAuth.mockReturnValue({
			loading: false,
			signIn: vi.fn(),
			signOut: vi.fn(),
			user: {
				...mockUser,
				user_metadata: { ...mockUser.user_metadata, entitlement_level: "FREE" },
			},
		});

		render(<UserProfile />);

		const upgradeButton = screen.getByText("Upgrade");
		expect(upgradeButton).toBeInTheDocument();

		fireEvent.click(upgradeButton);
		expect(mockOpen).toHaveBeenCalledWith("/upgrade", "_blank");
	});

	it("should not show upgrade button for PREMIUM users", () => {
		render(<UserProfile />);

		expect(screen.queryByText("Upgrade")).not.toBeInTheDocument();
	});
});
