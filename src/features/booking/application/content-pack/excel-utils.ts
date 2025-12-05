import { read, utils, type WorkBook, write } from "xlsx";
import type {
	ContentPackData,
	ContentPackMetadata,
} from "@/features/booking/domain/entities/ContentPack";

type NormalizedRow = Record<string, unknown>;

const REQUIRED_SHEETS = [
	"pack",
	"categories",
	"evaluations",
	"criteria",
	"questions",
] as const;

const EXCEL_MIME_TYPES = new Set([
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-excel",
]);

const normalizeKey = (key: string) =>
	key.toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeRow = (row: Record<string, unknown>): NormalizedRow =>
	Object.entries(row).reduce<NormalizedRow>((acc, [key, value]) => {
		if (key) {
			acc[normalizeKey(key)] = value;
		}
		return acc;
	}, {});

const getValue = (
	row: NormalizedRow,
	...aliases: string[]
): string | undefined => {
	for (const alias of aliases) {
		const normalized = normalizeKey(alias);
		const value = row[normalized];
		if (value !== undefined && value !== null) {
			return String(value).trim();
		}
	}
	return undefined;
};

const getRequiredValue = (
	row: NormalizedRow,
	fieldName: string,
	...aliases: string[]
): string => {
	const value = getValue(row, fieldName, ...aliases);
	if (!value) {
		throw new Error(`Missing required field "${fieldName}"`);
	}
	return value;
};

const parseList = (value?: string): string[] | undefined => {
	if (!value) return undefined;
	const list = value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	return list.length ? list : undefined;
};

const ensureSheet = (workbook: WorkBook, sheetName: string) => {
	const sheet = workbook.Sheets[sheetName];
	if (!sheet) {
		throw new Error(
			`Missing required sheet "${sheetName}". Please download the latest template.`,
		);
	}
	return sheet;
};

export const isExcelMimeType = (type: string, fileName?: string) => {
	const lowerName = fileName?.toLowerCase() ?? "";
	return (
		EXCEL_MIME_TYPES.has(type) ||
		lowerName.endsWith(".xlsx") ||
		lowerName.endsWith(".xls")
	);
};

