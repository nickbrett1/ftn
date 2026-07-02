import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getPayment } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

/**
 * Use native fetch for the OpenAI-compatible chat/completions endpoint.
 * Required env: LLAMA_API_KEY
 * Optional env: LLAMA_API_MODEL (default: llama3.1-8b-instruct)
 */
async function runLlamaClient(event, prompt) {
	const environment = event.platform?.env ?? {};
	const aiBinding = environment.AI;
	// Resolve Cloudflare specific credentials from Doppler/process env or platform env
	const cfToken = env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN ||
	                environment.CLOUDFLARE_API_TOKEN || environment.CF_API_TOKEN;
	const cfAccountId = env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID ||
	                    environment.CLOUDFLARE_ACCOUNT_ID || environment.CF_ACCOUNT_ID;

	// Resolve Llama API specific credentials
	const llamaKey = env.LLAMA_API_KEY || environment.LLAMA_API_KEY || cfToken;
	const model = env.LLAMA_API_MODEL || environment.LLAMA_API_MODEL || 'llama3.1-8b-instruct';
	const baseURL =
		env.LLAMA_API_BASE_URL ||
		env.LLAMA_BASE_URL ||
		env.LLAMA_API_ENDPOINT ||
		environment.LLAMA_API_BASE_URL ||
		environment.LLAMA_BASE_URL ||
		environment.LLAMA_API_ENDPOINT ||
		undefined;

	// Define system and user messages
	const messages = [
		{
			role: 'system',
			content:
				'You are a precise merchant enrichment assistant. Reply in plain text only. Provide a concise summary including likely canonical name, primary website (if known), what the merchant does, and any notable details. No markdown, no code blocks.'
		},
		{ role: 'user', content: prompt }
	];

	// Map default model to Cloudflare equivalent if using Cloudflare
	let resolvedModel = model;
	const isCloudflare = aiBinding || (cfToken && cfAccountId);
	if (isCloudflare && resolvedModel === 'llama3.1-8b-instruct') {
		resolvedModel = '@cf/meta/llama-3.1-8b-instruct';
	}

	try {
		// 1. Native Cloudflare AI Binding
		if (aiBinding && typeof aiBinding.run === 'function') {
			console.log('[AI] Using native Cloudflare Workers AI binding', { model: resolvedModel });
			const resp = await aiBinding.run(resolvedModel, { messages });
			const textRaw = resp.response || resp.result?.response || '';
			const text = String(textRaw).trim();
			console.log('[AI] Response received from native binding', { textLength: text.length });
			return { ok: true, text };
		}

		// 2. Cloudflare External HTTP API Fallback
		if (cfToken && cfAccountId && !baseURL) {
			console.log('[AI] Using Cloudflare external HTTP API', { model: resolvedModel });
			const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${resolvedModel}`;
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${cfToken}`
				},
				body: JSON.stringify({ messages })
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Cloudflare API error (${response.status}): ${errorText}`);
			}

			const resp = await response.json();
			const textRaw = resp.result?.response || resp.response || '';
			const text = String(textRaw).trim();
			console.log('[AI] Response received from external HTTP API', { textLength: text.length });
			return { ok: true, text };
		}

		// 3. Generic OpenAI-compatible API Fallback (Together, Groq, Llama API, etc.)
		if (llamaKey) {
			const cleanBaseURL = (baseURL || 'https://api.llama-api.com').replace(/\/$/, '');
			console.log('[AI] Using generic OpenAI-compatible API', { baseURL: cleanBaseURL, model: resolvedModel });
			const response = await fetch(`${cleanBaseURL}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${llamaKey}`
				},
				body: JSON.stringify({
					model: resolvedModel,
					messages,
					temperature: 0.2,
					top_p: 0.95,
					max_tokens: 256,
					stream: false
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`API error (${response.status}): ${errorText}`);
			}

			const resp = await response.json();

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
				} catch {
					// Ignore parsing errors and return empty string
				}
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
					return parts.length > 0 ? parts.join('\n') : null;
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
			console.log('[AI] Response received from generic API', {
				textLength: text.length,
				preview: text.slice(0, 120),
				choices: Array.isArray(resp?.choices) ? resp.choices.length : 0
			});
			return { ok: true, text };
		}

		return {
			ok: false,
			status: 501,
			error: 'LLAMA API not configured',
			details: 'Set LLAMA_API_KEY (or CLOUDFLARE_API_TOKEN & CLOUDFLARE_ACCOUNT_ID) in the environment.'
		};
	} catch (error) {
		console.error('Llama client call failed:', error);
		return { ok: false, status: 502, error: 'LLama API client error', details: error.message };
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

	const fullStatementText = charge.full_statement_text || '';
	const merchantDetails = charge.merchant_details || '';

	const prompt = `Cleaned merchant name: "${merchantName}"
Merchant details: "${merchantDetails}"
Raw statement text: "${fullStatementText}"

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
				merchant: merchantName,
				merchantDetails,
				fullStatementText
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
			{
				error: 'Empty response from model',
				merchant: merchantName,
				merchantDetails,
				fullStatementText,
				debug
			},
			{ status: 502 }
		);
	}
	const debug =
		event.url?.searchParams?.get('debug') === '1' ? { textLength: text.length } : undefined;
	return json({ merchant: merchantName, merchantDetails, fullStatementText, text, debug });
}
