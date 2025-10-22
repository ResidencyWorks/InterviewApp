"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { contentPackActivation } from "@/lib/content-pack/ContentPackActivation";

export function ContentPackActivation(): React.ReactElement {
	const [rawJson, setRawJson] = useState("{}");
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleActivate(): Promise<void> {
		try {
			const parsed = JSON.parse(rawJson);
			const activated = await contentPackActivation.activate(parsed);
			setStatus(`Activated ${activated.name} v${activated.version}`);
			setError(null);
		} catch (err) {
			setStatus(null);
			setError(
				err instanceof Error ? err.message : "Invalid content pack payload",
			);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Content Pack Activation</CardTitle>
				<CardDescription>
					Paste content pack JSON to validate and hot-swap the active pack.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Textarea
					value={rawJson}
					onChange={(event) => setRawJson(event.target.value)}
					placeholder='{ "name": "Demo Pack", ... }'
				/>
				<Button onClick={handleActivate}>Dry-run and Activate</Button>
				{status && <p className="text-green-600">{status}</p>}
				{error && <p className="text-red-600">{error}</p>}
			</CardContent>
		</Card>
	);
}
