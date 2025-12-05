"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { analytics } from "@/features/notifications/application/analytics";

interface SystemStatusResponse {
	contentPack: {
		isActive: boolean;
		name?: string;
		version?: string;
	};
}

/**
 * ContentPackMissingBanner Component
 *
 * Displays a warning banner when the primary content pack is not loaded.
 * Tracks analytics event when content pack is missing.
 *
 * @component
 */
export function ContentPackMissingBanner() {
	const [isMissing, setIsMissing] = useState(false);
	const [dismissed, setDismissed] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Check content pack status
		const checkContentPackStatus = async () => {
			try {
				const response = await fetch("/api/system/status");
				if (!response.ok) {
					console.warn("Failed to fetch system status");
					return;
				}

				const data: SystemStatusResponse = await response.json();
				const missing = data.contentPack?.isActive === false;
				setIsMissing(missing);

				if (missing) {
					// Track event when content pack is missing
					analytics.track("content_pack_missing", {
						timestamp: new Date().toISOString(),
					});
				}
			} catch (error) {
				console.error("Error checking content pack status:", error);
			} finally {
				setIsLoading(false);
			}
		};

		checkContentPackStatus();

		// Refresh status every 30 seconds
		const interval = setInterval(checkContentPackStatus, 30000);
		return () => clearInterval(interval);
	}, []);

	// Don't render if loading, not missing, or dismissed
	if (isLoading || !isMissing || dismissed) {
		return null;
	}

	return (
		<Alert
			variant="default"
			className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
		>
			<AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
			<AlertTitle className="text-yellow-800 dark:text-yellow-200">
				Content Pack Not Loaded
			</AlertTitle>
			<AlertDescription className="text-yellow-700 dark:text-yellow-300">
				The matchready_content_pack is not available. Using fallback content.
				<Button
					variant="ghost"
					size="sm"
					className="ml-2 h-auto p-1 text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100"
					onClick={() => setDismissed(true)}
					aria-label="Dismiss banner"
				>
					<X className="h-4 w-4" />
				</Button>
			</AlertDescription>
		</Alert>
	);
}
