import {
	DEV_GITHUB_CLIENT_ID,
	DEV_GITHUB_CLIENT_SECRET,
	PREVIEW_GITHUB_CLIENT_ID,
	PREVIEW_GITHUB_CLIENT_SECRET,
	PROD_GITHUB_CLIENT_ID,
	PROD_GITHUB_CLIENT_SECRET,
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET
} from '$env/static/private';

const PREVIEW_HOSTNAME = 'ftn-preview.nick-brett1.workers.dev';
const PROD_HOSTNAME = 'fintechnick.com';

/**
 * @param {string} hostname
 * @returns {{clientId: string, clientSecret: string}}
 */
export function getGithubCredentials(hostname) {
	if (hostname.includes(PREVIEW_HOSTNAME)) {
		return {
			clientId: PREVIEW_GITHUB_CLIENT_ID,
			clientSecret: PREVIEW_GITHUB_CLIENT_SECRET
		};
	}
	if (hostname.includes(PROD_HOSTNAME)) {
		return {
			clientId: PROD_GITHUB_CLIENT_ID,
			clientSecret: PROD_GITHUB_CLIENT_SECRET
		};
	}
	// Default to development credentials for localhost and other cases
	return {
		clientId: DEV_GITHUB_CLIENT_ID || GITHUB_CLIENT_ID,
		clientSecret: DEV_GITHUB_CLIENT_SECRET || GITHUB_CLIENT_SECRET
	};
}
