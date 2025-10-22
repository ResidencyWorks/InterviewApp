export interface IContentPackMetric {
	id: string;
	label: string;
	weight: number; // 0..1
}

export interface IContentPack {
	name: string;
	version: string;
	categories: string[];
	metrics: IContentPackMetric[];
	prompts: {
		refactor_summary: string;
		scoring_rules: string;
	};
}
