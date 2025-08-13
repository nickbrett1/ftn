import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';
import {
	addBudgetMerchant,
	removeBudgetMerchant,
	getBudgetByMerchant,
	listBudgets
} from '$lib/server/ccbilling-db.js';

export async function PUT(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		return authResult;
	}

	try {
		const { merchant, newBudgetName } = await event.request.json();

		if (!merchant || !newBudgetName) {
			return json({ error: 'Missing required fields: merchant and newBudgetName' }, { status: 400 });
		}

		// Get the budget ID for the new budget name
		const budgets = await listBudgets(event);
		const newBudget = budgets.find(b => b.name === newBudgetName);
		
		if (!newBudget) {
			return json({ error: 'Budget not found' }, { status: 404 });
		}

		// Check if there's an existing auto-association for this merchant
		const existingBudget = await getBudgetByMerchant(event, merchant);
		
		if (existingBudget) {
			// Remove the existing auto-association
			await removeBudgetMerchant(event, existingBudget.id, merchant);
		}

		// Add the new auto-association
		await addBudgetMerchant(event, newBudget.id, merchant);

		return json({ success: true, message: 'Auto-association updated successfully' });
	} catch (error) {
		console.error('Error updating auto-association:', error);
		return json({ error: 'Failed to update auto-association' }, { status: 500 });
	}
}