import { redirect } from '@sveltejs/kit';

export async function load({ fetch, params }) {
	const id = params.id;
	const res = await fetch(`/projects/ccbilling/cards/${id}`);
	if (!res.ok) {
		throw redirect(302, '/projects/ccbilling/cards');
	}
	const card = await res.json();
	return { card };
}