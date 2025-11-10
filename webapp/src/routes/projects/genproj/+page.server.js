// webapp/src/routes/projects/genproj/+page.server.js

import { redirect } from '@sveltejs/kit';
import { getCurrentUser } from '$lib/server/auth';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
    const user = await getCurrentUser({ locals }); // Assuming getCurrentUser can take locals directly

    return {
        isAuthenticated: !!user,
        user: user ? { id: user.id, name: user.name, email: user.email } : null
    };
}