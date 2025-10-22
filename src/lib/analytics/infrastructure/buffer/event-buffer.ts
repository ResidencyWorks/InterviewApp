import type { AnalyticsEvent } from "../../domain/entities/AnalyticsEvent";
import type { ErrorEvent } from "../../domain/entities/ErrorEvent";

type EventType = AnalyticsEvent | ErrorEvent;

/**
 * Event buffer configuration
 */
export interface EventBufferConfig {
	/**
	 * Maximum buffer size
	 */
	maxSize: number;

	/**
	 * Flush interval in milliseconds
	 */
	flushInterval: number;

	/**
	 * Maximum time to wait before flushing (in milliseconds)
	 */
	maxWaitTime: number;

	/**
	 * Whether to enable the buffer
	 */
	enabled: boolean;

	/**
	 * Whether to enable automatic flushing
	 */
	autoFlush: boolean;

	/**
	 * Whether to enable batch processing
	 */
	batchProcessing: boolean;

	/**
	 * Maximum batch size
	 */
	maxBatchSize: number;
}

/**
 * Buffered event
 */
export interface BufferedEvent<T = EventType> {
	event: T;
	timestamp: Date;
	id: string;
	retryCount: number;
	maxRetries: number;
}

/**
 * Event buffer statistics
 */
export interface EventBufferStats {
	totalEvents: number;
	bufferedEvents: number;
	flushedEvents: number;
	failedEvents: number;
	lastFlushTime?: Date;
	nextFlushTime?: Date;
	bufferSize: number;
	isFlushing: boolean;
}

/**
 * Event buffer error
 */
export class EventBufferError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly originalError?: Error,
	) {
		super(message);
		this.name = "EventBufferError";
	}
}

/**
 * Event buffer interface
 */
export interface IEventBuffer<T = EventType> {
	/**
	 * Add an event to the buffer
	 */
	add(event: T): Promise<void>;

	/**
	 * Add multiple events to the buffer
	 */
	addBatch(events: T[]): Promise<void>;

	/**
	 * Flush all buffered events
	 */
	flush(): Promise<void>;

	/**
	 * Get buffer statistics
	 */
	getStats(): EventBufferStats;

	/**
	 * Clear the buffer
	 */
	clear(): void;

	/**
	 * Check if buffer is full
	 */
	isFull(): boolean;

	/**
	 * Check if buffer is empty
	 */
	isEmpty(): boolean;

	/**
	 * Get buffer size
	 */
	size(): number;

	/**
	 * Start automatic flushing
	 */
	startAutoFlush(): void;

	/**
	 * Stop automatic flushing
	 */
	stopAutoFlush(): void;

	/**
	 * Set flush handler
	 */
	setFlushHandler(handler: (events: T[]) => Promise<void>): void;
}

/**
 * Event buffer implementation
 */
export class EventBuffer<T = EventType> implements IEventBuffer<T> {
	private buffer: BufferedEvent<T>[] = [];
	private config: EventBufferConfig;
	private stats: EventBufferStats;
	private flushHandler?: (events: T[]) => Promise<void>;
	private autoFlushInterval?: NodeJS.Timeout;
	private isFlushing = false;
	private lastFlushTime?: Date;

	constructor(config: EventBufferConfig) {
		this.config = config;
		this.stats = {
			totalEvents: 0,
			bufferedEvents: 0,
			flushedEvents: 0,
			failedEvents: 0,
			bufferSize: 0,
			isFlushing: false,
		};

		if (this.config.enabled && this.config.autoFlush) {
			this.startAutoFlush();
		}
	}

	/**
	 * Add an event to the buffer
	 */
	async add(event: T): Promise<void> {
		if (!this.config.enabled) {
			throw new EventBufferError("Event buffer is disabled", "BUFFER_DISABLED");
		}

		if (this.isFull()) {
			await this.flush();
		}

		const bufferedEvent: BufferedEvent<T> = {
			event,
			timestamp: new Date(),
			id: crypto.randomUUID(),
			retryCount: 0,
			maxRetries: 3,
		};

		this.buffer.push(bufferedEvent);
		this.stats.totalEvents++;
		this.stats.bufferedEvents++;
		this.stats.bufferSize = this.buffer.length;

		// Auto-flush if buffer is full or max wait time exceeded
		if (this.shouldAutoFlush()) {
			await this.flush();
		}
	}

