export interface IContentPackMetric {
	id: string;
	label: string;
	weight: number; // 0..1
}

export interface IContentPackCriteria {
	id: string;
	name: string;
	weight: number;
	description: string;
}

export interface IContentPackQuestion {
	id: string;
	text: string;
	type: string;
}

export interface IContentPackEvaluationCriteria {
	id: string;
	title: string;
	description: string;
	criteria: IContentPackCriteria[];
	questions: IContentPackQuestion[];
}

export interface IContentPackCategory {
	id: string;
	name: string;
	description: string;
}

export interface IContentPackMetadata {
	author?: string;
	tags?: string[];
	compatibility?: {
		minVersion?: string;
		maxVersion?: string;
		features?: string[];
	};
}

export interface IContentPack {
	name: string;
	version: string;
	description?: string;
	content: {
		evaluations: IContentPackEvaluationCriteria[];
		categories: IContentPackCategory[];
	};
	metadata?: IContentPackMetadata;
}
