/**
 * Secure API Key Manager for OpenAI keys
 */

import crypto from "node:crypto";
import { maskApiKey, validateApiKey } from "./SecurityUtils";

/**
 * API Key configuration
 */
export interface ApiKeyConfig {
	keyId: string;
	encryptedKey: string;
	createdAt: Date;
	lastUsed?: Date;
	usageCount: number;
	isActive: boolean;
	environment: string;
	description?: string;
}

/**
 * API Key rotation configuration
 */
export interface KeyRotationConfig {
	rotationIntervalDays: number;
	maxUsageCount: number;
	enableAutoRotation: boolean;
	backupKeys: string[];
}

/**
 * Secure API Key Manager
 */
export class SecureApiKeyManager {
	private encryptionKey: string;
	private keys: Map<string, ApiKeyConfig> = new Map();
	private rotationConfig: KeyRotationConfig;

	constructor(
		encryptionKey: string,
		rotationConfig: Partial<KeyRotationConfig> = {},
	) {
		this.encryptionKey = encryptionKey;
		this.rotationConfig = {
			rotationIntervalDays: 90,
			maxUsageCount: 10000,
			enableAutoRotation: true,
			backupKeys: [],
			...rotationConfig,
		};
	}

	/**
	 * Store API key securely
	 */
	storeApiKey(
		keyId: string,
		apiKey: string,
		environment: string,
		description?: string,
	): void {
		// Validate API key format
		if (!validateApiKey(apiKey)) {
			throw new Error("Invalid API key format");
		}

		// Encrypt the API key
		const encryptedKey = this.encrypt(apiKey);

		// Store configuration
		const config: ApiKeyConfig = {
			keyId,
			encryptedKey,
			createdAt: new Date(),
			usageCount: 0,
			isActive: true,
			environment,
			description,
		};

		this.keys.set(keyId, config);
	}

	/**
	 * Retrieve and decrypt API key
	 */
	getApiKey(keyId: string): string | null {
		const config = this.keys.get(keyId);

		if (!config || !config.isActive) {
			return null;
		}

		// Check if key needs rotation
		if (this.shouldRotateKey(config)) {
			this.rotateKey(keyId);
		}

		// Update usage statistics
		config.lastUsed = new Date();
		config.usageCount++;

		// Decrypt and return the key
		return this.decrypt(config.encryptedKey);
	}

	/**
	 * Get all active API keys
	 */
	getActiveKeys(): ApiKeyConfig[] {
		return Array.from(this.keys.values()).filter((key) => key.isActive);
	}

	/**
	 * Deactivate API key
	 */
	deactivateKey(keyId: string): boolean {
		const config = this.keys.get(keyId);
		if (config) {
			config.isActive = false;
			return true;
		}
		return false;
	}

	/**
	 * Rotate API key
	 */
	rotateKey(keyId: string, newApiKey?: string): boolean {
		const config = this.keys.get(keyId);
		if (!config) {
			return false;
		}

		if (newApiKey) {
			// Validate new API key
			if (!validateApiKey(newApiKey)) {
				throw new Error("Invalid new API key format");
			}

			// Encrypt and store new key
			config.encryptedKey = this.encrypt(newApiKey);
		}

		// Reset usage statistics
		config.createdAt = new Date();
		config.usageCount = 0;
		config.lastUsed = undefined;

		return true;
	}

	/**
	 * Check if key should be rotated
	 */
	private shouldRotateKey(config: ApiKeyConfig): boolean {
		if (!this.rotationConfig.enableAutoRotation) {
			return false;
		}

		// Check age
		const ageInDays =
			(Date.now() - config.createdAt.getTime()) / (1000 * 60 * 60 * 24);
		if (ageInDays >= this.rotationConfig.rotationIntervalDays) {
			return true;
		}

		// Check usage count
		if (config.usageCount >= this.rotationConfig.maxUsageCount) {
			return true;
		}

		return false;
	}

	/**
	 * Encrypt API key
	 */
	private encrypt(apiKey: string): string {
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv("aes-256-cbc", this.encryptionKey, iv);

		let encrypted = cipher.update(apiKey, "utf8", "hex");
		encrypted += cipher.final("hex");

		return `${iv.toString("hex")}:${encrypted}`;
	}

	/**
	 * Decrypt API key
	 */
	private decrypt(encryptedKey: string): string {
		const parts = encryptedKey.split(":");
		if (parts.length !== 2) {
			throw new Error("Invalid encrypted key format");
		}

		const iv = Buffer.from(parts[0], "hex");
		const encrypted = parts[1];

		const decipher = crypto.createDecipheriv(
			"aes-256-cbc",
			this.encryptionKey,
			iv,
		);

		let decrypted = decipher.update(encrypted, "hex", "utf8");
		decrypted += decipher.final("utf8");

		return decrypted;
	}

	/**
	 * Get key usage statistics
	 */
	getKeyStats(keyId: string): {
		usageCount: number;
		lastUsed?: Date;
		ageInDays: number;
		needsRotation: boolean;
	} | null {
		const config = this.keys.get(keyId);
		if (!config) {
			return null;
		}

		const ageInDays =
			(Date.now() - config.createdAt.getTime()) / (1000 * 60 * 60 * 24);

		return {
			usageCount: config.usageCount,
			lastUsed: config.lastUsed,
			ageInDays: Math.floor(ageInDays),
			needsRotation: this.shouldRotateKey(config),
		};
	}

	/**
	 * Validate API key without storing it
	 */
	validateApiKey(apiKey: string): boolean {
		return validateApiKey(apiKey);
	}

	/**
	 * Mask API key for logging
	 */
	maskApiKey(apiKey: string): string {
		return maskApiKey(apiKey);
	}

	/**
	 * Update rotation configuration
	 */
	updateRotationConfig(config: Partial<KeyRotationConfig>): void {
		this.rotationConfig = { ...this.rotationConfig, ...config };
	}

	/**
	 * Get rotation configuration
	 */
	getRotationConfig(): KeyRotationConfig {
		return { ...this.rotationConfig };
	}

	/**
	 * Clean up expired keys
	 */
	cleanupExpiredKeys(): number {
		let cleanedCount = 0;
		const maxAge = this.rotationConfig.rotationIntervalDays * 2; // 2x rotation interval

		for (const [keyId, config] of Array.from(this.keys.entries())) {
			const ageInDays =
				(Date.now() - config.createdAt.getTime()) / (1000 * 60 * 60 * 24);

			if (ageInDays > maxAge) {
				this.keys.delete(keyId);
				cleanedCount++;
			}
		}

		return cleanedCount;
	}

	/**
	 * Export keys for backup (encrypted)
	 */
	exportKeys(): string {
		const exportData = {
			keys: Array.from(this.keys.entries()),
			rotationConfig: this.rotationConfig,
			exportedAt: new Date().toISOString(),
		};

		return JSON.stringify(exportData, null, 2);
	}

	/**
	 * Import keys from backup
	 */
	importKeys(backupData: string): void {
		try {
			const data = JSON.parse(backupData);

			if (data.keys && Array.isArray(data.keys)) {
				this.keys = new Map(data.keys);
			}

			if (data.rotationConfig) {
				this.rotationConfig = {
					...this.rotationConfig,
					...data.rotationConfig,
				};
			}
		} catch {
			throw new Error("Invalid backup data format");
		}
	}
}

/**
 * Create secure API key manager instance
 */
export function createSecureApiKeyManager(
	encryptionKey: string,
	rotationConfig?: Partial<KeyRotationConfig>,
): SecureApiKeyManager {
	return new SecureApiKeyManager(encryptionKey, rotationConfig);
}
