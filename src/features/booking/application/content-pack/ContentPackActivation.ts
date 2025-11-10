import { trackContentPackLoaded } from "@/features/notifications/application/analytics/transcript-analytics";
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
		const validated = await validateContentPack(pack);

		this.activePack = validated;

		trackContentPackLoaded({
			name: validated.name,
			version: validated.version,
		});

		if (this.onActivate) {
			await this.onActivate(validated);
		}

		return validated;
	}
}

export const contentPackActivation = new ContentPackActivation();
