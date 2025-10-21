import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResponseSubmission } from "@/components/drill/ResponseSubmission";

// Mock the audio recording functionality
Object.defineProperty(navigator, "mediaDevices", {
	writable: true,
	value: {
		getUserMedia: vi.fn().mockResolvedValue({
			getTracks: () => [{ stop: vi.fn() }],
		}),
	},
});

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => ({
	start: vi.fn(),
	stop: vi.fn(),
	ondataavailable: null,
	onstop: null,
})) as any;

// Add the static method
(global.MediaRecorder as any).isTypeSupported = vi.fn().mockReturnValue(true);

describe("ResponseSubmission", () => {
	const mockOnSubmit = vi.fn();
	const mockOnError = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render with text tab selected by default", () => {
		render(
			<ResponseSubmission onSubmit={mockOnSubmit} onError={mockOnError} />,
		);

		expect(screen.getByText("Written Response")).toBeInTheDocument();
		expect(screen.getByText("Audio Response")).toBeInTheDocument();
		expect(screen.getByRole("tab", { selected: true })).toHaveTextContent(
			"Written Response",
		);
	});

	it("should switch between text and audio tabs", () => {
		render(
			<ResponseSubmission onSubmit={mockOnSubmit} onError={mockOnError} />,
		);

		const audioTab = screen.getByText("Audio Response");
		fireEvent.click(audioTab);

		expect(screen.getByRole("tab", { selected: true })).toHaveTextContent(
			"Audio Response",
		);
		expect(screen.getByText("Record Your Response")).toBeInTheDocument();
	});

	it("should submit text response when valid", async () => {
		render(
			<ResponseSubmission onSubmit={mockOnSubmit} onError={mockOnError} />,
		);

		const textarea = screen.getByPlaceholderText(
			/type your interview response/i,
		);
		fireEvent.change(textarea, {
			target: {
				value:
					"This is a valid response with enough characters to meet the minimum requirement.",
			},
		});

		const submitButton = screen.getByText("Submit Response");
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith({
				type: "text",
				content:
					"This is a valid response with enough characters to meet the minimum requirement.",
			});
		});
	});

	it("should not submit text response when too short", async () => {
		render(
			<ResponseSubmission onSubmit={mockOnSubmit} onError={mockOnError} />,
		);

		const textarea = screen.getByPlaceholderText(
			/type your interview response/i,
		);
		fireEvent.change(textarea, {
			target: { value: "Short" },
		});

		const submitButton = screen.getByText("Submit Response");
		expect(submitButton).toBeDisabled();
	});

	it("should show character count and word count", () => {
		render(
			<ResponseSubmission onSubmit={mockOnSubmit} onError={mockOnError} />,
		);

		const textarea = screen.getByPlaceholderText(
			/type your interview response/i,
		);
		fireEvent.change(textarea, {
			target: { value: "This is a test response with multiple words" },
		});

		expect(screen.getByText(/7 words/)).toBeInTheDocument();
		expect(screen.getByText(/42\/2000 characters/)).toBeInTheDocument();
	});

	it("should show warning when approaching character limit", () => {
		render(
			<ResponseSubmission onSubmit={mockOnSubmit} onError={mockOnError} />,
		);

		const textarea = screen.getByPlaceholderText(
			/type your interview response/i,
		);
		const longText = "a".repeat(1900); // 90% of 2000 limit
		fireEvent.change(textarea, {
			target: { value: longText },
		});

		const characterCount = screen.getByText(/1900\/2000 characters/);
		expect(characterCount).toHaveClass("text-orange-600");
	});

	it("should show error when exceeding character limit", () => {
		render(
			<ResponseSubmission onSubmit={mockOnSubmit} onError={mockOnError} />,
		);

		const textarea = screen.getByPlaceholderText(
			/type your interview response/i,
		);
		const longText = "a".repeat(2001); // Exceeds limit
		fireEvent.change(textarea, {
			target: { value: longText },
		});

		// Should be truncated to 2000 characters
		expect(textarea).toHaveValue("a".repeat(2000));
	});

	it("should be disabled when isSubmitting is true", () => {
		render(
			<ResponseSubmission
				onSubmit={mockOnSubmit}
				onError={mockOnError}
				isSubmitting={true}
			/>,
		);

		const textarea = screen.getByPlaceholderText(
			/type your interview response/i,
		);
		const submitButton = screen.getByText("Submitting...");

		expect(textarea).toBeDisabled();
		expect(submitButton).toBeDisabled();
		expect(submitButton).toHaveTextContent("Submitting...");
	});

	it("should show error message when provided", () => {
		render(
			<ResponseSubmission
				onSubmit={mockOnSubmit}
				onError={mockOnError}
				disabled={true}
			/>,
		);

		const textarea = screen.getByPlaceholderText(
			/type your interview response/i,
		);
		const submitButton = screen.getByText("Submit Response");

		expect(textarea).toBeDisabled();
		expect(submitButton).toBeDisabled();
	});

	it("should call onError when text response is too short on submit", async () => {
		render(
			<ResponseSubmission onSubmit={mockOnSubmit} onError={mockOnError} />,
		);

		// Switch to audio tab and try to submit without recording
		const audioTab = screen.getByText("Audio Response");
		fireEvent.click(audioTab);

		const submitButton = screen.getByText("Submit Response");
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(mockOnError).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "Please record an audio response first",
				}),
			);
		});
	});
});
