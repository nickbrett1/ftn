import {
	addBudgetMerchant,
	removeBudgetMerchant,
	getBudgetMerchants,
	getBudgetByMerchant
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

// Helper functions to eliminate duplication
async function validateAuth(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	return null;
}

function validateBudgetId(event) {
	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return {
			error: Response.json(
				{ error: 'Missing or invalid budget id' },
				{
					status: 400
				}
			)
		};
	}
	return { id };
}

async function validateMerchant(event) {
	const data = await event.request.json();
	const { merchant } = data;
	if (!merchant?.trim()) {
		return {
			error: Response.json({ error: 'Missing merchant name' }, { status: 400 })
		};
	}
	return { merchant: merchant.trim() };
}

function createJsonResponse(data, options = {}) {
	return Response.json(data, {
		headers: { 'Content-Type': 'application/json' },
		...options
	});
}

export async function GET(event) {
	const authError = await validateAuth(event);
	if (authError) return authError;

	const { id, error: idError } = validateBudgetId(event);
	if (idError) return idError;

	const merchants = await getBudgetMerchants(event, id);
	return createJsonResponse(merchants);
}

export async function POST(event) {
	const authError = await validateAuth(event);
	if (authError) return authError;

	const { id, error: idError } = validateBudgetId(event);
	if (idError) return idError;

	const { merchant, error: merchantError } = await validateMerchant(event);
	if (merchantError) return merchantError;

	// Prevent duplicates globally across budgets
	const existingBudget = await getBudgetByMerchant(event, merchant);
	if (existingBudget) {
		return createJsonResponse(
			{ error: `Merchant is already assigned to budget "${existingBudget.name}"` },
			{ status: 400 }
		);
	}

	try {
		await addBudgetMerchant(event, id, merchant);
		return createJsonResponse({ success: true });
	} catch (error) {
		// Handle unique constraint violation
		if (error.message?.includes('UNIQUE constraint failed')) {
			return createJsonResponse(
				{ error: 'This merchant is already assigned to this budget' },
				{ status: 400 }
			);
		}
		// Re-throw other errors
		throw error;
	}
}

export async function DELETE(event) {
	const authError = await validateAuth(event);
	if (authError) return authError;

	const { id, error: idError } = validateBudgetId(event);
	if (idError) return idError;

	const { merchant, error: merchantError } = await validateMerchant(event);
	if (merchantError) return merchantError;

	await removeBudgetMerchant(event, id, merchant);
	return createJsonResponse({ success: true });
}
