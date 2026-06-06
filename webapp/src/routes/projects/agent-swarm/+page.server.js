import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

const HTML_TEMPORARY_REDIRECT = 307;

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		const redirectPath = encodeURIComponent(event.url.pathname);
		throw redirect(HTML_TEMPORARY_REDIRECT, `/notauthorised?redirectTo=${redirectPath}`);
	}
	return {};
}
