import { json } from '@sveltejs/kit';
import { getPayment, updatePayment } from '$lib/server/ccbilling-db.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const { params } = event;
	const charge_id = parseInt(params.id);

	if (isNaN(charge_id)) {
		return json({ error: 'Invalid charge ID' }, { status: 400 });
	}

	try {
		const charge = await getPayment(event, charge_id);
		if (!charge) {
			return json({ error: 'Charge not found' }, { status: 404 });
		}
		return json({ charge });
	} catch (error) {
		console.error('Error getting charge:', error);
		return json({ error: 'Failed to get charge' }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function PUT(event) {
	const { params, request } = event;
	const charge_id = parseInt(params.id);

	if (isNaN(charge_id)) {
		return json({ error: 'Invalid charge ID' }, { status: 400 });
	}

	try {
		const { merchant, amount, allocated_to } = await request.json();

		if (!merchant || amount === undefined || !allocated_to) {
			return json({ error: 'Missing required fields: merchant, amount, allocated_to' }, { status: 400 });
		}

		// Validate allocated_to values
		if (!['Nick', 'Tas', 'Both'].includes(allocated_to)) {
			return json({ error: 'allocated_to must be one of: Nick, Tas, Both' }, { status: 400 });
		}

		// Validate amount is a number
		const parsedAmount = parseFloat(amount);
		if (isNaN(parsedAmount)) {
			return json({ error: 'Amount must be a valid number' }, { status: 400 });
		}

		await updatePayment(event, charge_id, merchant, parsedAmount, allocated_to);
		return json({ success: true });
	} catch (error) {
		console.error('Error updating charge:', error);
		return json({ error: 'Failed to update charge' }, { status: 500 });
	}
}