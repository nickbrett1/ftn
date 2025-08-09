import { json } from '@sveltejs/kit';
import {
	LLAMA_API_KEY as STATIC_LLAMA_API_KEY,
	LLAMA_API_MODEL as STATIC_LLAMA_API_MODEL
} from '$env/static/private';
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
	const model =
		STATIC_LLAMA_API_MODEL || env.LLAMA_API_MODEL || 'llama3.1-8b-instruct';
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
				// Common OpenAI-style response
				const choices = response?.choices;
				if (Array.isArray(choices) && choices.length > 0) {
					const firstChoice = choices[0];
					const choiceMessage = firstChoice?.message;
					const choiceContent = choiceMessage?.content ?? firstChoice?.content;
					if (typeof choiceContent === 'string') return choiceContent;
					if (Array.isArray(choiceContent)) {
						const parts = choiceContent
							.map((part) => (typeof part === 'string' ? part : part?.text || part?.content || ''))
							.filter(Boolean);
						if (parts.length) return parts.join('\n');
					}
					if (choiceContent && typeof choiceContent === 'object') {
						if (typeof choiceContent.text === 'string') return choiceContent.text;
						if (typeof choiceContent.content === 'string') return choiceContent.content;
					}
					// Join all choices if they each have small fragments
					const joined = choices
						.map((c) => {
							const cc = c?.message?.content ?? c?.content;
							if (typeof cc === 'string') return cc;
							if (Array.isArray(cc)) {
								return cc
									.map((part) => (typeof part === 'string' ? part : part?.text || part?.content || ''))
									.filter(Boolean)
									.join('\n');
							}
							if (cc && typeof cc === 'object') {
								if (typeof cc.text === 'string') return cc.text;
								if (typeof cc.content === 'string') return cc.content;
							}
							return '';
						})
						.filter(Boolean)
						.join('\n')
						.trim();
					if (joined) return joined;
				}

				// Some libraries return top-level message or completion
				const topMessage = response?.message;
				if (topMessage && typeof topMessage?.content === 'string') return topMessage.content;
				if (topMessage && Array.isArray(topMessage?.content)) {
					const parts = topMessage.content
						.map((part) => (typeof part === 'string' ? part : part?.text || part?.content || ''))
						.filter(Boolean);
					if (parts.length) return parts.join('\n');
				}
				if (topMessage && topMessage.content && typeof topMessage.content === 'object') {
					if (typeof topMessage.content.text === 'string') return topMessage.content.text;
					if (typeof topMessage.content.content === 'string') return topMessage.content.content;
				}

				// Library example shows top-level completion_message
				const cm = response?.completion_message;
				if (typeof cm === 'string') return cm;
				if (cm && typeof cm === 'object') {
					if (typeof cm.content === 'string') return cm.content;
					if (Array.isArray(cm.content)) {
						const parts = cm.content
							.map((part) => (typeof part === 'string' ? part : part?.text || part?.content || ''))
							.filter(Boolean);
						if (parts.length) return parts.join('\n');
					}
					if (cm.content && typeof cm.content === 'object') {
						if (typeof cm.content.text === 'string') return cm.content.text;
						if (typeof cm.content.content === 'string') return cm.content.content;
					}
				}

				if (typeof response?.content === 'string') return response.content;
				if (typeof response?.text === 'string') return response.text;
				if (typeof response?.output_text === 'string') return response.output_text;
				if (typeof response?.completion_message?.content?.text === 'string')
					return response.completion_message.content.text;
			} catch {}
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
