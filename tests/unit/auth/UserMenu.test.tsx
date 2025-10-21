import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserMenu } from "@/components/auth/UserMenu";

// Mock useAuth hook
const mockSignOut = vi.fn();
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
	signOut: mockSignOut,
	user: mockUser,
})) as any;

vi.mock("@/hooks/useAuth", () => ({
	useAuth: mockUseAuth,
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
	}),
}));

describe("UserMenu", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render user menu with avatar", () => {
		render(<UserMenu />);

		expect(screen.getByRole("button")).toBeInTheDocument();
		expect(screen.getByAltText("test@example.com")).toBeInTheDocument();
	});

	it("should show user information in dropdown", () => {
		render(<UserMenu />);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		expect(screen.getByText("Test User")).toBeInTheDocument();
		expect(screen.getByText("test@example.com")).toBeInTheDocument();
		expect(screen.getByText("PREMIUM")).toBeInTheDocument();
	});

	it("should handle logout", () => {
		render(<UserMenu />);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		const logoutButton = screen.getByText("Log out");
		fireEvent.click(logoutButton);

		expect(mockSignOut).toHaveBeenCalled();
		expect(mockPush).toHaveBeenCalledWith("/auth/login");
	});

	it("should navigate to profile", () => {
		render(<UserMenu />);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		const profileButton = screen.getByText("Profile");
		fireEvent.click(profileButton);

		expect(mockPush).toHaveBeenCalledWith("/profile");
	});

	it("should navigate to settings", () => {
		render(<UserMenu />);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		const settingsButton = screen.getByText("Settings");
		fireEvent.click(settingsButton);

		expect(mockPush).toHaveBeenCalledWith("/settings");
	});

	it("should not render when user is null", () => {
		mockUseAuth.mockReturnValue({
			loading: false,
			signIn: vi.fn(),
			signOut: vi.fn(),
			user: null,
		});

		const { container } = render(<UserMenu />);
		expect(container.firstChild).toBeNull();
	});

	it("should show entitlement badge for different levels", () => {
		// Test FREE level
		mockUseAuth.mockReturnValue({
			loading: false,
			signIn: vi.fn(),
			signOut: mockSignOut,
			user: {
				...mockUser,
				user_metadata: { ...mockUser.user_metadata, entitlement_level: "FREE" },
			},
		});

		render(<UserMenu />);
		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		expect(screen.getByText("FREE")).toBeInTheDocument();
	});
});
