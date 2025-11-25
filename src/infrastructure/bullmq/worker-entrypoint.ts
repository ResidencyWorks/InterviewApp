/**
 * Worker entrypoint that ensures environment variables are loaded before any other imports
 */

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";

config({ path: ".env.local" });

// Now import and start the worker
import "./worker";
