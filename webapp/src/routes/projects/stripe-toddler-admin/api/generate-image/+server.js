import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	try {
		const { prompt, itemName } = await event.request.json();
		const finalPrompt =
			prompt ||
			`High quality studio product image of ${itemName || 'item'}, clean white background, vibrant colors, crisp detail, professional studio product lighting`;

		// 1. Try Cloudflare Workers AI binding if available
		const ai = event.platform?.env?.AI;
		if (ai) {
			try {
				const result = await ai.run('@cf/black-forest-labs/flux-1-schnell', {
					prompt: finalPrompt,
					steps: 4
				});

				let base64 = '';
				if (typeof result === 'string') {
					base64 = result;
				} else if (result?.image) {
					base64 = result.image;
				} else if (
					result &&
					(result instanceof ReadableStream ||
						result instanceof ArrayBuffer ||
						typeof result === 'object')
				) {
					try {
						const buffer =
							result instanceof ArrayBuffer ? result : await new Response(result).arrayBuffer();
						base64 = Buffer.from(buffer).toString('base64');
					} catch (e) {
						console.warn('Could not parse Workers AI response stream:', e);
					}
				}

				if (base64 && base64 !== 'W29iamVjdCBPYmplY3Rd') {
					const dataUrl = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
					return json({ image_url: dataUrl, provider: 'cloudflare-workers-ai' });
				}
			} catch (cfErr) {
				console.warn('Cloudflare Workers AI binding error, falling back:', cfErr);
			}
		}

		// 2. Fallback to AI Image Generator API for local dev & fallback environments
		const encodedPrompt = encodeURIComponent(finalPrompt);
		const aiApiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`;

		const res = await event.fetch(aiApiUrl);
		if (res.ok) {
			const buffer = await res.arrayBuffer();
			const base64 = Buffer.from(buffer).toString('base64');
			const dataUrl = `data:image/jpeg;base64,${base64}`;
			return json({ image_url: dataUrl, provider: 'ai-image-service' });
		}

		return json({ error: 'Failed to generate AI image' }, { status: 500 });
	} catch (err) {
		console.error('Error in generate-image endpoint:', err);
		return json({ error: err.message }, { status: 500 });
	}
}
