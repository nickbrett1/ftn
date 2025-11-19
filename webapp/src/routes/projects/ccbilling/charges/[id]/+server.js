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

async function validateAllocation(event, allocated_to) {
	if (allocated_to === undefined) return null; // Not provided, so no validation needed

	const budgets = await listBudgets(event);
	const budgetNames = budgets.map((budget) => budget.name);

	if (allocated_to && !budgetNames.includes(allocated_to)) {
		return json(
			{
				error: `allocated_to must be one of the available budgets: ${budgetNames.join(', ')}`
			},
			{ status: 400 }
		);
	}
	return null;
}

async function prepareUpdateData(event, charge_id, merchant, amount, allocated_to) {
	let updateMerchant = merchant;
	let updateAmount = amount;

	if (allocated_to !== undefined && (merchant === undefined || amount === undefined)) {
		const currentCharge = await getPayment(event, charge_id);
		if (!currentCharge) {
			return { error: json({ error: 'Charge not found' }, { status: 404 }) };
		}
		updateMerchant = merchant === undefined ? currentCharge.merchant : merchant;
		updateAmount = amount === undefined ? currentCharge.amount : Number.parseFloat(amount);
	} else {
		if (merchant === undefined || amount === undefined) {
			return {
				error: json({ error: 'Missing required fields: merchant, amount' }, { status: 400 })
			};
		}
		updateAmount = Number.parseFloat(amount);
		if (Number.isNaN(updateAmount)) {
			return { error: json({ error: 'Amount must be a valid number' }, { status: 400 }) };
		}
	}
	return { updateMerchant, updateAmount };
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
		const { merchant, amount, allocated_to } = await request.json();

		const allocationError = await validateAllocation(event, allocated_to);
		if (allocationError) return allocationError;

		const { updateMerchant, updateAmount, error } = await prepareUpdateData(
			event,
			charge_id,
			merchant,
			amount,
			allocated_to
		);
		if (error) return error;

		await updatePayment(event, charge_id, updateMerchant, updateAmount, allocated_to);
		return json({ success: true });
	} catch (error) {
		console.error('Error updating charge:', error);
		return json({ error: 'Failed to update charge' }, { status: 500 });
	}
}
