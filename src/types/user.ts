/**
 * User-related types and interfaces
 */

import type { BaseEntity } from "./common";

/**
 * User entitlement levels
 */
export type UserEntitlementLevel = "FREE" | "TRIAL" | "PRO";

/**
 * User profile interface
 */
export interface UserProfile extends BaseEntity {
	email: string;
	full_name?: string;
	avatar_url?: string;
	entitlement_level: UserEntitlementLevel;
	stripe_customer_id?: string;
	last_login_at?: string;
	email_verified: boolean;
	phone?: string;
	phone_verified: boolean;
	timezone?: string;
	locale?: string;
	preferences: UserPreferences;
}

/**
 * User preferences interface
 */
export interface UserPreferences {
	theme: "light" | "dark" | "system";
	notifications: {
		email: boolean;
		push: boolean;
		sms: boolean;
	};
	privacy: {
		profile_visibility: "public" | "private";
		show_email: boolean;
		show_phone: boolean;
	};
	accessibility: {
		high_contrast: boolean;
		large_text: boolean;
		screen_reader: boolean;
	};
}

/**
 * User session interface
 */
export interface UserSession {
	id: string;
	user_id: string;
	device_info?: string;
	ip_address?: string;
	user_agent?: string;
	created_at: string;
	last_activity: string;
	expires_at: string;
	is_active: boolean;
}

/**
 * User activity log interface
 */
export interface UserActivity extends BaseEntity {
	user_id: string;
	action: string;
	resource_type?: string;
	resource_id?: string;
	metadata?: Record<string, unknown>;
	ip_address?: string;
	user_agent?: string;
}

/**
 * User subscription interface
 */
export interface UserSubscription extends BaseEntity {
	user_id: string;
	stripe_subscription_id: string;
	plan_id: string;
	status: "active" | "canceled" | "past_due" | "unpaid";
	current_period_start: string;
	current_period_end: string;
	cancel_at_period_end: boolean;
	trial_end?: string;
}

/**
 * User invitation interface
 */
export interface UserInvitation extends BaseEntity {
	email: string;
	invited_by: string;
	role?: string;
	expires_at: string;
	accepted_at?: string;
	token: string;
}

/**
 * User update request interface
 */
export interface UserUpdateRequest {
	full_name?: string;
	avatar_url?: string;
	phone?: string;
	timezone?: string;
	locale?: string;
	preferences?: Partial<UserPreferences>;
}

/**
 * User creation request interface
 */
export interface UserCreateRequest {
	email: string;
	full_name?: string;
	phone?: string;
	timezone?: string;
	locale?: string;
	preferences?: Partial<UserPreferences>;
}

/**
 * User authentication context
 */
export interface UserAuthContext {
	user: UserProfile | null;
	session: UserSession | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error?: string;
}

/**
 * User statistics interface
 */
export interface UserStats {
	total_evaluations: number;
	average_score: number;
	total_time_spent: number;
	streak_days: number;
	last_activity: string;
	achievements: string[];
}
