import { json } from '@sveltejs/kit';
import { getPayment } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';
import LlamaAPIClient from 'llama-api-client';

/**
 * Use the official llama-api-client. Base URL is handled by the client.
 * Required env: LLAMA_API_KEY
 * Optional env: LLAMA_API_MODEL (default: llama3.1-8b-instruct)
 */
async function runLlamaClient(event, prompt) {
	const env = event.platform?.env ?? {};
	const apiKey = env.LLAMA_API_KEY;
	const model = env.LLAMA_API_MODEL || 'llama3.1-8b-instruct';

	if (!apiKey) {
		return {
			ok: false,
			status: 501,
			error: 'LLAMA API not configured',
			details: 'Set LLAMA_API_KEY in the environment.'
		};
	}

	try {
		const client = new LlamaAPIClient({ apiKey });
		const resp = await client.chat.completions.create({
			model,
			messages: [
				{
					role: 'system',
					content: 'You are a precise merchant enrichment agent. Always answer in strict JSON.'
				},
				{ role: 'user', content: prompt }
			]
		});
		const text = resp?.choices?.[0]?.message?.content || '';
		return { ok: true, text: String(text) };
	} catch (error) {
		console.error('Llama client call failed:', error);
		return { ok: false, status: 502, error: 'LLama API client error' };
	}
}

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const chargeId = Number.parseInt(event.params.id);
	if (Number.isNaN(chargeId)) {
		return json({ error: 'Invalid charge ID' }, { status: 400 });
	}

	const charge = await getPayment(event, chargeId);
	if (!charge) {
		return json({ error: 'Charge not found' }, { status: 404 });
	}

	const merchantName = charge.merchant;
	if (!merchantName) {
		return json({ error: 'Charge has no merchant name' }, { status: 400 });
	}

	const prompt = `Given the merchant string: "${merchantName}"

Return a STRICT JSON object with keys: 
- canonical_name: best known official or common merchant name
- website: the primary website URL (include protocol), or empty string if unknown
- address: HQ or primary business address (single line), or empty string if unknown
- description: concise one-sentence description (max 40 words)
- confidence: number between 0 and 1 reflecting match confidence
- sources: array of up to 3 useful URLs (official site, Wikipedia, business listings). Use empty array if none.

Rules:
- Output ONLY JSON. No markdown, no commentary.
- If multiple possibilities exist, pick the best guess with honest confidence.
`;

	const aiResult = await runLlamaClient(event, prompt);
	if (!aiResult.ok) {
		return json(
			{
				error: aiResult.error || 'Failed to fetch merchant info',
				details: aiResult.details,
				merchant: merchantName
			},
			{ status: aiResult.status || 502 }
		);
	}

	let parsed;
	try {
		const aiText = aiResult.text || '';
		const start = aiText.indexOf('{');
		const end = aiText.lastIndexOf('}');
		const jsonSlice = start >= 0 && end >= 0 ? aiText.slice(start, end + 1) : aiText;
		parsed = JSON.parse(jsonSlice);
	} catch (e) {
		return json(
			{
				error: 'Failed to parse AI response as JSON',
				merchant: merchantName
			},
			{ status: 502 }
		);
	}

	const result = {
		canonical_name:
			typeof parsed.canonical_name === 'string' ? parsed.canonical_name : merchantName,
		website: typeof parsed.website === 'string' ? parsed.website : '',
		address: typeof parsed.address === 'string' ? parsed.address : '',
		description: typeof parsed.description === 'string' ? parsed.description : '',
		confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
		sources: Array.isArray(parsed.sources)
			? parsed.sources.filter((s) => typeof s === 'string')
			: []
	};

	return json({ merchant: merchantName, info: result });
}
