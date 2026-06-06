import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { requireUser } from '$lib/server/require-user.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		return authResult;
	}

	if (!env.AGENT_SWARM_SECRET) {
		return json({ error: 'AGENT_SWARM_SECRET is not configured on the server.' }, { status: 500 });
	}

	const expiry = Date.now() + 5 * 60 * 1000; // Token valid for 5 minutes
	const encoder = new TextEncoder();

	// Import the secret key
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(env.AGENT_SWARM_SECRET),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);

	// Sign the expiry timestamp
	const signatureBuffer = await crypto.subtle.sign(
		'HMAC',
		key,
		encoder.encode(String(expiry))
	);

	// Convert signature to a hex string
	const signature = Array.from(new Uint8Array(signatureBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return json({ expiry, signature });
}
