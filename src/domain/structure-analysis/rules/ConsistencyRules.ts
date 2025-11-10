/**
 * Consistency rules configuration
 */

export interface ConsistencyRule {
	id: string;
	description: string;
	severity: "low" | "medium" | "high";
}

export const ConsistencyRules: ConsistencyRule[] = [
	{
		id: "naming-files-kebab",
		description: "Files must be kebab-case",
		severity: "medium",
	},
	{
		id: "naming-classes-pascal",
		description: "Classes/interfaces must be PascalCase",
		severity: "medium",
	},
	{
		id: "onion-no-framework-in-domain",
		description: "No framework imports in domain",
		severity: "high",
	},
	{
		id: "error-no-silent-catch",
		description: "No silent catch without handling",
		severity: "high",
	},
];
