// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: "https://29f27651e88773d805d40423d4630930@o4510196119699456.ingest.us.sentry.io/4510221835239424",

	// Enable logs to be sent to Sentry
	enableLogs: true,

	// Enable sending user PII (Personally Identifiable Information)
	// https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
	sendDefaultPii: true,

	// Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
	tracesSampleRate: 1,
});
