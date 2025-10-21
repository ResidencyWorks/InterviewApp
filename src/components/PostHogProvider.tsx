"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

		// Only initialize if we have a valid key
		if (posthogKey && posthogKey.trim() !== "") {
			posthog.init(posthogKey, {
				api_host: "/ingest",
				ui_host: "https://us.posthog.com",
				capture_exceptions: true,
				debug: process.env.NODE_ENV === "development",
			});
		} else {
			console.warn(
				"PostHog not initialized: NEXT_PUBLIC_POSTHOG_KEY is not set",
			);
		}
	}, []);

	return <PHProvider client={posthog}>{children}</PHProvider>;
}
