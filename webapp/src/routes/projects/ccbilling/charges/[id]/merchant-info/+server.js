import { json } from '@sveltejs/kit';
import { getPayment } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

/**
 * Call a LLama-compatible Chat Completions API directly using env configuration.
 * Expects the provider to support the OpenAI-compatible schema.
 * Required env: LLAMA_API_KEY, LLAMA_API_URL
 * Optional env: LLAMA_API_MODEL (default: meta-llama/llama-3.1-8b-instruct)
 */
async function runLlamaApi(event, prompt) {
	const env = event.platform?.env ?? {};
	const apiKey = env.LLAMA_API_KEY;
	const apiUrl = env.LLAMA_API_URL;
	const model = env.LLAMA_API_MODEL || 'meta-llama/llama-3.1-8b-instruct';

	if (!apiKey || !apiUrl) {
		return {
			ok: false,
			status: 501,
			error: 'LLAMA API not configured',
			details: 'Set LLAMA_API_KEY and LLAMA_API_URL in the environment.'
		};
	}

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model,
				messages: [
					{ role: 'system', content: 'You are a precise merchant enrichment agent. Always answer in strict JSON.' },
					{ role: 'user', content: prompt }
				]
			})
		});

		if (!response.ok) {
			const text = await response.text().catch(() => '');
			return { ok: false, status: response.status, error: `LLama API error: ${response.status}`, details: text };
		}

		const data = await response.json();
		// Normalize common response shapes
		// OpenAI-style
		const content = data?.choices?.[0]?.message?.content
			|| data?.choices?.[0]?.text
			|| data?.response
			|| data?.output_text
			|| '';
		return { ok: true, text: String(content) };
	} catch (error) {
		console.error('LLama API call failed:', error);
		return { ok: false, status: 502, error: 'LLama API network/parse error' };
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

	const aiResult = await runLlamaApi(event, prompt);
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
		canonical_name: typeof parsed.canonical_name === 'string' ? parsed.canonical_name : merchantName,
		website: typeof parsed.website === 'string' ? parsed.website : '',
		address: typeof parsed.address === 'string' ? parsed.address : '',
		description: typeof parsed.description === 'string' ? parsed.description : '',
		confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
		sources: Array.isArray(parsed.sources) ? parsed.sources.filter((s) => typeof s === 'string') : []
	};

	return json({ merchant: merchantName, info: result });
}