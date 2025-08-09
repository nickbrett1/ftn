import LlamaAPIClient from 'llama-api-client';

const apiKey = process.env.LLAMA_API_KEY;
const baseURL =
	process.env.LLAMA_API_BASE_URL ||
	process.env.LLAMA_BASE_URL ||
	process.env.LLAMA_API_ENDPOINT;
const model = process.env.LLAMA_API_MODEL || 'llama3.1-8b-instruct';

if (!apiKey) {
	console.error('[TEST-LLAMA] Missing LLAMA_API_KEY');
	process.exit(2);
}

const client = new LlamaAPIClient(baseURL ? { apiKey, baseURL } : { apiKey });

const payload = {
	model,
	messages: [
		{ role: 'system', content: 'You are a simple test assistant. Reply in plain text only.' },
		{ role: 'user', content: 'Respond with the single word: READY' }
	],
	temperature: 0.2,
	top_p: 0.95,
	max_tokens: 32,
	stream: false
};

function extractText(response) {
	try {
		const choices = response?.choices;
		if (Array.isArray(choices) && choices.length > 0) {
			const first = choices[0];
			const content = first?.message?.content ?? first?.content;
			if (typeof content === 'string') return content;
			if (Array.isArray(content)) {
				return content
					.map((p) => (typeof p === 'string' ? p : p?.text || p?.content || ''))
					.filter(Boolean)
					.join('\n');
			}
		}
		const cm = response?.completion_message;
		if (typeof cm === 'string') return cm;
		if (cm && typeof cm === 'object') {
			if (typeof cm.content === 'string') return cm.content;
			if (Array.isArray(cm.content)) {
				return cm.content
					.map((p) => (typeof p === 'string' ? p : p?.text || p?.content || ''))
					.filter(Boolean)
					.join('\n');
			}
		}
		if (typeof response?.content === 'string') return response.content;
		if (typeof response?.text === 'string') return response.text;
		if (typeof response?.output_text === 'string') return response.output_text;
	} catch {}
	return '';
}

try {
	const resp = await client.chat.completions.create(payload);
	const text = String(extractText(resp) || '').trim();
	console.log(
		JSON.stringify({ ok: true, model, textLength: text.length, preview: text.slice(0, 80) })
	);
	process.exit(0);
} catch (err) {
	console.error('[TEST-LLAMA] Error', { name: err?.name, message: err?.message, status: err?.status });
	process.exit(1);
}