export function parseExcelContentPack(buffer: ArrayBuffer): ContentPackData {
	const workbook = read(buffer, { type: "array" });
	for (const sheet of REQUIRED_SHEETS) {
		ensureSheet(workbook, sheet);
	}

	const [packRowRaw] = utils.sheet_to_json<Record<string, unknown>>(
		workbook.Sheets.pack,
		{ defval: "" },
	);

	if (!packRowRaw) {
		throw new Error("The pack sheet must include at least one row.");
	}

	const packRow = normalizeRow(packRowRaw);
	const version = getRequiredValue(packRow, "Version");
	const name = getRequiredValue(packRow, "Name");
	const description = getValue(packRow, "Description");

	const metadata: ContentPackMetadata = {};
	const author = getValue(packRow, "Author", "Metadata Author");
	const tags = parseList(getValue(packRow, "Tags", "Metadata Tags"));
	const dependencies = parseList(
		getValue(packRow, "Dependencies", "Metadata Dependencies"),
	);

	if (author) metadata.author = author;
	if (tags) metadata.tags = tags;
	if (dependencies) metadata.dependencies = dependencies;

	const compatibilityMin = getValue(
		packRow,
		"Compatibility Min Version",
		"Min Version",
	);
	const compatibilityMax = getValue(
		packRow,
		"Compatibility Max Version",
		"Max Version",
	);
	const compatibilityFeatures = parseList(
		getValue(packRow, "Compatibility Features", "Features"),
	);

	if (compatibilityMin || compatibilityMax || compatibilityFeatures) {
		metadata.compatibility = {};
		if (compatibilityMin) metadata.compatibility.minVersion = compatibilityMin;
		if (compatibilityMax) metadata.compatibility.maxVersion = compatibilityMax;
		if (compatibilityFeatures) {
			metadata.compatibility.features = compatibilityFeatures;
		}
	}

	const categoriesSheet = utils.sheet_to_json<Record<string, unknown>>(
		workbook.Sheets.categories,
		{ defval: "" },
	);

	const categories = categoriesSheet.map((rowRaw, index) => {
		const row = normalizeRow(rowRaw);
		return {
			id: getRequiredValue(row, `Category ID (row ${index + 2})`, "ID"),
			name: getRequiredValue(row, `Category Name (row ${index + 2})`, "Name"),
			description: getRequiredValue(
				row,
				`Category Description (row ${index + 2})`,
				"Description",
			),
		};
	});

	const evaluationsSheet = utils.sheet_to_json<Record<string, unknown>>(
		workbook.Sheets.evaluations,
		{ defval: "" },
	);

	const evaluationsMap = new Map<
		string,
		{
			id: string;
			title: string;
			description: string;
			criteria: unknown[];
			questions: unknown[];
		}
	>();

	evaluationsSheet.forEach((rowRaw, index) => {
		const row = normalizeRow(rowRaw);
		const id = getRequiredValue(row, `Evaluation ID (row ${index + 2})`, "ID");
		if (evaluationsMap.has(id)) {
			throw new Error(`Duplicate evaluation ID "${id}"`);
		}

		evaluationsMap.set(id, {
			id,
			title: getRequiredValue(
				row,
				`Evaluation Title (row ${index + 2})`,
				"Title",
			),
			description: getRequiredValue(
				row,
				`Evaluation Description (row ${index + 2})`,
				"Description",
			),
			criteria: [],
			questions: [],
		});
	});

	if (!evaluationsMap.size) {
		throw new Error("At least one evaluation is required.");
	}

	const criteriaSheet = utils.sheet_to_json<Record<string, unknown>>(
		workbook.Sheets.criteria,
		{ defval: "" },
	);

	criteriaSheet.forEach((rowRaw, index) => {
		const row = normalizeRow(rowRaw);
		const evaluationId = getRequiredValue(
			row,
			`Criteria Evaluation ID (row ${index + 2})`,
			"Evaluation ID",
			"Evaluation",
		);
		const evaluation = evaluationsMap.get(evaluationId);
		if (!evaluation) {
			throw new Error(
				`Criteria row ${index + 2} references unknown evaluation "${evaluationId}"`,
			);
		}

		const weightRaw = getRequiredValue(
			row,
			`Criteria Weight (row ${index + 2})`,
			"Weight",
		);
		const weight = Number(weightRaw);
		if (Number.isNaN(weight)) {
			throw new Error(`Criteria weight must be numeric (row ${index + 2})`);
		}

		evaluation.criteria.push({
			id: getRequiredValue(
				row,
				`Criteria ID (row ${index + 2})`,
				"Criteria ID",
				"ID",
			),
			name: getRequiredValue(row, `Criteria Name (row ${index + 2})`, "Name"),
			description: getRequiredValue(
				row,
				`Criteria Description (row ${index + 2})`,
				"Description",
			),
			weight,
		});
	});

	const questionsSheet = utils.sheet_to_json<Record<string, unknown>>(
		workbook.Sheets.questions,
		{ defval: "" },
	);

	questionsSheet.forEach((rowRaw, index) => {
		const row = normalizeRow(rowRaw);
		const evaluationId = getRequiredValue(
			row,
			`Question Evaluation ID (row ${index + 2})`,
			"Evaluation ID",
			"Evaluation",
		);
		const evaluation = evaluationsMap.get(evaluationId);

		if (!evaluation) {
			throw new Error(
				`Question row ${index + 2} references unknown evaluation "${evaluationId}"`,
			);
		}

		const options = parseList(getValue(row, "Options"));
		evaluation.questions.push({
			id: getRequiredValue(
				row,
				`Question ID (row ${index + 2})`,
				"Question ID",
				"ID",
			),
			text: getRequiredValue(row, `Question Text (row ${index + 2})`, "Text"),
			type: getRequiredValue(row, `Question Type (row ${index + 2})`, "Type") as
				| "multiple-choice"
				| "text"
				| "rating",
			...(options ? { options } : {}),
		});
	});

	const contentPack: Record<string, unknown> = {
		version,
		name,
		content: {
			evaluations: Array.from(evaluationsMap.values()),
			categories,
		},
	};

	if (description) {
		contentPack.description = description;
	}

	if (Object.keys(metadata).length > 0) {
		contentPack.metadata = metadata;
	}

	return contentPack as ContentPackData;
}

const BLANK_HEADERS = {
	pack: [
		"Version",
		"Name",
		"Description",
		"Author",
		"Tags",
		"Dependencies",
		"Compatibility Min Version",
		"Compatibility Max Version",
		"Compatibility Features",
	],
	categories: ["ID", "Name", "Description"],
	evaluations: ["ID", "Title", "Description"],
	criteria: ["Evaluation ID", "Criteria ID", "Name", "Weight", "Description"],
	questions: ["Evaluation ID", "Question ID", "Text", "Type", "Options"],
} as const;

