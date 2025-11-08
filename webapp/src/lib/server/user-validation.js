/**
 * Shared user validation logic with development guidance
 */

/**
 * Checks if a user email is allowed access and provides development guidance if not
 * @param {string} email - The user's email address
 * @param {any} kv - The KV store instance
 * @returns {Promise<boolean>} - Whether the user is allowed
 */
export async function isUserAllowed(email, kv) {
	const kvEntry = await kv.get(email);
	const isAllowed = kvEntry !== null;

	// Enhanced logging with development guidance
	if (isAllowed) {
		console.log(`[AUTH_HANDLER] User ${email} allowed status from KV: ${isAllowed}`);
	} else {
		console.log(`[AUTH_HANDLER] User ${email} allowed status from KV: ${isAllowed}`);
		console.log(`[AUTH_HANDLER] To add this user for development, run:`);
		console.log(
			`[AUTH_HANDLER] npx wrangler kv key put "${email}" "dev-user" --binding=KV --preview`
		);
		console.log(
			`[AUTH_HANDLER] Or for production: npx wrangler kv key put "${email}" "dev-user" --binding=KV`
		);
	}

	return isAllowed;
}
