import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScoreChip } from "@/components/ui/score-chip";

describe("ScoreChip", () => {
	it("should render score with correct percentage", () => {
		render(<ScoreChip score={85} />);

		expect(screen.getByText("85%")).toBeInTheDocument();
	});

	it("should apply correct color for excellent score (90+)", () => {
		render(<ScoreChip score={95} />);

		const chip = screen.getByText("95%");
		expect(chip).toHaveClass("bg-green-100", "text-green-800");
	});

	it("should apply correct color for good score (80-89)", () => {
		render(<ScoreChip score={85} />);

		const chip = screen.getByText("85%");
		expect(chip).toHaveClass("bg-blue-100", "text-blue-800");
	});

	it("should apply correct color for fair score (70-79)", () => {
		render(<ScoreChip score={75} />);

		const chip = screen.getByText("75%");
		expect(chip).toHaveClass("bg-yellow-100", "text-yellow-800");
	});

	it("should apply correct color for needs improvement score (60-69)", () => {
		render(<ScoreChip score={65} />);

		const chip = screen.getByText("65%");
		expect(chip).toHaveClass("bg-orange-100", "text-orange-800");
	});

	it("should apply correct color for poor score (<60)", () => {
		render(<ScoreChip score={45} />);

		const chip = screen.getByText("45%");
		expect(chip).toHaveClass("bg-red-100", "text-red-800");
	});

	it("should show label when showLabel is true", () => {
		render(<ScoreChip score={85} showLabel />);

		expect(screen.getByText("Score:")).toBeInTheDocument();
		expect(screen.getByText("85%")).toBeInTheDocument();
	});

	it("should not show label when showLabel is false", () => {
		render(<ScoreChip score={85} showLabel={false} />);

		expect(screen.queryByText("Score:")).not.toBeInTheDocument();
		expect(screen.getByText("85%")).toBeInTheDocument();
	});

	it("should apply correct size classes", () => {
		const { rerender } = render(<ScoreChip score={85} size="sm" />);
		expect(screen.getByText("85%")).toHaveClass("text-xs", "px-2", "py-1");

		rerender(<ScoreChip score={85} size="md" />);
		expect(screen.getByText("85%")).toHaveClass("text-sm", "px-3", "py-1.5");

		rerender(<ScoreChip score={85} size="lg" />);
		expect(screen.getByText("85%")).toHaveClass("text-base", "px-4", "py-2");
	});

	it("should have correct accessibility attributes", () => {
		render(<ScoreChip score={85} />);

		const chip = screen.getByText("85%");
		expect(chip).toHaveAttribute("aria-label", "Score: 85% (Good)");
	});

	it("should apply custom className", () => {
		render(<ScoreChip score={85} className="custom-class" />);

		const container = screen.getByText("85%").closest("div")?.parentElement;
		expect(container).toHaveClass("custom-class");
	});
});
