import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateContentPack } from "./schema";
import type { IContentPack } from "./types";

export interface IContentPackLoaderOptions {
	rootDir?: string;
}

export class ContentPackLoader {
	private readonly rootDir: string;

	constructor(options?: IContentPackLoaderOptions) {
		this.rootDir = options?.rootDir ?? process.cwd();
	}

	async loadFromFile(
		relativePath: string,
		_dryRun = true,
	): Promise<IContentPack> {
		const absolutePath = resolve(this.rootDir, relativePath);
		const raw = await readFile(absolutePath, "utf8");
		const parsed = JSON.parse(raw);
		const validated = validateContentPack(parsed);
		return validated;
	}
}
