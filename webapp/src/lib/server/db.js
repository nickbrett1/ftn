// webapp/src/lib/server/db.js

/**
 * Access to the API keys D1 database (binding `API_KEYS_DB`).
 *
 * It holds a single table, `ApiKeys`, which maps hashed personal access
 * tokens (PATs, `pat_…`) to the user email that owns them. It backs the
 * `/api-keys` UI and, critically, authentication of the MCP at `/api/mcp`.
 *
 * Note: the underlying Cloudflare D1 database is still named `genproj`
 * (historical — the PAT feature was first built for genproj); only the
 * binding was renamed. Cloudflare D1 has no database-rename operation.
 *
 * This module is intended for server-side use only.
 */
/**
 * Retrieves the API keys D1 database binding from the environment.
 * @param {App.Platform['env']} env The Cloudflare Workers environment object.
 * @returns {D1Database} The D1 database binding for 'API_KEYS_DB'.
 * @throws {Error} If the API_KEYS_DB binding is not found in the environment.
 */
export function getApiKeysDb(environment) {
	if (!environment?.API_KEYS_DB) {
		throw new Error('API_KEYS_DB binding not found in environment.');
	}
	return environment.API_KEYS_DB;
}

/**
 * Executes a SQL query against the API_KEYS_DB.
 * @param {D1Database} db The D1 database binding.
 * @param {string} sql The SQL query string.
 * @param {any[]} params Optional array of parameters for the SQL query.
 * @returns {Promise<D1Result>} The result of the D1 query.
 */
export async function executeApiKeysQuery(database, sql, parameters = []) {
	try {
		const { results } = await database
			.prepare(sql)
			.bind(...parameters)
			.all();
		return results;
	} catch (error) {
		console.error('Error executing D1 query:', error);
		throw new Error(`Database query failed: ${error.message}`);
	}
}

/**
 * Executes a SQL query against the API_KEYS_DB and returns the first result.
 * @param {D1Database} db The D1 database binding.
 * @param {string} sql The SQL query string.
 * @param {any[]} params Optional array of parameters for the SQL query.
 * @returns {Promise<any | null>} The first result of the D1 query, or null if no results.
 */
export async function getApiKeysFirstResult(database, sql, parameters = []) {
	try {
		const { results } = await database
			.prepare(sql)
			.bind(...parameters)
			.all();
		return results.length > 0 ? results[0] : null;
	} catch (error) {
		console.error('Error executing D1 query for first result:', error);
		throw new Error(`Database query failed: ${error.message}`);
	}
}
