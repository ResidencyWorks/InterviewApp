/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/**/*.{js,ts,jsx,tsx,mdx}",
	],
	plugins: [require("@tailwindcss/typography")],
	theme: {
		extend: {
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
			colors: {
				accent: "var(--accent)",
				"accent-foreground": "var(--accent-foreground)",
				background: "var(--background)",
				border: "var(--border)",
				card: "var(--card)",
				"card-foreground": "var(--card-foreground)",
				chart: {
					1: "var(--chart-1)",
					2: "var(--chart-2)",
					3: "var(--chart-3)",
					4: "var(--chart-4)",
					5: "var(--chart-5)",
				},
				destructive: "var(--destructive)",
				foreground: "var(--foreground)",
				input: "var(--input)",
				muted: "var(--muted)",
				"muted-foreground": "var(--muted-foreground)",
				popover: "var(--popover)",
				"popover-foreground": "var(--popover-foreground)",
				primary: "var(--primary)",
				"primary-foreground": "var(--primary-foreground)",
				ring: "var(--ring)",
				secondary: "var(--secondary)",
				"secondary-foreground": "var(--secondary-foreground)",
			},
		},
	},
};
