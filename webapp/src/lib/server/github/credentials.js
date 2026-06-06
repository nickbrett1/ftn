import { env } from '$env/dynamic/private';

const PREVIEW_HOSTNAME = 'ftn-preview.nick-brett1.workers.dev';
const PROD_HOSTNAME = 'fintechnick.com';

/**
 * @param {string} hostname
 * @returns {{clientId: string, clientSecret: string}}
 */
export function getGithubCredentials(hostname) {
	if (hostname.includes(PREVIEW_HOSTNAME)) {
		return {
			clientId: env.PREVIEW_GITHUB_CLIENT_ID,
			clientSecret: env.PREVIEW_GITHUB_CLIENT_SECRET
		};
	}
	if (hostname.includes(PROD_HOSTNAME)) {
		return {
			clientId: env.PROD_GITHUB_CLIENT_ID,
			clientSecret: env.PROD_GITHUB_CLIENT_SECRET
		};
	}
	// Default to development credentials for localhost and other cases
	return {
		clientId: env.DEV_GITHUB_CLIENT_ID || env.GITHUB_CLIENT_ID,
		clientSecret: env.DEV_GITHUB_CLIENT_SECRET || env.GITHUB_CLIENT_SECRET
	};
}
