export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: "13.0.5";
	};
	public: {
		Tables: {
			content_packs: {
				Row: {
					activated_at: string | null;
					activated_by: string | null;
					checksum: string | null;
					content: Json;
					created_at: string | null;
					description: string | null;
					file_size: number | null;
					id: string;
					is_active: boolean | null;
					metadata: Json | null;
					name: string;
					schema_version: string;
					status: string;
					updated_at: string | null;
					uploaded_by: string | null;
					version: string;
				};
				Insert: {
					activated_at?: string | null;
					activated_by?: string | null;
					checksum?: string | null;
					content: Json;
					created_at?: string | null;
					description?: string | null;
					file_size?: number | null;
					id?: string;
					is_active?: boolean | null;
					metadata?: Json | null;
					name: string;
					schema_version?: string;
					status?: string;
					updated_at?: string | null;
					uploaded_by?: string | null;
					version: string;
				};
				Update: {
					activated_at?: string | null;
					activated_by?: string | null;
					checksum?: string | null;
					content?: Json;
					created_at?: string | null;
					description?: string | null;
					file_size?: number | null;
					id?: string;
					is_active?: boolean | null;
					metadata?: Json | null;
					name?: string;
					schema_version?: string;
					status?: string;
					updated_at?: string | null;
					uploaded_by?: string | null;
					version?: string;
				};
				Relationships: [];
			};
			drill_progress: {
				Row: {
					completed_at: string | null;
					completed_questions: number;
					created_at: string;
					current_question_id: string;
					drill_id: string;
					id: string;
					last_activity_at: string;
					started_at: string;
					total_questions: number;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					completed_at?: string | null;
					completed_questions?: number;
					created_at?: string;
					current_question_id: string;
					drill_id: string;
					id?: string;
					last_activity_at?: string;
					started_at?: string;
					total_questions?: number;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					completed_at?: string | null;
					completed_questions?: number;
					created_at?: string;
					current_question_id?: string;
					drill_id?: string;
					id?: string;
					last_activity_at?: string;
					started_at?: string;
					total_questions?: number;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			evaluation_analytics: {
				Row: {
					average_score: number | null;
					categories_breakdown: Json | null;
					created_at: string | null;
					date: string;
					id: string;
					improvement_trend: Json | null;
					total_evaluations: number | null;
					total_time_spent: number | null;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					average_score?: number | null;
					categories_breakdown?: Json | null;
					created_at?: string | null;
					date: string;
					id?: string;
					improvement_trend?: Json | null;
					total_evaluations?: number | null;
					total_time_spent?: number | null;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					average_score?: number | null;
					categories_breakdown?: Json | null;
					created_at?: string | null;
					date?: string;
					id?: string;
					improvement_trend?: Json | null;
					total_evaluations?: number | null;
					total_time_spent?: number | null;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			evaluation_categories: {
				Row: {
					created_at: string | null;
					description: string | null;
					id: string;
					is_active: boolean | null;
					name: string;
					updated_at: string | null;
					weight: number | null;
				};
				Insert: {
					created_at?: string | null;
					description?: string | null;
					id?: string;
					is_active?: boolean | null;
					name: string;
					updated_at?: string | null;
					weight?: number | null;
				};
				Update: {
					created_at?: string | null;
					description?: string | null;
					id?: string;
					is_active?: boolean | null;
					name?: string;
					updated_at?: string | null;
					weight?: number | null;
				};
				Relationships: [];
			};
			evaluation_results: {
				Row: {
					content_pack_id: string | null;
					created_at: string;
					duration_ms: number;
					feedback: string;
					job_id: string;
					practice_rule: string;
					question_id: string;
					request_id: string;
					response_audio_url: string | null;
					response_text: string | null;
					response_type: string | null;
					score: number;
					tokens_used: number | null;
					transcription: string | null;
					updated_at: string;
					user_id: string | null;
					what_changed: string;
				};
				Insert: {
					content_pack_id?: string | null;
					created_at?: string;
					duration_ms: number;
					feedback: string;
					job_id: string;
					practice_rule: string;
					question_id?: string;
					request_id: string;
					response_audio_url?: string | null;
					response_text?: string | null;
					response_type?: string | null;
					score: number;
					tokens_used?: number | null;
					transcription?: string | null;
					updated_at?: string;
					user_id?: string | null;
					what_changed: string;
				};
				Update: {
					content_pack_id?: string | null;
					created_at?: string;
					duration_ms?: number;
					feedback?: string;
					job_id?: string;
					practice_rule?: string;
					question_id?: string;
					request_id?: string;
					response_audio_url?: string | null;
					response_text?: string | null;
					response_type?: string | null;
					score?: number;
					tokens_used?: number | null;
					transcription?: string | null;
					updated_at?: string;
					user_id?: string | null;
					what_changed?: string;
				};
				Relationships: [
					{
						foreignKeyName: "evaluation_results_content_pack_id_fkey";
						columns: ["content_pack_id"];
						isOneToOne: false;
						referencedRelation: "content_packs";
						referencedColumns: ["id"];
					},
				];
			};
			evaluation_scores: {
				Row: {
					category_id: string;
					created_at: string | null;
					evaluation_id: string;
					feedback: string | null;
					id: string;
					score: number;
					updated_at: string | null;
				};
				Insert: {
					category_id: string;
					created_at?: string | null;
					evaluation_id: string;
					feedback?: string | null;
					id?: string;
					score: number;
					updated_at?: string | null;
				};
				Update: {
					category_id?: string;
					created_at?: string | null;
					evaluation_id?: string;
					feedback?: string | null;
					id?: string;
					score?: number;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "evaluation_scores_category_id_fkey";
						columns: ["category_id"];
						isOneToOne: false;
						referencedRelation: "evaluation_categories";
						referencedColumns: ["id"];
					},
				];
			};
			question_submissions: {
				Row: {
					content_pack_id: string | null;
					created_at: string;
					drill_id: string;
					evaluation_completed_at: string | null;
					evaluation_job_id: string | null;
					evaluation_request_id: string | null;
					evaluation_status: string | null;
					id: string;
					question_id: string;
					response_audio_url: string | null;
					response_text: string | null;
					response_type: string;
					submitted_at: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					content_pack_id?: string | null;
					created_at?: string;
					drill_id: string;
					evaluation_completed_at?: string | null;
					evaluation_job_id?: string | null;
					evaluation_request_id?: string | null;
					evaluation_status?: string | null;
					id?: string;
					question_id: string;
					response_audio_url?: string | null;
					response_text?: string | null;
					response_type: string;
					submitted_at?: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					content_pack_id?: string | null;
					created_at?: string;
					drill_id?: string;
					evaluation_completed_at?: string | null;
					evaluation_job_id?: string | null;
					evaluation_request_id?: string | null;
					evaluation_status?: string | null;
					id?: string;
					question_id?: string;
					response_audio_url?: string | null;
					response_text?: string | null;
					response_type?: string;
					submitted_at?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "question_submissions_content_pack_id_fkey";
						columns: ["content_pack_id"];
						isOneToOne: false;
						referencedRelation: "content_packs";
						referencedColumns: ["id"];
					},
				];
			};
			recordings: {
				Row: {
					created_at: string;
					duration: number | null;
					error_message: string | null;
					expires_at: string;
					file_name: string | null;
					file_size: number | null;
					id: string;
					mime_type: string | null;
					question_id: string;
					recorded_at: string;
					response_type: string;
					session_id: string;
					status: string;
					storage_path: string | null;
					text_content: string | null;
					updated_at: string;
					upload_attempts: number;
					upload_duration_ms: number | null;
					uploaded_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					duration?: number | null;
					error_message?: string | null;
					expires_at: string;
					file_name?: string | null;
					file_size?: number | null;
					id?: string;
					mime_type?: string | null;
					question_id: string;
					recorded_at: string;
					response_type?: string;
					session_id: string;
					status: string;
					storage_path?: string | null;
					text_content?: string | null;
					updated_at?: string;
					upload_attempts?: number;
					upload_duration_ms?: number | null;
					uploaded_at: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					duration?: number | null;
					error_message?: string | null;
					expires_at?: string;
					file_name?: string | null;
					file_size?: number | null;
					id?: string;
					mime_type?: string | null;
					question_id?: string;
					recorded_at?: string;
					response_type?: string;
					session_id?: string;
					status?: string;
					storage_path?: string | null;
					text_content?: string | null;
					updated_at?: string;
					upload_attempts?: number;
					upload_duration_ms?: number | null;
					uploaded_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			streaming_tips: {
				Row: {
					category: string | null;
					created_at: string;
					created_by: string | null;
					display_order: number | null;
					id: string;
					is_active: boolean | null;
					tip_text: string;
					updated_at: string;
				};
				Insert: {
					category?: string | null;
					created_at?: string;
					created_by?: string | null;
					display_order?: number | null;
					id?: string;
					is_active?: boolean | null;
					tip_text: string;
					updated_at?: string;
				};
				Update: {
					category?: string | null;
					created_at?: string;
					created_by?: string | null;
					display_order?: number | null;
					id?: string;
					is_active?: boolean | null;
					tip_text?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			system_status: {
				Row: {
					details: Json | null;
					id: string;
					last_updated: string | null;
					status_type: string;
					status_value: string;
					updated_by: string | null;
				};
				Insert: {
					details?: Json | null;
					id?: string;
					last_updated?: string | null;
					status_type: string;
					status_value: string;
					updated_by?: string | null;
				};
				Update: {
					details?: Json | null;
					id?: string;
					last_updated?: string | null;
					status_type?: string;
					status_value?: string;
					updated_by?: string | null;
				};
				Relationships: [];
			};
			upload_queue: {
				Row: {
					completed_at: string | null;
					content_pack_id: string | null;
					created_at: string | null;
					error_message: string | null;
					file_name: string;
					file_size: number;
					id: string;
					progress: number | null;
					started_at: string | null;
					status: string;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					completed_at?: string | null;
					content_pack_id?: string | null;
					created_at?: string | null;
					error_message?: string | null;
					file_name: string;
					file_size: number;
					id?: string;
					progress?: number | null;
					started_at?: string | null;
					status?: string;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					completed_at?: string | null;
					content_pack_id?: string | null;
					created_at?: string | null;
					error_message?: string | null;
					file_name?: string;
					file_size?: number;
					id?: string;
					progress?: number | null;
					started_at?: string | null;
					status?: string;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			user_entitlements: {
				Row: {
					created_at: string | null;
					entitlement_level: Database["public"]["Enums"]["user_entitlement_level"];
					expires_at: string;
					id: string;
					stripe_event_id: string | null;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					entitlement_level: Database["public"]["Enums"]["user_entitlement_level"];
					expires_at: string;
					id?: string;
					stripe_event_id?: string | null;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					entitlement_level?: Database["public"]["Enums"]["user_entitlement_level"];
					expires_at?: string;
					id?: string;
					stripe_event_id?: string | null;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			user_preferences: {
				Row: {
					created_at: string | null;
					id: string;
					preference_key: string;
					preference_value: string | null;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					preference_key: string;
					preference_value?: string | null;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					preference_key?: string;
					preference_value?: string | null;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			user_profiles: {
				Row: {
					bio: string | null;
					created_at: string | null;
					id: string;
					language: string | null;
					location: string | null;
					notification_preferences: Json | null;
					privacy_settings: Json | null;
					timezone: string | null;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					bio?: string | null;
					created_at?: string | null;
					id?: string;
					language?: string | null;
					location?: string | null;
					notification_preferences?: Json | null;
					privacy_settings?: Json | null;
					timezone?: string | null;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					bio?: string | null;
					created_at?: string | null;
					id?: string;
					language?: string | null;
					location?: string | null;
					notification_preferences?: Json | null;
					privacy_settings?: Json | null;
					timezone?: string | null;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [];
			};
			user_progress: {
				Row: {
					average_score: number | null;
					best_score: number | null;
					completed_questions: number | null;
					content_pack_id: string | null;
					created_at: string | null;
					id: string;
					last_activity_at: string | null;
					total_questions: number | null;
					total_time_spent: number | null;
					updated_at: string | null;
					user_id: string;
					worst_score: number | null;
				};
				Insert: {
					average_score?: number | null;
					best_score?: number | null;
					completed_questions?: number | null;
					content_pack_id?: string | null;
					created_at?: string | null;
					id?: string;
					last_activity_at?: string | null;
					total_questions?: number | null;
					total_time_spent?: number | null;
					updated_at?: string | null;
					user_id: string;
					worst_score?: number | null;
				};
				Update: {
					average_score?: number | null;
					best_score?: number | null;
					completed_questions?: number | null;
					content_pack_id?: string | null;
					created_at?: string | null;
					id?: string;
					last_activity_at?: string | null;
					total_questions?: number | null;
					total_time_spent?: number | null;
					updated_at?: string | null;
					user_id?: string;
					worst_score?: number | null;
				};
				Relationships: [];
			};
			users: {
				Row: {
					avatar_url: string | null;
					created_at: string | null;
					email: string;
					entitlement_level:
						| Database["public"]["Enums"]["user_entitlement_level"]
						| null;
					full_name: string | null;
					id: string;
					stripe_customer_id: string | null;
					updated_at: string | null;
				};
				Insert: {
					avatar_url?: string | null;
					created_at?: string | null;
					email: string;
					entitlement_level?:
						| Database["public"]["Enums"]["user_entitlement_level"]
						| null;
					full_name?: string | null;
					id: string;
					stripe_customer_id?: string | null;
					updated_at?: string | null;
				};
				Update: {
					avatar_url?: string | null;
					created_at?: string | null;
					email?: string;
					entitlement_level?:
						| Database["public"]["Enums"]["user_entitlement_level"]
						| null;
					full_name?: string | null;
					id?: string;
					stripe_customer_id?: string | null;
					updated_at?: string | null;
				};
				Relationships: [];
			};
			validation_results: {
				Row: {
					content_pack_id: string;
					created_at: string | null;
					errors: Json | null;
					id: string;
					is_valid: boolean;
					schema_version: string;
					updated_at: string | null;
					validated_at: string | null;
					validated_by: string;
					validation_time_ms: number;
					warnings: Json | null;
				};
				Insert: {
					content_pack_id: string;
					created_at?: string | null;
					errors?: Json | null;
					id?: string;
					is_valid: boolean;
					schema_version: string;
					updated_at?: string | null;
					validated_at?: string | null;
					validated_by: string;
					validation_time_ms: number;
					warnings?: Json | null;
				};
				Update: {
					content_pack_id?: string;
					created_at?: string | null;
					errors?: Json | null;
					id?: string;
					is_valid?: boolean;
					schema_version?: string;
					updated_at?: string | null;
					validated_at?: string | null;
					validated_by?: string;
					validation_time_ms?: number;
					warnings?: Json | null;
				};
				Relationships: [
					{
						foreignKeyName: "validation_results_content_pack_id_fkey";
						columns: ["content_pack_id"];
						isOneToOne: true;
						referencedRelation: "content_packs";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			current_system_status: {
				Row: {
					details: Json | null;
					last_updated: string | null;
					status_type: string | null;
					status_value: string | null;
					updated_by: string | null;
				};
				Insert: {
					details?: Json | null;
					last_updated?: string | null;
					status_type?: string | null;
					status_value?: string | null;
					updated_by?: string | null;
				};
				Update: {
					details?: Json | null;
					last_updated?: string | null;
					status_type?: string | null;
					status_value?: string | null;
					updated_by?: string | null;
				};
				Relationships: [];
			};
			system_health_dashboard: {
				Row: {
					component: string | null;
					last_updated: string | null;
					message: string | null;
					status: string | null;
				};
				Relationships: [];
			};
			upload_stats_by_user: {
				Row: {
					avg_file_size: number | null;
					completed_uploads: number | null;
					failed_uploads: number | null;
					last_upload_at: string | null;
					queued_uploads: number | null;
					success_rate: number | null;
					total_uploads: number | null;
					uploading_uploads: number | null;
					user_email: string | null;
					user_id: string | null;
					validating_uploads: number | null;
				};
				Relationships: [];
			};
			validation_results_with_details: {
				Row: {
					content_pack_id: string | null;
					content_pack_name: string | null;
					content_pack_version: string | null;
					created_at: string | null;
					errors: Json | null;
					id: string | null;
					is_valid: boolean | null;
					schema_version: string | null;
					updated_at: string | null;
					validated_at: string | null;
					validated_by: string | null;
					validation_time_ms: number | null;
					warnings: Json | null;
				};
				Relationships: [
					{
						foreignKeyName: "validation_results_content_pack_id_fkey";
						columns: ["content_pack_id"];
						isOneToOne: true;
						referencedRelation: "content_packs";
						referencedColumns: ["id"];
					},
				];
			};
			validation_stats_by_schema: {
				Row: {
					avg_validation_time_ms: number | null;
					failed_validations: number | null;
					max_validation_time_ms: number | null;
					min_validation_time_ms: number | null;
					schema_version: string | null;
					success_rate: number | null;
					successful_validations: number | null;
					total_validations: number | null;
				};
				Relationships: [];
			};
		};
		Functions: {
			activate_content_pack: {
				Args: { content_pack_id: string; user_id: string };
				Returns: {
					message: string;
					previous_pack_id: string;
					success: boolean;
				}[];
			};
			archive_content_packs_except: {
				Args: { exclude_id: string };
				Returns: number;
			};
			cleanup_old_system_status: { Args: never; Returns: undefined };
			cleanup_old_uploads: { Args: { days_to_keep?: number }; Returns: number };
			get_active_content_pack: {
				Args: never;
				Returns: {
					activated_at: string;
					activated_by: string;
					checksum: string;
					content: Json;
					description: string;
					file_size: number;
					id: string;
					metadata: Json;
					name: string;
					schema_version: string;
					uploaded_by: string;
					version: string;
				}[];
			};
			get_active_uploads: {
				Args: { user_uuid: string };
				Returns: {
					content_pack_id: string;
					file_name: string;
					file_size: number;
					id: string;
					progress: number;
					started_at: string;
					status: string;
				}[];
			};
			get_latest_validation_result: {
				Args: { pack_id: string };
				Returns: {
					content_pack_id: string;
					errors: Json;
					id: string;
					is_valid: boolean;
					schema_version: string;
					validated_at: string;
					validated_by: string;
					validation_time_ms: number;
					warnings: Json;
				}[];
			};
			get_system_health_summary: { Args: never; Returns: Json };
			get_system_status: {
				Args: never;
				Returns: {
					details: Json;
					last_updated: string;
					status_type: string;
					status_value: string;
					updated_by: string;
				}[];
			};
			get_upload_history: {
				Args: { limit_count?: number; user_uuid: string };
				Returns: {
					completed_at: string;
					content_pack_id: string;
					error_message: string;
					file_name: string;
					file_size: number;
					id: string;
					progress: number;
					started_at: string;
					status: string;
				}[];
			};
			get_upload_statistics: {
				Args: never;
				Returns: {
					avg_file_size: number;
					completed_uploads: number;
					failed_uploads: number;
					queued_uploads: number;
					recent_uploads_24h: number;
					success_rate: number;
					total_uploads: number;
					uploading_uploads: number;
					validating_uploads: number;
				}[];
			};
			get_user_email_safe: { Args: { user_uuid: string }; Returns: string };
			get_validation_history: {
				Args: { limit_count?: number; pack_id: string };
				Returns: {
					errors: Json;
					id: string;
					is_valid: boolean;
					schema_version: string;
					validated_at: string;
					validated_by: string;
					validation_time_ms: number;
					warnings: Json;
				}[];
			};
			get_validation_statistics: {
				Args: never;
				Returns: {
					avg_validation_time_ms: number;
					failed_validations: number;
					max_validation_time_ms: number;
					min_validation_time_ms: number;
					recent_validations_24h: number;
					success_rate: number;
					successful_validations: number;
					total_validations: number;
				}[];
			};
			update_system_status: {
				Args: {
					p_details?: Json;
					p_status_type: string;
					p_status_value: string;
					p_updated_by?: string;
				};
				Returns: undefined;
			};
			update_upload_status: {
				Args: {
					error_msg?: string;
					new_progress?: number;
					new_status: string;
					pack_id?: string;
					upload_id: string;
				};
				Returns: boolean;
			};
			validate_content_pack_structure: {
				Args: { content_data: Json };
				Returns: boolean;
			};
		};
		Enums: {
			evaluation_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
			user_entitlement_level: "FREE" | "TRIAL" | "PRO";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {
			evaluation_status: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
			user_entitlement_level: ["FREE", "TRIAL", "PRO"],
		},
	},
} as const;
