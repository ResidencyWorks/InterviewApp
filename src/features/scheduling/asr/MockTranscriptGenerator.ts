interface MockInput {
	audioUrl: string;
	format: string;
}

export function generateMockTranscript(input: MockInput): string {
	const { audioUrl, format } = input;
	const seed = hashString(audioUrl + format);
	const samples = MOCK_SENTENCES;
	const a = samples[seed % samples.length];
	const b = samples[(seed >> 3) % samples.length];
	return `${a} ${b}`;
}

function hashString(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
	}
	return h >>> 0;
}

const MOCK_SENTENCES: string[] = [
	"The patient presents with stable vital signs and no acute distress.",
	"I will begin with an open-ended question to understand the chief concern.",
	"Communication should remain empathetic and free of medical jargon.",
	"A structured approach will ensure a complete differential diagnosis.",
	"We will confirm understanding using teach-back to ensure clarity.",
	"Safety netting advice will be given before discharge and follow-up.",
	"Professionalism requires clear documentation and timely escalation.",
];
