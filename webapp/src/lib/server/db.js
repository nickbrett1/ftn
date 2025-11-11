// webapp/src/lib/server/db.js

/**
 * Initializes and provides access to the Cloudflare D1 database binding.
 * This module is intended for server-side use only.
 */
/**
 * Retrieves the D1 database binding from the environment.
 * @param {App.Platform['env']} env The Cloudflare Workers environment object.
 * @returns {D1Database} The D1 database binding for 'GENPROJ_DB'.
 * @throws {Error} If the GENPROJ_DB binding is not found in the environment.
 */
export function getGenprojDb(environment) {
	if (!environment || !environment.GENPROJ_DB) {
		throw new Error('GENPROJ_DB binding not found in environment.');
	}
	return environment.GENPROJ_DB;
}

/**
 * Executes a SQL query against the GENPROJ_DB.
 * @param {D1Database} db The D1 database binding.
 * @param {string} sql The SQL query string.
 * @param {any[]} params Optional array of parameters for the SQL query.
 * @returns {Promise<D1Result>} The result of the D1 query.
 */
export async function executeGenprojQuery(database, sql, parameters = []) {
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
 * Executes a SQL query against the GENPROJ_DB and returns the first result.
 * @param {D1Database} db The D1 database binding.
 * @param {string} sql The SQL query string.
 * @param {any[]} params Optional array of parameters for the SQL query.
 * @returns {Promise<any | null>} The first result of the D1 query, or null if no results.
 */
export async function getGenprojFirstResult(database, sql, parameters = []) {
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
