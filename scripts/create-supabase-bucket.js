/**
 * Script to create Supabase Storage bucket for drill recordings
 * Run: node scripts/create-supabase-bucket.js
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error("Missing required environment variables:");
	console.error("- NEXT_PUBLIC_SUPABASE_URL");
	console.error("- SUPABASE_SERVICE_ROLE_KEY");
	process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
	try {
		console.log("Creating drill-recordings bucket...");

		const { error } = await supabase.storage.createBucket("drill-recordings", {
			public: false,
			allowedMimeTypes: ["audio/webm", "audio/ogg", "audio/mp4"],
			fileSizeLimit: 10485760, // 10MB
		});

		if (error) {
			if (error.message.includes("already exists")) {
				console.log("✅ Bucket already exists, skipping creation");
			} else {
				throw error;
			}
		} else {
			console.log("✅ Bucket created successfully");
		}

		// Configure bucket policies
		console.log("Configuring bucket policies...");
		console.log(
			"Note: RLS policies should be configured in Supabase dashboard or via SQL",
		);

		console.log("\nBucket configuration complete!");
		console.log("Next steps:");
		console.log("1. Configure RLS policies in Supabase dashboard");
		console.log("2. Set up lifecycle policy for 30-day auto-delete");
		console.log("3. Configure CORS policies for signed URL playback");
	} catch (error) {
		console.error("Error creating bucket:", error.message);
		process.exit(1);
	}
}

createBucket();
