import { capabilities } from '$lib/config/capabilities';
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
	return json(capabilities);
}
