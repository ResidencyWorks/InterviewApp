import { trackContentPackLoaded } from "../analytics/transcript-analytics";
import { performanceMonitor } from "../monitoring/PerformanceMonitor";
import { validateContentPack } from "./schema";
import type { IContentPack } from "./types";

export interface IContentPackActivationOptions {
	onActivate?: (pack: IContentPack) => Promise<void>;
}

class ContentPackActivation {
	private activePack?: IContentPack;
	private readonly onActivate?: (pack: IContentPack) => Promise<void>;

	constructor(options?: IContentPackActivationOptions) {
		this.onActivate = options?.onActivate;
	}

	getActivePack(): IContentPack | undefined {
		return this.activePack;
	}

	async activate(pack: unknown): Promise<IContentPack> {
		return performanceMonitor.measure(
			"content_pack_activation",
			async () => {
				// Measure validation separately
				const validated = await performanceMonitor.measure(
					"content_pack_validation",
					async () => {
						// Run validation in this promise
						return validateContentPack(pack);
					},
				);

				this.activePack = validated;

				// Track analytics event
				trackContentPackLoaded({
					name: validated.name,
					version: validated.version,
				});

				// Call optional activation hook
				if (this.onActivate) {
					await performanceMonitor.measure(
						"content_pack_onActivate_hook",
						() => {
							const hook = this.onActivate;
							if (hook) {
								return hook(validated);
							}
							return Promise.resolve();
						},
					);
				}

				return validated;
			},
			{
				packName:
					pack !== null && typeof pack === "object" && "name" in pack
						? String((pack as Record<string, unknown>).name)
						: "unknown",
				version:
					pack !== null && typeof pack === "object" && "version" in pack
						? String((pack as Record<string, unknown>).version)
						: "unknown",
			},
		);
	}
}

export const contentPackActivation = new ContentPackActivation();
