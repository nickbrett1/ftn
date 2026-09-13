import { getCurrentUser } from './auth.js';

/**
 * Origin used when the `GENPROJ` service binding is not available — local dev
 * and tests. Deployed environments always go over the binding.
 */
export const GENPROJ_ORIGIN = 'https://genproj.nick-brett1.workers.dev';

/**
 * Header ftn presents to the genproj Worker to show that a call came from us.
 *
 * A service binding is an internal handle rather than a network address, but
 * genproj also has a public `workers.dev` host, so it cannot tell a binding call
 * from an internet call on its own. This shared secret is what makes the
 * distinction — it is the whole of the authentication on this hop.
 *
 * See `docs/api-key-security-model.md`.
 */
export const SERVICE_SECRET_HEADER = 'x-service-secret';

/**
 * Header carrying the signed-in user's email, when there is one.
 *
 * Informational only: genproj logs it, and must not treat it as authoritative.
 * It exists so a generation can still be traced to a person in the logs, which
 * is a property worth keeping even though nothing enforces it.
 */
export const USER_EMAIL_HEADER = 'x-user-email';

/**
 * Calls the genproj Worker.
 *
 * Deployed environments reach it over the `GENPROJ` service binding, so the
 * request never leaves Cloudflare. Authentication is a shared secret, not a
 * per-user credential: genproj does not need to know *who* is asking, only that
 * it was ftn that asked.
 *
 * @param {object} event The SvelteKit request event.
 * @param {string} path Path on the genproj Worker, e.g. `/v1/preview`.
 * @param {object} body JSON request body.
 * @param {{auth?: boolean}} [options] `auth: true` requires a signed-in user and
 *   fails with a 401 if there is not one. It does not change what is presented
 *   to genproj — every call carries the service secret.
 * @returns {Promise<{status: number, body: object}>} status and parsed body,
 *   passed through from genproj so the caller keeps its existing response shape.
 */
export async function callGenproj(event, path, body, { auth = false } = {}) {
	const secret = event.platform?.env?.SERVICE_SECRET;
	let userEmail;

	if (auth) {
		const user = await getCurrentUser(event);
		if (!user?.email) {
			return { status: 401, body: { message: 'Unauthorized' } };
		}
		userEmail = user.email;

		if (!secret) {
			// Fail loudly rather than letting genproj reject the call: a missing
			// secret is a deployment fault, and a 401 from downstream would send
			// whoever is debugging it looking in the wrong place.
			const message = 'SERVICE_SECRET is not set — cannot call genproj';
			console.error(message);
			return { status: 500, body: { message } };
		}
	}

	const headers = {
		'content-type': 'application/json',
		...(secret ? { [SERVICE_SECRET_HEADER]: secret } : {}),
		...(userEmail ? { [USER_EMAIL_HEADER]: userEmail } : {})
	};

	const request = new Request(`https://genproj${path}`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});

	const binding = event.platform?.env?.GENPROJ;
	const response = binding
		? await binding.fetch(request)
		: await fetch(`${GENPROJ_ORIGIN}${path}`, request);

	let parsed;
	try {
		parsed = await response.json();
	} catch {
		// A non-JSON body means something upstream failed before reaching a
		// handler; surface it as a 502 rather than a confusing empty 200.
		return { status: 502, body: { message: 'Unexpected response from genproj' } };
	}

	return { status: response.status, body: parsed };
}
