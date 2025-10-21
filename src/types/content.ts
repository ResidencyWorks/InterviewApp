/**
 * Content-related types and interfaces
 */

import type { BaseEntity } from "./common";
import type { EvaluationCriteria } from "./evaluation";

/**
 * Content category interface
 */
export interface ContentCategory {
	id: string;
	name: string;
	description: string;
	weight: number;
	criteria: string[];
}

/**
 * Content question interface
 */
export interface ContentQuestion {
	id: string;
	category_id: string;
	text: string;
	type: "behavioral" | "technical" | "situational";
	difficulty: "easy" | "medium" | "hard";
	time_limit: number;
	tips: string[];
}

/**
 * Content pack metadata interface
 */
export interface ContentPackMetadata {
	author: string;
	created_at: string;
	updated_at: string;
	tags: string[];
	language: string;
	target_audience: string[];
	version: string;
	description: string;
}

/**
 * Content pack data interface
 */
export interface ContentPackData {
	version: string;
	name: string;
	description: string;
	categories: ContentCategory[];
	questions: ContentQuestion[];
	evaluation_criteria: EvaluationCriteria;
	metadata: ContentPackMetadata;
}

/**
 * Content pack interface
 */
export interface ContentPack extends BaseEntity {
	name: string;
	version: string;
	content: ContentPackData;
	is_active: boolean;
	is_public: boolean;
	created_by: string;
	tags: string[];
	download_count: number;
	rating?: number;
	reviews_count: number;
}

/**
 * Content pack validation result interface
 */
export interface ContentPackValidation {
	valid: boolean;
	version: string;
	timestamp: string;
	message: string;
	errors?: string[];
	warnings?: string[];
	metadata?: {
		question_count: number;
		category_count: number;
		estimated_duration: number;
	};
}

/**
 * Content pack upload interface
 */
export interface ContentPackUpload {
	file: File;
	name: string;
	version: string;
	description?: string;
	tags?: string[];
	is_public?: boolean;
}

/**
 * Content pack search interface
 */
export interface ContentPackSearch {
	query?: string;
	tags?: string[];
	difficulty?: string[];
	type?: string[];
	author?: string;
	sort_by?: "name" | "created_at" | "rating" | "download_count";
	sort_order?: "asc" | "desc";
	page?: number;
	limit?: number;
}

/**
 * Content pack review interface
 */
export interface ContentPackReview extends BaseEntity {
	content_pack_id: string;
	user_id: string;
	rating: number;
	comment?: string;
	helpful_votes: number;
	verified_purchase: boolean;
}

/**
 * Content pack analytics interface
 */
export interface ContentPackAnalytics {
	content_pack_id: string;
	total_downloads: number;
	unique_users: number;
	average_rating: number;
	completion_rate: number;
	average_score: number;
	usage_by_category: Record<string, number>;
	usage_by_difficulty: Record<string, number>;
	time_spent: number;
	last_accessed: string;
}

/**
 * Content pack template interface
 */
export interface ContentPackTemplate {
	id: string;
	name: string;
	description: string;
	category: string;
	difficulty: string;
	question_count: number;
	estimated_duration: number;
	preview_questions: ContentQuestion[];
	metadata: ContentPackMetadata;
}

/**
 * Content pack import interface
 */
export interface ContentPackImport {
	source: "file" | "url" | "template";
	data: any;
	options: {
		validate: boolean;
		preview: boolean;
		overwrite: boolean;
	};
}

/**
 * Content pack export interface
 */
export interface ContentPackExport {
	format: "json" | "csv" | "pdf";
	include_metadata: boolean;
	include_analytics: boolean;
	date_range?: {
		start: string;
		end: string;
	};
}

/**
 * Content pack backup interface
 */
export interface ContentPackBackup {
	id: string;
	content_pack_id: string;
	version: string;
	backup_data: ContentPackData;
	created_at: string;
	size: number;
	checksum: string;
}

/**
 * Content pack sharing interface
 */
export interface ContentPackShare {
	id: string;
	content_pack_id: string;
	shared_by: string;
	shared_with: string;
	permission: "read" | "write" | "admin";
	expires_at?: string;
	created_at: string;
}

/**
 * Content pack collaboration interface
 */
export interface ContentPackCollaboration {
	id: string;
	content_pack_id: string;
	user_id: string;
	role: "viewer" | "editor" | "admin";
	invited_by: string;
	invited_at: string;
	accepted_at?: string;
	permissions: {
		can_edit: boolean;
		can_delete: boolean;
		can_share: boolean;
		can_export: boolean;
	};
}