	/**
	 * Add multiple events to the buffer
	 */
	async addBatch(events: T[]): Promise<void> {
		if (!this.config.enabled) {
			throw new EventBufferError("Event buffer is disabled", "BUFFER_DISABLED");
		}

		if (this.config.batchProcessing) {
			// Add all events as a batch
			const bufferedEvents: BufferedEvent<T>[] = events.map((event) => ({
				event,
				timestamp: new Date(),
				id: crypto.randomUUID(),
				retryCount: 0,
				maxRetries: 3,
			}));

			this.buffer.push(...bufferedEvents);
			this.stats.totalEvents += events.length;
			this.stats.bufferedEvents += events.length;
			this.stats.bufferSize = this.buffer.length;

			// Auto-flush if buffer is full or max wait time exceeded
			if (this.shouldAutoFlush()) {
				await this.flush();
			}
		} else {
			// Add events individually
			for (const event of events) {
				await this.add(event);
			}
		}
	}

	/**
	 * Flush all buffered events
	 */
	async flush(): Promise<void> {
		if (!this.config.enabled || this.isEmpty() || this.isFlushing) {
			return;
		}

		this.isFlushing = true;
		this.stats.isFlushing = true;

		const eventsToFlush = [...this.buffer];
		this.buffer = [];

		if (eventsToFlush.length === 0) {
			this.isFlushing = false;
			this.stats.isFlushing = false;
			return;
		}

		try {
			if (this.flushHandler) {
				const events = eventsToFlush.map(
					(bufferedEvent) => bufferedEvent.event,
				);
				await this.flushHandler(events);
			}

			this.stats.flushedEvents += eventsToFlush.length;
			this.stats.bufferedEvents -= eventsToFlush.length;
			this.stats.bufferSize = this.buffer.length;
			this.lastFlushTime = new Date();
			this.stats.lastFlushTime = this.lastFlushTime;
		} catch (error) {
			// Re-add failed events to buffer
			const failedEvents = eventsToFlush.filter((bufferedEvent) => {
				bufferedEvent.retryCount++;
				return bufferedEvent.retryCount < bufferedEvent.maxRetries;
			});

			this.buffer.unshift(...failedEvents);
			this.stats.failedEvents += eventsToFlush.length - failedEvents.length;
			this.stats.bufferedEvents = this.buffer.length;
			this.stats.bufferSize = this.buffer.length;

			throw new EventBufferError(
				"Failed to flush events",
				"FLUSH_FAILED",
				error as Error,
			);
		} finally {
			this.isFlushing = false;
			this.stats.isFlushing = false;
		}
	}

	/**
	 * Get buffer statistics
	 */
	getStats(): EventBufferStats {
		return { ...this.stats };
	}

	/**
	 * Clear the buffer
	 */
	clear(): void {
		this.buffer = [];
		this.stats.bufferedEvents = 0;
		this.stats.bufferSize = 0;
	}

	/**
	 * Check if buffer is full
	 */
	isFull(): boolean {
		return this.buffer.length >= this.config.maxSize;
	}

	/**
	 * Check if buffer is empty
	 */
	isEmpty(): boolean {
		return this.buffer.length === 0;
	}

	/**
	 * Get buffer size
	 */
	size(): number {
		return this.buffer.length;
	}

	/**
	 * Start automatic flushing
	 */
	startAutoFlush(): void {
		if (this.autoFlushInterval) {
			return;
		}

		this.autoFlushInterval = setInterval(async () => {
			if (!this.isEmpty()) {
				await this.flush();
			}
		}, this.config.flushInterval);

		this.stats.nextFlushTime = new Date(Date.now() + this.config.flushInterval);
	}

	/**
	 * Stop automatic flushing
	 */
	stopAutoFlush(): void {
		if (this.autoFlushInterval) {
			clearInterval(this.autoFlushInterval);
			this.autoFlushInterval = undefined;
			this.stats.nextFlushTime = undefined;
		}
	}

	/**
	 * Set flush handler
	 */
	setFlushHandler(handler: (events: T[]) => Promise<void>): void {
		this.flushHandler = handler;
	}

