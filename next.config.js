import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
	// External packages for server-side rendering
	serverExternalPackages: ["@supabase/ssr", "bullmq", "ioredis"],
	transpilePackages: ["import-in-the-middle", "require-in-the-middle"],
	images: {
		remotePatterns: [{ hostname: "localhost" }],
	},
	compiler: {
		// Reduce client bundle noise in production
		removeConsole:
			process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
	},
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{ key: "X-Frame-Options", value: "DENY" },
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(self), geolocation=()",
					},
				],
			},
		];
	},
	async rewrites() {
		return [
			{
				destination: "https://us-assets.i.posthog.com/static/:path*",
				source: "/ingest/static/:path*",
			},
			{
				destination: "https://us.i.posthog.com/:path*",
				source: "/ingest/:path*",
			},
		];
	},
	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
	typescript: {
		// Type checking is handled by lefthook pre-push hooks
		ignoreBuildErrors: false,
	},

	// Webpack configuration
	webpack: (config, { isServer }) => {
		// Handle client-side only packages
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
			};
		}
		return config;
	},
};

export default withSentryConfig(nextConfig, {
	// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
	// See the following for more information:
	// https://docs.sentry.io/product/crons/
	// https://vercel.com/docs/cron-jobs
	automaticVercelMonitors: true,

	// Automatically tree-shake Sentry logger statements to reduce bundle size
	disableLogger: true,
	// For all available options, see:
	// https://www.npmjs.com/package/@sentry/webpack-plugin#options

	org: "residencyworks",
	project: "javascript-nextjs",

	// Only print logs for uploading source maps in CI
	silent: !process.env.CI,

	// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
	// This can increase your server load as well as your hosting bill.
	// Note: Check that the configured route will not match with your Next.js proxy, otherwise reporting of client-
	// side errors will fail.
	tunnelRoute: "/monitoring",

	// For all available options, see:
	// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

	// Upload a larger set of source maps for prettier stack traces (increases build time)
	widenClientFileUpload: true,
});
