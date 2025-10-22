"use client";

import { useEffect } from "react";

/**
 * Minimizes layout shifts during hydration by disabling CSS transitions
 * until the app is hydrated, then enables them.
 */
export function LayoutShiftPrevention() {
	useEffect(() => {
		// Mark document as hydrated to re-enable transitions
		if (typeof document !== "undefined") {
			document.documentElement.classList.add("hydrated");
		}
	}, []);

	return null;
}
