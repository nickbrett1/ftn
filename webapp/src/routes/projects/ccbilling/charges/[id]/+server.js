import { json } from '@sveltejs/kit';
import { getPayment, updatePayment, listBudgets } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

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
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const { params, request } = event;
	const charge_id = parseInt(params.id);

	if (isNaN(charge_id)) {
		return json({ error: 'Invalid charge ID' }, { status: 400 });
	}

	try {
		const { merchant, amount, allocated_to } = await request.json();

		// Validate allocated_to values against actual budgets (allow null for unallocated)
		const budgets = await listBudgets(event);
		const budgetNames = budgets.map((budget) => budget.name);

		// Validate that allocated_to is either null or a valid budget name
		if (allocated_to && !budgetNames.includes(allocated_to)) {
			return json(
				{
					error: `allocated_to must be one of the available budgets: ${budgetNames.join(', ')}`
				},
				{ status: 400 }
			);
		}

		// If we're only updating allocation, get the current charge data
		if (allocated_to !== undefined && (merchant === undefined || amount === undefined)) {
			const currentCharge = await getPayment(event, charge_id);
			if (!currentCharge) {
				return json({ error: 'Charge not found' }, { status: 404 });
			}

			// Use current values for fields not provided
			const updateMerchant = merchant !== undefined ? merchant : currentCharge.merchant;
			const updateAmount = amount !== undefined ? parseFloat(amount) : currentCharge.amount;

			await updatePayment(event, charge_id, updateMerchant, updateAmount, allocated_to);
		} else {
			// Full update - validate all required fields
			if (!merchant || amount === undefined) {
				return json({ error: 'Missing required fields: merchant, amount' }, { status: 400 });
			}

			// Validate amount is a number
			const parsedAmount = parseFloat(amount);
			if (isNaN(parsedAmount)) {
				return json({ error: 'Amount must be a valid number' }, { status: 400 });
			}

			await updatePayment(event, charge_id, merchant, parsedAmount, allocated_to);
		}
		return json({ success: true });
	} catch (error) {
		console.error('Error updating charge:', error);
		return json({ error: 'Failed to update charge' }, { status: 500 });
	}
}
