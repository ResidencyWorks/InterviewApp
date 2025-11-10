import type { Metadata } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PostHogProvider } from "@/components/PostHogProvider";
import { LayoutShiftPrevention } from "@/components/ui/LayoutShiftPrevention";
import { WebVitals } from "@/components/WebVitals";

export const metadata: Metadata = {
	description:
		"Practice interview skills with AI-powered evaluation and feedback",
	title: "Interview Drills - AI-Powered Interview Preparation",
	icons: {
		icon: [
			{
				url: "/icons/favicons/favicon-16x16.png",
				sizes: "16x16",
				type: "image/png",
			},
			{
				url: "/icons/favicons/favicon-32x32.png",
				sizes: "32x32",
				type: "image/png",
			},
			{ url: "/icons/favicons/favicon.ico", sizes: "any" },
		],
		apple: [
			{
				url: "/icons/favicons/apple-touch-icon.png",
				sizes: "180x180",
				type: "image/png",
			},
		],
		other: [
			{
				url: "/icons/favicons/android-chrome-192x192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				url: "/icons/favicons/android-chrome-512x512.png",
				sizes: "512x512",
				type: "image/png",
			},
		],
	},
	manifest: "/icons/favicons/site.webmanifest",
	appleWebApp: {
		title: "Interview Drills",
		statusBarStyle: "default",
		capable: true,
	},
};

/**
 * Root layout component for the Next.js App Router
 * Provides the basic HTML structure for all pages
 */
export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>
				<PostHogProvider>
					<LayoutShiftPrevention />
					<WebVitals />
					<ErrorBoundary>{children}</ErrorBoundary>
				</PostHogProvider>
			</body>
		</html>
	);
}
