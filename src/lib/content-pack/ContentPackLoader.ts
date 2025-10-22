import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
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
		const parsed = JSON.parse(raw) as IContentPack;
		// Minimal dry-run validation
		if (!parsed.name || !parsed.version) {
			throw new Error("Invalid content pack: missing name or version");
		}
		if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
			throw new Error(
				"Invalid content pack: categories must be non-empty array",
			);
		}
		if (!Array.isArray(parsed.metrics) || parsed.metrics.length === 0) {
			throw new Error("Invalid content pack: metrics must be non-empty array");
		}
		if (!parsed.prompts?.refactor_summary || !parsed.prompts?.scoring_rules) {
			throw new Error("Invalid content pack: prompts incomplete");
		}
		// If not dry-run, we could persist/activate here in future tasks
		return parsed;
	}
}
