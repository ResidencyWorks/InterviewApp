import type { ContentPack, ContentPackData } from "@/types/content";

/**
 * Content pack validation result
 */
export interface ContentValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	metadata?: {
		question_count: number;
		category_count: number;
		estimated_duration: number;
		file_size: number;
	};
}

/**
 * Content pack loading options
 */
export interface ContentLoadOptions {
	validate: boolean;
	preview: boolean;
	overwrite: boolean;
	backup: boolean;
}

/**
 * Content pack loader configuration
 */
export interface ContentLoaderConfig {
	maxFileSize: number;
	allowedFormats: string[];
	validationRules: ContentValidationRule[];
	backupEnabled: boolean;
	previewEnabled: boolean;
}

/**
 * Content validation rule
 */
export interface ContentValidationRule {
	name: string;
	description: string;
	validate: (data: ContentPackData) => { valid: boolean; error?: string };
	severity: "error" | "warning";
}

/**
 * Content pack storage interface
 */
export interface ContentPackStorage {
	save: (pack: ContentPack) => Promise<void>;
	load: (id: string) => Promise<ContentPack | null>;
	list: () => Promise<ContentPack[]>;
	delete: (id: string) => Promise<void>;
	backup: (pack: ContentPack) => Promise<void>;
	restore: (backupId: string) => Promise<ContentPack | null>;
}

/**
 * Content pack cache interface
 */
export interface ContentPackCache {
	get: (id: string) => Promise<ContentPack | null>;
	set: (id: string, pack: ContentPack) => Promise<void>;
	invalidate: (id: string) => Promise<void>;
	clear: () => Promise<void>;
}

/**
 * Content pack service interface
 */
export interface ContentPackServiceInterface {
	validate: (data: ContentPackData) => Promise<ContentValidationResult>;
	load: (file: File, options?: ContentLoadOptions) => Promise<ContentPack>;
	save: (pack: ContentPack) => Promise<void>;
	get: (id: string) => Promise<ContentPack | null>;
	list: () => Promise<ContentPack[]>;
	delete: (id: string) => Promise<void>;
	backup: (pack: ContentPack) => Promise<void>;
	restore: (backupId: string) => Promise<ContentPack | null>;
	search: (query: string) => Promise<ContentPack[]>;
	getActive: () => Promise<ContentPack | null>;
	setActive: (id: string) => Promise<void>;
}
