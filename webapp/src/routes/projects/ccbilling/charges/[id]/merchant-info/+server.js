import { json } from '@sveltejs/kit';
import { getPayment } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

/**
 * Attempt to run a prompt against Cloudflare Workers AI if bound.
 * Returns a string response (the model's text) or throws on error.
 */
async function runWorkersAiIfAvailable(event, prompt) {
	const aiBinding = event.platform?.env?.AI;
	if (!aiBinding) {
		return null; // Not configured
	}
	try {
		// Prefer chat-style with messages when available
		const model = '@cf/meta/llama-3.1-8b-instruct';
		let result;
		try {
			result = await aiBinding.run(model, {
				messages: [
					{ role: 'system', content: 'You are a precise merchant enrichment agent. Always answer in strict JSON.' },
					{ role: 'user', content: prompt }
				]
			});
		} catch (e) {
			// Some bindings prefer a simple prompt key
			result = await aiBinding.run(model, { prompt });
		}

		// Cloudflare AI may return different shapes; normalize to string
		if (typeof result === 'string') return result;
		if (result?.response && typeof result.response === 'string') return result.response;
		if (result?.output_text && typeof result.output_text === 'string') return result.output_text;
		if (Array.isArray(result?.messages)) {
			const last = result.messages[result.messages.length - 1];
			if (last?.content && typeof last.content === 'string') return last.content;
		}
		return String(result ?? '');
	} catch (error) {
		console.error('Workers AI call failed:', error);
		throw new Error('AI provider error');
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

	const prompt = `Given the merchant string: "${merchantName}"\n
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

	// Try Workers AI first
	let aiText = await runWorkersAiIfAvailable(event, prompt);

	if (!aiText) {
		// No AI configured
		return json(
			{
				error: 'AI provider not configured',
				details:
					'Workers AI binding `AI` is not configured. Configure Cloudflare Workers AI or add another provider.',
				merchant: merchantName
			},
			{ status: 501 }
		);
	}

	// Attempt to parse JSON from the model response
	let parsed;
	try {
		// Trim and extract JSON substring if model wrapped content
		const start = aiText.indexOf('{');
		const end = aiText.lastIndexOf('}');
		const jsonSlice = start >= 0 && end >= 0 ? aiText.slice(start, end + 1) : aiText;
		parsed = JSON.parse(jsonSlice);
	} catch (e) {
		return json(
			{
				error: 'Failed to parse AI response as JSON',
				merchant: merchantName,
				raw: aiText
			},
			{ status: 502 }
		);
	}

	// Basic normalization
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