import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	try {
		const { prompt, itemName } = await event.request.json();
		const finalPrompt =
			prompt ||
			`High quality 3D studio product image of a toddler toy: ${itemName || 'Toy'}, clean white background, vibrant colors, photorealistic product lighting`;

		// 1. Try Cloudflare Workers AI binding if available
		const ai = event.platform?.env?.AI;
		if (ai) {
			try {
				const stream = await ai.run('@cf/bytedance/stable-diffusion-xl-lightning', {
					prompt: finalPrompt
				});
				const buffer = await new Response(stream).arrayBuffer();
				const base64 = Buffer.from(buffer).toString('base64');
				const dataUrl = `data:image/jpeg;base64,${base64}`;
				return json({ image_url: dataUrl, provider: 'cloudflare-workers-ai' });
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
