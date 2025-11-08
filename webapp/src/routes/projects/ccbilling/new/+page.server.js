import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';
import { listBillingCycles } from '$lib/server/ccbilling-db.js';

const HTML_TEMPORARY_REDIRECT = 307;

export async function load(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/notauthorised');
	}

	// Get existing billing cycles to calculate default dates
	const existingCycles = await listBillingCycles(event);

	// Calculate default dates
	const today = new Date();
	const todayStr = today.toISOString().split('T')[0];

	let defaultStartDate = todayStr;
	let defaultEndDate = todayStr;

	// If there are existing cycles, set start date to day after most recent cycle's end date
	if (existingCycles && existingCycles.length > 0) {
		// Cycles are ordered by start_date DESC, so the first one is the most recent
		const mostRecentCycle = existingCycles[0];

		// Validate that the most recent cycle has a valid end_date
		if (mostRecentCycle.end_date) {
			const mostRecentEndDate = new Date(mostRecentCycle.end_date);

			// Check if the date is valid (not NaN)
			if (!isNaN(mostRecentEndDate.getTime())) {
				// Set start date to day after the most recent cycle's end date
				const nextDay = new Date(mostRecentEndDate);
				nextDay.setDate(nextDay.getDate() + 1);

				// Ensure the calculated start date is not in the future
				// If the most recent cycle ends in the future, default to today
				if (nextDay <= today) {
					defaultStartDate = nextDay.toISOString().split('T')[0];
				}
				// If nextDay is in the future, keep defaultStartDate as today
			}
			// If mostRecentEndDate is invalid, keep defaultStartDate as today
		}
		// If mostRecentCycle.end_date is null/undefined, keep defaultStartDate as today
	}

	return {
		defaultStartDate,
		defaultEndDate
	};
}