	/**
	 * Check if auto-flush should be triggered
	 */
	private shouldAutoFlush(): boolean {
		if (!this.config.autoFlush) {
			return false;
		}

		// Flush if buffer is full
		if (this.isFull()) {
			return true;
		}

		// Flush if max wait time exceeded
		if (this.lastFlushTime) {
			const timeSinceLastFlush = Date.now() - this.lastFlushTime.getTime();
			if (timeSinceLastFlush >= this.config.maxWaitTime) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<EventBufferConfig>): void {
		this.config = { ...this.config, ...config };

		// Restart auto-flush if interval changed
		if (config.flushInterval && this.autoFlushInterval) {
			this.stopAutoFlush();
			this.startAutoFlush();
		}
	}

	/**
	 * Get configuration
	 */
	getConfig(): EventBufferConfig {
		return { ...this.config };
	}

	/**
	 * Shutdown the buffer
	 */
	async shutdown(): Promise<void> {
		this.stopAutoFlush();
		await this.flush();
	}
}

/**
 * Event buffer manager for multiple event types
 */
export class EventBufferManager {
	private buffers: Map<string, EventBuffer<EventType>> = new Map();

	/**
	 * Create or get a buffer for a specific event type
	 */
	getBuffer<T extends EventType>(
		eventType: string,
		config: EventBufferConfig,
	): EventBuffer<T> {
		if (!this.buffers.has(eventType)) {
			this.buffers.set(
				eventType,
				new EventBuffer<T>(config) as unknown as EventBuffer<EventType>,
			);
		}
		return this.buffers.get(eventType) as unknown as EventBuffer<T>;
	}

	/**
	 * Add an event to the appropriate buffer
	 */
	async addEvent<T extends EventType>(
		eventType: string,
		event: T,
	): Promise<void> {
		const buffer = this.buffers.get(eventType);
		if (!buffer) {
			throw new Error(`Buffer not found for event type: ${eventType}`);
		}
		await buffer.add(event);
	}

	/**
	 * Flush all buffers
	 */
	async flushAll(): Promise<void> {
		const flushPromises = Array.from(this.buffers.values()).map((buffer) =>
			buffer.flush(),
		);
		await Promise.all(flushPromises);
	}

	/**
	 * Get statistics for all buffers
	 */
	getAllStats(): Record<string, EventBufferStats> {
		const stats: Record<string, EventBufferStats> = {};
		for (const [eventType, buffer] of Array.from(this.buffers.entries())) {
			stats[eventType] = buffer.getStats();
		}
		return stats;
	}

	/**
	 * Get statistics for a specific buffer
	 */
	getStats(eventType: string): EventBufferStats | undefined {
		return this.buffers.get(eventType)?.getStats();
	}

	/**
	 * Clear all buffers
	 */
	clearAll(): void {
		for (const buffer of Array.from(this.buffers.values())) {
			buffer.clear();
		}
	}

	/**
	 * Shutdown all buffers
	 */
	async shutdownAll(): Promise<void> {
		const shutdownPromises = Array.from(this.buffers.values()).map((buffer) =>
			buffer.shutdown(),
		);
		await Promise.all(shutdownPromises);
	}
}

/**
 * Default event buffer configurations
 */
export const DEFAULT_EVENT_BUFFER_CONFIG: EventBufferConfig = {
	maxSize: 100,
	flushInterval: 5000, // 5 seconds
	maxWaitTime: 30000, // 30 seconds
	enabled: true,
	autoFlush: true,
	batchProcessing: true,
	maxBatchSize: 50,
};

export const HIGH_VOLUME_EVENT_BUFFER_CONFIG: EventBufferConfig = {
	maxSize: 1000,
	flushInterval: 1000, // 1 second
	maxWaitTime: 10000, // 10 seconds
	enabled: true,
	autoFlush: true,
	batchProcessing: true,
	maxBatchSize: 100,
};

export const LOW_VOLUME_EVENT_BUFFER_CONFIG: EventBufferConfig = {
	maxSize: 50,
	flushInterval: 30000, // 30 seconds
	maxWaitTime: 60000, // 1 minute
	enabled: true,
	autoFlush: true,
	batchProcessing: false,
	maxBatchSize: 10,
};

/**
 * Convenience functions
 */
export function createEventBuffer<T>(
	config: EventBufferConfig,
): EventBuffer<T> {
	return new EventBuffer<T>(config);
}

export function createDefaultEventBuffer<T>(): EventBuffer<T> {
	return new EventBuffer<T>(DEFAULT_EVENT_BUFFER_CONFIG);
}

export function createHighVolumeEventBuffer<T>(): EventBuffer<T> {
	return new EventBuffer<T>(HIGH_VOLUME_EVENT_BUFFER_CONFIG);
}

export function createLowVolumeEventBuffer<T>(): EventBuffer<T> {
	return new EventBuffer<T>(LOW_VOLUME_EVENT_BUFFER_CONFIG);
}

export function createEventBufferManager(): EventBufferManager {
	return new EventBufferManager();
}
