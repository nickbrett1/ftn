/**
 * Fetches a list of tables from the Cloudflare D1 database.
 * @param {import('@sveltejs/kit').ServerLoadEvent} event - The SvelteKit load event.
 * @returns {Promise<{tables: string[], error?: string}>} An object containing the list of table names or an error message.
 */
export async function load({ platform }) {
	console.log('Available bindings:', Object.keys(platform.env));

	if (!platform?.env?.DB) {
		console.error(
			'D1 Database binding (DB) not found in platform.env. Make sure it is configured in your wrangler.toml or Cloudflare Pages environment.'
		);
		return {
			error: 'Database service is not configured. Please check server logs.',
			tables: []
		};
	}

	try {
		const db = platform.env.DB;

		console.log('Connected to D1 database:', db);
		// Query to list all user-defined tables, excluding sqlite system tables and Cloudflare internal tables.
		const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table';");
		const { results } = await stmt.all();
		console.log('Fetched tables:', results);
		return {
			tables: results ? results.map((row) => row.name) : []
		};
	} catch (e) {
		console.error('Failed to fetch tables from D1:', e);
		return {
			error: 'Failed to load table information from the database.',
			tables: []
		};
	}
}
