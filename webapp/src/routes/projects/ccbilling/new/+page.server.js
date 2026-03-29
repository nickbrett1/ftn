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

	let defaultStartDate = null;

	// If there are existing cycles, set start date to day after most recent cycle's end date
	if (existingCycles && existingCycles.length > 0) {
		// Cycles are ordered by start_date DESC, so the first one is the most recent
		const mostRecentCycle = existingCycles[0];

		// Validate that the most recent cycle has a valid end_date
		if (mostRecentCycle.end_date) {
			const mostRecentEndDate = new Date(mostRecentCycle.end_date);

			// Check if the date is valid (not NaN)
			if (!Number.isNaN(mostRecentEndDate.getTime())) {
				// We don't want timezone offset issues on the server either.
				// By taking getUTCFullYear, etc, we grab the literal date elements represented by the string.
				// However, if the DB stores it as YYYY-MM-DD string, new Date('2024-01-05') creates 2024-01-05T00:00:00Z.
				// We can simply add a day to it in UTC.

				const nextDay = new Date(mostRecentEndDate);
				nextDay.setUTCDate(nextDay.getUTCDate() + 1);

				const nextDayYear = nextDay.getUTCFullYear();
				const nextDayMonth = String(nextDay.getUTCMonth() + 1).padStart(2, '0');
				const nextDayDate = String(nextDay.getUTCDate()).padStart(2, '0');

				defaultStartDate = `${nextDayYear}-${nextDayMonth}-${nextDayDate}`;
			}
		}
	}

	return {
		defaultStartDate
	};
}
