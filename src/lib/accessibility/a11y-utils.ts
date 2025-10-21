/**
 * Accessibility utilities for improved user experience
 */

/**
 * Generate accessible ARIA labels
 */
export function generateAriaLabel(text: string, context?: string): string {
	if (context) {
		return `${text}, ${context}`;
	}
	return text;
}

/**
 * Create accessible button props
 */
export function createAccessibleButtonProps(
	label: string,
	description?: string,
): {
	"aria-label": string;
	"aria-describedby"?: string;
} {
	const props: { "aria-label": string; "aria-describedby"?: string } = {
		"aria-label": label,
	};

	if (description) {
		props["aria-describedby"] = description;
	}

	return props;
}

/**
 * Create accessible form field props
 */
export function createAccessibleFieldProps(
	label: string,
	required = false,
	error?: string,
): {
	"aria-label": string;
	"aria-required": boolean;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
} {
	const props: {
		"aria-label": string;
		"aria-required": boolean;
		"aria-invalid"?: boolean;
		"aria-describedby"?: string;
	} = {
		"aria-label": label,
		"aria-required": required,
	};

	if (error) {
		props["aria-invalid"] = true;
		props["aria-describedby"] = `${label}-error`;
	}

	return props;
}

/**
 * Focus management utilities
 */
export class FocusManager {
	/**
	 * Trap focus within an element
	 */
	static trapFocus(element: HTMLElement): () => void {
		const focusableElements = element.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
		);
		const firstElement = focusableElements[0] as HTMLElement;
		const lastElement = focusableElements[
			focusableElements.length - 1
		] as HTMLElement;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Tab") {
				if (e.shiftKey) {
					if (document.activeElement === firstElement) {
						lastElement.focus();
						e.preventDefault();
					}
				} else {
					if (document.activeElement === lastElement) {
						firstElement.focus();
						e.preventDefault();
					}
				}
			}
		};

		element.addEventListener("keydown", handleKeyDown);
		firstElement?.focus();

		return () => {
			element.removeEventListener("keydown", handleKeyDown);
		};
	}

	/**
	 * Restore focus to previously focused element
	 */
	static restoreFocus(previousElement: HTMLElement): void {
		previousElement.focus();
	}
}

/**
 * Screen reader utilities
 */
export class ScreenReaderUtils {
	/**
	 * Announce message to screen readers
	 */
	static announce(
		message: string,
		priority: "polite" | "assertive" = "polite",
	): void {
		const announcement = document.createElement("div");
		announcement.setAttribute("aria-live", priority);
		announcement.setAttribute("aria-atomic", "true");
		announcement.className = "sr-only";
		announcement.textContent = message;

		document.body.appendChild(announcement);

		// Remove after announcement
		setTimeout(() => {
			document.body.removeChild(announcement);
		}, 1000);
	}

	/**
	 * Create visually hidden text for screen readers
	 */
	static createScreenReaderText(text: string): string {
		return `<span class="sr-only">${text}</span>`;
	}
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigation {
	/**
	 * Handle arrow key navigation for lists
	 */
	static handleArrowNavigation(
		event: KeyboardEvent,
		items: HTMLElement[],
		currentIndex: number,
	): number {
		let newIndex = currentIndex;

		switch (event.key) {
			case "ArrowDown":
				newIndex = Math.min(currentIndex + 1, items.length - 1);
				break;
			case "ArrowUp":
				newIndex = Math.max(currentIndex - 1, 0);
				break;
			case "Home":
				newIndex = 0;
				break;
			case "End":
				newIndex = items.length - 1;
				break;
			default:
				return currentIndex;
		}

		if (newIndex !== currentIndex) {
			event.preventDefault();
			items[newIndex]?.focus();
		}

		return newIndex;
	}

	/**
	 * Handle escape key to close modals/dropdowns
	 */
	static handleEscapeKey(event: KeyboardEvent, onEscape: () => void): void {
		if (event.key === "Escape") {
			event.preventDefault();
			onEscape();
		}
	}
}

/**
 * Color contrast utilities
 */
export class ColorContrast {
	/**
	 * Calculate relative luminance of a color
	 */
	static getLuminance(r: number, g: number, b: number): number {
		const [rs, gs, bs] = [r, g, b].map((c) => {
			c = c / 255;
			return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
		});
		return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
	}

	/**
	 * Calculate contrast ratio between two colors
	 */
	static getContrastRatio(
		color1: [number, number, number],
		color2: [number, number, number],
	): number {
		const lum1 = ColorContrast.getLuminance(...color1);
		const lum2 = ColorContrast.getLuminance(...color2);
		const brightest = Math.max(lum1, lum2);
		const darkest = Math.min(lum1, lum2);
		return (brightest + 0.05) / (darkest + 0.05);
	}

	/**
	 * Check if contrast ratio meets WCAG standards
	 */
	static meetsWCAG(
		color1: [number, number, number],
		color2: [number, number, number],
		level: "AA" | "AAA" = "AA",
	): boolean {
		const ratio = ColorContrast.getContrastRatio(color1, color2);
		return level === "AA" ? ratio >= 4.5 : ratio >= 7;
	}
}
