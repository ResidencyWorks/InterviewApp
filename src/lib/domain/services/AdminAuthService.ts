import type { User } from "@supabase/supabase-js";

/**
 * Interface for admin authentication service
 */
export interface IAdminAuthService {
	/**
	 * Check if a user has admin privileges
	 */
	isAdmin(user: User): boolean;

	/**
	 * Check if a user has admin privileges by user ID
	 */
	isAdminById(userId: string): Promise<boolean>;

	/**
	 * Get user role
	 */
	getUserRole(user: User): string;

	/**
	 * Check if a user can access admin routes
	 */
	canAccessAdmin(user: User): boolean;

	/**
	 * Validate admin permissions for a specific action
	 */
	validateAdminPermission(user: User, action: string): boolean;

	/**
	 * Get admin user information
	 */
	getAdminInfo(user: User): AdminUserInfo | null;
}

/**
 * Admin user information
 */
export interface AdminUserInfo {
	id: string;
	email: string;
	role: string;
	permissions: string[];
	lastLogin?: Date;
	isActive: boolean;
}

/**
 * Admin permissions configuration
 */
export interface AdminPermissions {
	contentPackManagement: boolean;
	userManagement: boolean;
	systemConfiguration: boolean;
	analyticsAccess: boolean;
	auditLogs: boolean;
}

/**
 * Admin role configuration
 */
export interface AdminRoleConfig {
	role: string;
	permissions: AdminPermissions;
	description: string;
}

/**
 * Service for admin authentication and authorization
 */
export class AdminAuthService implements IAdminAuthService {
	private readonly adminRoles: AdminRoleConfig[] = [
		{
			role: "admin",
			permissions: {
				contentPackManagement: true,
				userManagement: true,
				systemConfiguration: true,
				analyticsAccess: true,
				auditLogs: true,
			},
			description: "Full administrative access",
		},
		{
			role: "content_admin",
			permissions: {
				contentPackManagement: true,
				userManagement: false,
				systemConfiguration: false,
				analyticsAccess: true,
				auditLogs: false,
			},
			description: "Content pack management access",
		},
		{
			role: "system_admin",
			permissions: {
				contentPackManagement: false,
				userManagement: true,
				systemConfiguration: true,
				analyticsAccess: true,
				auditLogs: true,
			},
			description: "System configuration access",
		},
	];

	/**
	 * Check if a user has admin privileges
	 */
	isAdmin(user: User): boolean {
		if (!user) {
			return false;
		}

		const userRole = this.getUserRole(user);
		return this.adminRoles.some((role) => role.role === userRole);
	}

	/**
	 * Check if a user has admin privileges by user ID
	 * This would typically query the database for user information
	 */
	async isAdminById(_userId: string): Promise<boolean> {
		try {
			// In a real implementation, this would query the database
			// For now, we'll return false as we don't have database access here
			console.warn("isAdminById not implemented - requires database access");
			return false;
		} catch (error) {
			console.error("Error checking admin status by ID:", error);
			return false;
		}
	}

	/**
	 * Get user role
	 */
	getUserRole(user: User): string {
		if (!user) {
			return "user";
		}

		// Check user metadata first
		const metadataRole = user.user_metadata?.role;
		if (metadataRole) {
			return metadataRole;
		}

		// Check app metadata
		const appMetadataRole = user.app_metadata?.role;
		if (appMetadataRole) {
			return appMetadataRole;
		}

		// Default to user role
		return "user";
	}

	/**
	 * Check if a user can access admin routes
	 */
	canAccessAdmin(user: User): boolean {
		return this.isAdmin(user);
	}

	/**
	 * Validate admin permissions for a specific action
	 */
	validateAdminPermission(user: User, action: string): boolean {
		if (!this.isAdmin(user)) {
			return false;
		}

		const userRole = this.getUserRole(user);
		const roleConfig = this.adminRoles.find((role) => role.role === userRole);

		if (!roleConfig) {
			return false;
		}

		// Map actions to permissions
		const actionPermissionMap: Record<string, keyof AdminPermissions> = {
			content_pack_upload: "contentPackManagement",
			content_pack_validate: "contentPackManagement",
			content_pack_activate: "contentPackManagement",
			content_pack_delete: "contentPackManagement",
			user_create: "userManagement",
			user_update: "userManagement",
			user_delete: "userManagement",
			system_configure: "systemConfiguration",
			analytics_view: "analyticsAccess",
			audit_logs_view: "auditLogs",
		};

		const permission = actionPermissionMap[action];
		if (!permission) {
			// Unknown action, deny by default
			return false;
		}

		return roleConfig.permissions[permission];
	}

	/**
	 * Get admin user information
	 */
	getAdminInfo(user: User): AdminUserInfo | null {
		if (!this.isAdmin(user)) {
			return null;
		}

		const userRole = this.getUserRole(user);
		const roleConfig = this.adminRoles.find((role) => role.role === userRole);

		return {
			id: user.id,
			email: user.email || "",
			role: userRole,
			permissions: this.getPermissionsList(
				roleConfig?.permissions || {
					contentPackManagement: false,
					userManagement: false,
					systemConfiguration: false,
					analyticsAccess: false,
					auditLogs: false,
				},
			),
			lastLogin: user.last_sign_in_at
				? new Date(user.last_sign_in_at)
				: undefined,
			isActive: true, // Assuming active if user exists
		};
	}

	/**
	 * Get list of permissions from permissions object
	 */
	private getPermissionsList(permissions: AdminPermissions): string[] {
		const permissionList: string[] = [];

		Object.entries(permissions).forEach(([key, value]) => {
			if (value) {
				permissionList.push(key);
			}
		});

		return permissionList;
	}

	/**
	 * Get all available admin roles
	 */
	getAdminRoles(): AdminRoleConfig[] {
		return [...this.adminRoles];
	}

	/**
	 * Check if a role exists
	 */
	isValidAdminRole(role: string): boolean {
		return this.adminRoles.some((adminRole) => adminRole.role === role);
	}

	/**
	 * Get role configuration
	 */
	getRoleConfig(role: string): AdminRoleConfig | null {
		return this.adminRoles.find((adminRole) => adminRole.role === role) || null;
	}

	/**
	 * Validate user session for admin access
	 */
	validateAdminSession(user: User): {
		isValid: boolean;
		reason?: string;
		userInfo?: AdminUserInfo;
	} {
		if (!user) {
			return {
				isValid: false,
				reason: "No user session found",
			};
		}

		if (!this.isAdmin(user)) {
			return {
				isValid: false,
				reason: "User does not have admin privileges",
			};
		}

		const userInfo = this.getAdminInfo(user);
		if (!userInfo) {
			return {
				isValid: false,
				reason: "Unable to retrieve admin user information",
			};
		}

		return {
			isValid: true,
			userInfo,
		};
	}

	/**
	 * Log admin action
	 */
	logAdminAction(
		user: User,
		action: string,
		details?: Record<string, unknown>,
	): void {
		if (!this.isAdmin(user)) {
			console.warn(
				"Attempted to log admin action for non-admin user:",
				user.id,
			);
			return;
		}

		const logEntry = {
			timestamp: new Date().toISOString(),
			userId: user.id,
			userEmail: user.email,
			action,
			details: details || {},
		};

		console.log("Admin action:", logEntry);

		// In a real implementation, this would be sent to an audit log service
		// For now, we'll just log to console
	}
}

// Export singleton instance
export const adminAuthService = new AdminAuthService();
