import {
	addBudgetMerchant,
	removeBudgetMerchant,
	getBudgetMerchants
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
		return { error: new Response(JSON.stringify({ error: 'Missing or invalid budget id' }), { status: 400 }) };
	}
	return { id };
}

async function validateMerchant(event) {
	const data = await event.request.json();
	const { merchant } = data;
	if (!merchant || !merchant.trim()) {
		return { error: new Response(JSON.stringify({ error: 'Missing merchant name' }), { status: 400 }) };
	}
	return { merchant: merchant.trim() };
}

function createJsonResponse(data, options = {}) {
	return new Response(JSON.stringify(data), {
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

	await addBudgetMerchant(event, id, merchant);
	return createJsonResponse({ success: true });
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
