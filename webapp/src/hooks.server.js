import { getCurrentUser } from '$lib/server/auth.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	event.locals.user = await getCurrentUser(event);
	return resolve(event);
}
