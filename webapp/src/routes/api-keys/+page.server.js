import { requireUser } from '$lib/server/auth.js';

export async function load(event) {
	// Require authentication, but don't perform the action here.
	// This will just handle redirecting out if they are not logged in.
	await requireUser(event);

	// Data loading happens client-side so it can handle initialization logic easily
	return {};
}
