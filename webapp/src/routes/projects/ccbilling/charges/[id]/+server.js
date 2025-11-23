import { json } from '@sveltejs/kit';
import { getPayment, updatePayment, listBudgets } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const { params } = event;
	const charge_id = Number.parseInt(params.id);

	if (Number.isNaN(charge_id)) {
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

async function validateAllocatedTo(event, allocated_to) {
	if (!allocated_to) return null;

	const budgets = await listBudgets(event);
	const budgetNames = budgets.map((budget) => budget.name);

	if (!budgetNames.includes(allocated_to)) {
		return json(
			{
				error: `allocated_to must be one of the available budgets: ${budgetNames.join(', ')}`
			},
			{ status: 400 }
		);
	}
	return null;
}

async function handlePartialUpdate(event, charge_id, { merchant, amount, allocated_to }) {
	const currentCharge = await getPayment(event, charge_id);
	if (!currentCharge) {
		return json({ error: 'Charge not found' }, { status: 404 });
	}

	// Use current values for fields not provided
	const updateMerchant = merchant === undefined ? currentCharge.merchant : merchant;
	const updateAmount = amount === undefined ? currentCharge.amount : Number.parseFloat(amount);

	await updatePayment(event, charge_id, updateMerchant, updateAmount, allocated_to);
	return json({ success: true });
}

async function handleFullUpdate(event, charge_id, { merchant, amount, allocated_to }) {
	// Full update - validate all required fields
	if (!merchant || amount === undefined) {
		return json({ error: 'Missing required fields: merchant, amount' }, { status: 400 });
	}

	// Validate amount is a number
	const parsedAmount = Number.parseFloat(amount);
	if (Number.isNaN(parsedAmount)) {
		return json({ error: 'Amount must be a valid number' }, { status: 400 });
	}

	await updatePayment(event, charge_id, merchant, parsedAmount, allocated_to);
	return json({ success: true });
}

/** @type {import('./$types').RequestHandler} */
export async function PUT(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const { params, request } = event;
	const charge_id = Number.parseInt(params.id);

	if (Number.isNaN(charge_id)) {
		return json({ error: 'Invalid charge ID' }, { status: 400 });
	}

	try {
		const data = await request.json();
		const { merchant, amount, allocated_to } = data;

		const budgetError = await validateAllocatedTo(event, allocated_to);
		if (budgetError) return budgetError;

		// If we're only updating allocation, get the current charge data
		const isPartialUpdate =
			allocated_to !== undefined && (merchant === undefined || amount === undefined);

		if (isPartialUpdate) {
			return await handlePartialUpdate(event, charge_id, data);
		}

		return await handleFullUpdate(event, charge_id, data);
	} catch (error) {
		console.error('Error updating charge:', error);
		return json({ error: 'Failed to update charge' }, { status: 500 });
	}
}
