import { json } from '@sveltejs/kit';
// Try to import environment variables, with fallbacks for build time
let STATIC_LLAMA_API_MODEL;
try {
	const env = await import('$env/static/private');
	STATIC_LLAMA_API_MODEL = env.LLAMA_API_MODEL;
} catch (error) {
	// During build time, these might not be available
	// Set default value to prevent undefined errors
	// This catch block intentionally handles build-time compatibility by setting fallback values
	console.warn(
		'[LLAMA] Environment variable not available at build time, using default model',
		error instanceof Error ? error.message : String(error)
	);
	STATIC_LLAMA_API_MODEL = process.env?.LLAMA_API_MODEL || 'llama3.1-8b-instruct';
}
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
	const model = STATIC_LLAMA_API_MODEL || env.LLAMA_API_MODEL || 'llama3.1-8b-instruct';
	const baseURL =
		env.LLAMA_API_BASE_URL || env.LLAMA_BASE_URL || env.LLAMA_API_ENDPOINT || undefined;

	// Debug (no secrets):
	console.log('[LLAMA] Config', {
		hasApiKey: Boolean(apiKey),
		model,
		hasBaseURL: Boolean(baseURL)
	});

	if (!apiKey) {
		return {
			ok: false,
			status: 501,
			error: 'LLAMA API not configured',
			details: 'Set LLAMA_API_KEY in the environment.'
		};
	}

	try {
		// Some deployments require a custom base URL; support optional override
		const client = new LlamaAPIClient(baseURL ? { apiKey, baseURL } : { apiKey });
		const requestPayload = {
			model,
			messages: [
				{
					role: 'system',
					content:
						'You are a precise merchant enrichment assistant. Reply in plain text only. Provide a concise summary including likely canonical name, primary website (if known), what the merchant does, and any notable details. No markdown, no code blocks.'
				},
				{ role: 'user', content: prompt }
			],
			temperature: 0.2,
			top_p: 0.95,
			max_tokens: 256,
			stream: false
		};
		console.log('[LLAMA] Request', {
			model: requestPayload.model,
			messagesCount: requestPayload.messages.length,
			promptChars: requestPayload.messages[1]?.content?.length || 0
		});
		const resp = await client.chat.completions.create(requestPayload);

		function extractMessageText(response) {
			try {
				// Extract text from choices array (OpenAI-style)
				const choicesText = extractFromChoices(response?.choices);
				if (choicesText) return choicesText;

				// Extract from top-level message
				const messageText = extractFromMessage(response?.message);
				if (messageText) return messageText;

				// Extract from completion_message
				const completionText = extractFromCompletionMessage(response?.completion_message);
				if (completionText) return completionText;

				// Fallback to direct properties
				return extractFromDirectProperties(response);
			} catch {}
			return '';
		}

		function extractFromChoices(choices) {
			if (!Array.isArray(choices) || choices.length === 0) return null;

			const firstChoice = choices[0];
			const choiceText =
				extractFromMessage(firstChoice?.message) || extractFromMessage(firstChoice);
			if (choiceText) return choiceText;

			// Join all choices if they have fragments
			const joined = choices
				.map((choice) => extractFromMessage(choice?.message) || extractFromMessage(choice))
				.filter(Boolean)
				.join('\n')
				.trim();
			return joined || null;
		}

		function extractFromMessage(message) {
			if (!message) return null;

			// Direct string content
			if (typeof message.content === 'string') return message.content;

			// Array of content parts
			if (Array.isArray(message.content)) {
				const parts = message.content.map((part) => extractFromPart(part)).filter(Boolean);
				return parts.length ? parts.join('\n') : null;
			}

			// Object with text/content
			if (message.content && typeof message.content === 'object') {
				return extractFromPart(message.content);
			}

			return null;
		}

		function extractFromCompletionMessage(completionMessage) {
			if (!completionMessage) return null;

			if (typeof completionMessage === 'string') return completionMessage;
			if (typeof completionMessage === 'object') {
				return extractFromMessage(completionMessage);
			}

			return null;
		}

		function extractFromDirectProperties(response) {
			if (typeof response?.content === 'string') return response.content;
			if (typeof response?.text === 'string') return response.text;
			if (typeof response?.output_text === 'string') return response.output_text;
			if (typeof response?.completion_message?.content?.text === 'string') {
				return response.completion_message.content.text;
			}
			return null;
		}

		function extractFromPart(part) {
			if (typeof part === 'string') return part;
			if (typeof part?.text === 'string') return part.text;
			if (typeof part?.content === 'string') return part.content;
			return '';
		}

		const textRaw = extractMessageText(resp) || '';
		const text = String(textRaw).trim();
		console.log('[LLAMA] Response', {
			textLength: text.length,
			preview: text.slice(0, 120),
			choices: Array.isArray(resp?.choices) ? resp.choices.length : 0
		});
		return { ok: true, text };
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

	const prompt = `Merchant string: "${merchantName}"

Provide a concise plain-text summary including:
- Likely canonical/official name
- Primary website URL (if known)
- Address or HQ (if known)
- What the merchant does (1–2 sentences)
- Any notable details`;

	console.log('[LLAMA] Starting merchant info fetch');
	const aiResult = await runLlamaClient(event, prompt);
	if (!aiResult.ok) {
		console.warn('[LLAMA] AI error', { status: aiResult.status, error: aiResult.error });
		return json(
			{
				error: aiResult.error || 'Failed to fetch merchant info',
				details: aiResult.details,
				merchant: merchantName
			},
			{ status: aiResult.status || 502 }
		);
	}

	// Return raw text so UI can render directly
	const text = String(aiResult.text || '').trim();
	if (!text) {
		console.warn('[LLAMA] Empty text response');
		const debug =
			event.url?.searchParams?.get('debug') === '1' ? { reason: 'empty-text' } : undefined;
		return json(
			{ error: 'Empty response from model', merchant: merchantName, debug },
			{ status: 502 }
		);
	}
	const debug =
		event.url?.searchParams?.get('debug') === '1' ? { textLength: text.length } : undefined;
	return json({ merchant: merchantName, text, debug });
}
