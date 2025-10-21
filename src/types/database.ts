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
					content: Json;
					created_at: string | null;
					id: string;
					is_active: boolean | null;
					name: string;
					updated_at: string | null;
					version: string;
				};
				Insert: {
					content: Json;
					created_at?: string | null;
					id?: string;
					is_active?: boolean | null;
					name: string;
					updated_at?: string | null;
					version: string;
				};
				Update: {
					content?: Json;
					created_at?: string | null;
					id?: string;
					is_active?: boolean | null;
					name?: string;
					updated_at?: string | null;
					version?: string;
				};
				Relationships: [];
			};
			evaluation_results: {
				Row: {
					categories: Json;
					content_pack_id: string | null;
					created_at: string | null;
					duration_seconds: number | null;
					feedback: string | null;
					id: string;
					response_audio_url: string | null;
					response_text: string | null;
					response_type: string;
					score: number | null;
					status: Database["public"]["Enums"]["evaluation_status"] | null;
					updated_at: string | null;
					user_id: string;
					word_count: number | null;
					wpm: number | null;
				};
				Insert: {
					categories?: Json;
					content_pack_id?: string | null;
					created_at?: string | null;
					duration_seconds?: number | null;
					feedback?: string | null;
					id?: string;
					response_audio_url?: string | null;
					response_text?: string | null;
					response_type: string;
					score?: number | null;
					status?: Database["public"]["Enums"]["evaluation_status"] | null;
					updated_at?: string | null;
					user_id: string;
					word_count?: number | null;
					wpm?: number | null;
				};
				Update: {
					categories?: Json;
					content_pack_id?: string | null;
					created_at?: string | null;
					duration_seconds?: number | null;
					feedback?: string | null;
					id?: string;
					response_audio_url?: string | null;
					response_text?: string | null;
					response_type?: string;
					score?: number | null;
					status?: Database["public"]["Enums"]["evaluation_status"] | null;
					updated_at?: string | null;
					user_id?: string;
					word_count?: number | null;
					wpm?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "evaluation_results_content_pack_id_fkey";
						columns: ["content_pack_id"];
						isOneToOne: false;
						referencedRelation: "content_packs";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "evaluation_results_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
				];
			};
			user_entitlements: {
				Row: {
					created_at: string | null;
					entitlement_level: Database["public"]["Enums"]["user_entitlement_level"];
					expires_at: string;
					id: string;
					updated_at: string | null;
					user_id: string;
				};
				Insert: {
					created_at?: string | null;
					entitlement_level: Database["public"]["Enums"]["user_entitlement_level"];
					expires_at: string;
					id?: string;
					updated_at?: string | null;
					user_id: string;
				};
				Update: {
					created_at?: string | null;
					entitlement_level?: Database["public"]["Enums"]["user_entitlement_level"];
					expires_at?: string;
					id?: string;
					updated_at?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "user_entitlements_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
				];
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
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
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
