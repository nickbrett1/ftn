import { redirect } from '@sveltejs/kit';
import { SENTRY_ENVIRONMENT } from '$env/static/private';

const HTML_TEMPORARY_REDIRECT = 307;

export async function load({ cookies, platform }) {
	if (SENTRY_ENVIRONMENT === 'staging') {
		// Skip auth for staging so we can perf test the page
		return {};
	}

	const authCookie = cookies.get('auth');

	if (!authCookie || authCookie === 'deleted') {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/preview');
	}

	const accessToken = await platform.env.KV.get(authCookie);
	if (accessToken === null) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/preview');
	}

	return {};
}
