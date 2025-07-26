import { json } from '@sveltejs/kit';
import { 
	listChargesForCycle, 
	bulkAssignPayments 
} from '$lib/server/ccbilling-db.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const { params } = event;
	const billing_cycle_id = parseInt(params.id);

	if (isNaN(billing_cycle_id)) {
		return json({ error: 'Invalid billing cycle ID' }, { status: 400 });
	}

	try {
		const charges = await listChargesForCycle(event, billing_cycle_id);
		return json({ charges });
	} catch (error) {
		console.error('Error listing charges:', error);
		return json({ error: 'Failed to list charges' }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const { params, request } = event;
	const billing_cycle_id = parseInt(params.id);

	if (isNaN(billing_cycle_id)) {
		return json({ error: 'Invalid billing cycle ID' }, { status: 400 });
	}

	try {
		const { assignments } = await request.json();

		if (!assignments || !Array.isArray(assignments)) {
			return json({ error: 'Invalid assignments data' }, { status: 400 });
		}

		// Validate each assignment
		for (const assignment of assignments) {
			if (!assignment.id || !assignment.allocated_to) {
				return json({ error: 'Each assignment must have id and allocated_to' }, { status: 400 });
			}
		}

		await bulkAssignPayments(event, assignments);
		return json({ success: true });
	} catch (error) {
		console.error('Error bulk assigning charges:', error);
		return json({ error: 'Failed to bulk assign charges' }, { status: 500 });
	}
}