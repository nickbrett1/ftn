// webapp/src/routes/projects/genproj/+page.server.js


import { getCurrentUser } from '$lib/server/auth';
import { capabilities } from '$lib/config/capabilities';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	const user = await getCurrentUser({ locals }); // Assuming getCurrentUser can take locals directly

	return {
		isAuthenticated: !!user,
		user: user ? { id: user.id, name: user.email, email: user.email } : null,
		capabilities: capabilities
	};
}
