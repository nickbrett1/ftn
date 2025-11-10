import {
	listBillingCycles,
	createBillingCycle,
	deleteBillingCycle
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const cycles = await listBillingCycles(event);
	return Response.json(cycles, {
		headers: { 'Content-Type': 'application/json' }
	});
}

export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const data = await event.request.json();
	const { start_date, end_date } = data;
	if (!start_date || !end_date) {
		return Response.json(
			{ error: 'Missing start_date or end_date' },
			{
				status: 400
			}
		);
	}
	await createBillingCycle(event, start_date, end_date);
	return Response.json({ success: true });
}

export async function DELETE(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const data = await event.request.json();
	const { id } = data;
	if (!id) {
		return Response.json({ error: 'Missing id' }, { status: 400 });
	}
	await deleteBillingCycle(event, id);
	return Response.json({ success: true });
}