const SAMPLE_PACK = {
	version: "1.0.0",
	name: "MatchReady Starter Pack",
	description: "Minimal content pack for testing uploads.",
	author: "InterviewApp",
	tags: ["starter", "demo", "matchready"],
	dependencies: [],
	compatibility: {
		minVersion: "0.1.0",
		maxVersion: "*",
		features: ["content-pack-loader", "analytics-event:content_pack_loaded"],
	},
	categories: [
		{
			id: "clarity",
			name: "Clarity",
			description: "How clearly ideas are communicated.",
		},
		{
			id: "content",
			name: "Content",
			description: "Relevance and accuracy of the response.",
		},
		{
			id: "structure",
			name: "Structure",
			description: "Organization and logical flow.",
		},
		{
			id: "delivery",
			name: "Delivery",
			description: "Confidence and presentation style.",
		},
	],
	evaluations: [
		{
			id: "eval-technical-001",
			title: "JavaScript Fundamentals",
			description: "Assess understanding of JS basics.",
			criteria: [
				{
					id: "clarity",
					name: "Clarity",
					weight: 0.25,
					description: "Clear communication and structure.",
				},
				{
					id: "content",
					name: "Content Accuracy",
					weight: 0.35,
					description: "Technical correctness and relevant details.",
				},
				{
					id: "structure",
					name: "Structure",
					weight: 0.2,
					description: "Logical flow and organization.",
				},
				{
					id: "delivery",
					name: "Delivery",
					weight: 0.2,
					description: "Confidence and concise delivery.",
				},
			],
			questions: [
				{
					id: "q-let-const-var",
					text: "Explain the difference between let, const, and var in JavaScript.",
					type: "text",
				},
			],
		},
		{
			id: "eval-behavioral-001",
			title: "Behavioral: Conflict Resolution",
			description: "Probe for structured STAR responses.",
			criteria: [
				{
					id: "clarity",
					name: "Clarity",
					weight: 0.25,
					description: "Clear articulation of STAR.",
				},
				{
					id: "content",
					name: "Content Depth",
					weight: 0.35,
					description: "Specific actions and outcomes.",
				},
				{
					id: "structure",
					name: "Structure",
					weight: 0.2,
					description: "STAR organization and coherence.",
				},
				{
					id: "delivery",
					name: "Delivery",
					weight: 0.2,
					description: "Confidence and concision.",
				},
			],
			questions: [
				{
					id: "q-conflict-star",
					text: "Tell me about a time you had a conflict and how you resolved it.",
					type: "text",
				},
			],
		},
	],
} as const;

const createHeaderOnlySheet = (headers: readonly string[]) =>
	utils.aoa_to_sheet([Array.from(headers)]);

export function generateContentPackTemplate(): Buffer {
	const workbook = utils.book_new();

	utils.book_append_sheet(
		workbook,
		createHeaderOnlySheet(BLANK_HEADERS.pack),
		"pack",
	);
	utils.book_append_sheet(
		workbook,
		createHeaderOnlySheet(BLANK_HEADERS.categories),
		"categories",
	);
	utils.book_append_sheet(
		workbook,
		createHeaderOnlySheet(BLANK_HEADERS.evaluations),
		"evaluations",
	);
	utils.book_append_sheet(
		workbook,
		createHeaderOnlySheet(BLANK_HEADERS.criteria),
		"criteria",
	);
	utils.book_append_sheet(
		workbook,
		createHeaderOnlySheet(BLANK_HEADERS.questions),
		"questions",
	);

	return write(workbook, { type: "buffer", bookType: "xlsx" });
}

export function generateSampleContentPackWorkbook(): Buffer {
	const workbook = utils.book_new();

	const packSheet = utils.json_to_sheet([
		{
			Version: SAMPLE_PACK.version,
			Name: SAMPLE_PACK.name,
			Description: SAMPLE_PACK.description,
			Author: SAMPLE_PACK.author,
			Tags: SAMPLE_PACK.tags.join(", "),
			Dependencies: SAMPLE_PACK.dependencies.join(", "),
			"Compatibility Min Version": SAMPLE_PACK.compatibility.minVersion,
			"Compatibility Max Version": SAMPLE_PACK.compatibility.maxVersion,
			"Compatibility Features":
				SAMPLE_PACK.compatibility.features?.join(", ") ?? "",
		},
	]);

	const categoriesSheet = utils.json_to_sheet(
		SAMPLE_PACK.categories.map((category) => ({
			ID: category.id,
			Name: category.name,
			Description: category.description,
		})),
	);

	const evaluationsSheet = utils.json_to_sheet(
		SAMPLE_PACK.evaluations.map((evaluation) => ({
			ID: evaluation.id,
			Title: evaluation.title,
			Description: evaluation.description,
		})),
	);

	const criteriaRows = SAMPLE_PACK.evaluations.flatMap((evaluation) =>
		evaluation.criteria.map((criteria) => ({
			"Evaluation ID": evaluation.id,
			"Criteria ID": criteria.id,
			Name: criteria.name,
			Weight: criteria.weight,
			Description: criteria.description,
		})),
	);
	const criteriaSheet = utils.json_to_sheet(criteriaRows);

	const questionRows = SAMPLE_PACK.evaluations.flatMap((evaluation) =>
		evaluation.questions.map((question) => {
			const questionWithOptions = question as { options?: string[] };
			const optionsValue = Array.isArray(questionWithOptions.options)
				? questionWithOptions.options.join(", ")
				: "";

			return {
				"Evaluation ID": evaluation.id,
				"Question ID": question.id,
				Text: question.text,
				Type: question.type,
				Options: optionsValue,
			};
		}),
	);
	const questionsSheet = utils.json_to_sheet(questionRows);

	utils.book_append_sheet(workbook, packSheet, "pack");
	utils.book_append_sheet(workbook, categoriesSheet, "categories");
	utils.book_append_sheet(workbook, evaluationsSheet, "evaluations");
	utils.book_append_sheet(workbook, criteriaSheet, "criteria");
	utils.book_append_sheet(workbook, questionsSheet, "questions");

	return write(workbook, { type: "buffer", bookType: "xlsx" });
}
