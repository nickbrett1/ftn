import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { requireUser } from '$lib/server/require-user.js';

const HTML_TEMPORARY_REDIRECT = 307;

export async function load({ cookies, platform }) {
	if (env.LIGHTHOUSE_ENABLED === 'true') {
		// Skip auth for staging so we can perf test the page
		return {};
	}

	const event = { cookies, platform };
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/notauthorised');
	}

	return {};
}
