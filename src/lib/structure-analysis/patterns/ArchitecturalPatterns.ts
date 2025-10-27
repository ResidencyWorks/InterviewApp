/**
 * Architectural pattern templates for consistency validation
 */

export interface ArchitecturalPatternTemplate {
	name: string;
	description: string;
	rules: string[];
}

export const OnionArchitecturePattern: ArchitecturalPatternTemplate = {
	name: "Onion Architecture",
	description:
		"Domain remains independent of frameworks; adapters and infrastructure depend inward.",
	rules: [
		"No framework imports in domain entities/services",
		"Application services orchestrate flows and remain thin",
		"Adapters and UI depend on application/domain via interfaces",
		"Use DI for infrastructure implementations",
	],
};

export const NamingConventionsPattern: ArchitecturalPatternTemplate = {
	name: "Naming Conventions",
	description:
		"Consistent naming: files kebab-case, classes/interfaces PascalCase",
	rules: [
		"Files use kebab-case (e.g., my-service.ts)",
		"Classes and Interfaces use PascalCase (e.g., MyService, IUser)",
		"Constants use SCREAMING_SNAKE_CASE",
	],
};

export const ErrorHandlingPattern: ArchitecturalPatternTemplate = {
	name: "Error Handling",
	description: "Use Result<T> or explicit error handling, avoid silent catches",
	rules: [
		"Never swallow errors without logging or propagation",
		"Prefer Result<T, E> style or discriminated unions",
		"Include context in error messages",
	],
};

export const DefaultPatterns = [
	OnionArchitecturePattern,
	NamingConventionsPattern,
	ErrorHandlingPattern,
];
