"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		posthog.init(process.env.POSTHOG_API_KEY || "", {
			api_host: "/ingest",
			capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
			debug: process.env.NODE_ENV === "development",
			person_profiles: "identified_only",
			ui_host: "https://us.posthog.com",
		});
	}, []);

	return <PHProvider client={posthog}>{children}</PHProvider>;
}
