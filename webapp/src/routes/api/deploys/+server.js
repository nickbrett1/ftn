import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * Helper function to format dates clearly
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
	const date = new Date(dateString);
	const options = {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short'
	};
	return date.toLocaleDateString('en-US', options);
}

/**
 * Get version parts from worker metadata
 * @param {Object} worker - Worker object
 * @param {string} prefix - Version prefix (e.g., 'preview', 'prod')
 * @returns {string[]} Version parts array
 */
function getVersionPartsFromMetadata(worker, prefix) {
	const versionParts = [prefix];
	if (worker?.metadata) {
		if (worker.metadata.branch) {
			versionParts.push(worker.metadata.branch);
		}
		if (worker.metadata.git_commit) {
			versionParts.push(worker.metadata.git_commit.substring(0, 8));
		}
	}
	return versionParts;
}

/**
 * Fetch deployment info from Cloudflare API
 * @param {string} accountId - Cloudflare account ID
 * @param {string} apiToken - API token
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object|null>} Deployment data or null
 */
async function fetchDeploymentInfo(accountId, apiToken, workerId) {
	try {
		const deployUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerId}/deployments`;
		const response = await fetch(deployUrl, {
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			const data = await response.json();
			if (data.result && data.result.length > 0) {
				return data.result[0];
			}
		}
		return null;
	} catch (error) {
		console.warn(`[DEPLOYS] Failed to fetch deployment info for ${workerId}:`, error.message);
		return null;
	}
}

/**
 * Fetch version info from Cloudflare API (alternative endpoint)
 * @param {string} accountId - Cloudflare account ID
 * @param {string} apiToken - API token
 * @param {string} workerId - Worker ID
 * @returns {Promise<Object|null>} Version data or null
 */
async function fetchVersionInfo(accountId, apiToken, workerId) {
	try {
		const versionUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerId}/versions`;
		const response = await fetch(versionUrl, {
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			const data = await response.json();
			if (data.result && data.result.length > 0) {
				return data.result[0];
			}
		}
		return null;
	} catch (error) {
		console.warn(`[DEPLOYS] Failed to fetch version info for ${workerId}:`, error.message);
		return null;
	}
}

/**
 * Update version parts from deployment metadata
 * @param {string[]} versionParts - Current version parts
 * @param {Object} deployment - Deployment object
 * @param {string} prefix - Version prefix
 * @returns {string[]} Updated version parts
 */
function updateVersionPartsFromDeployment(versionParts, deployment, prefix) {
	if (deployment?.metadata) {
		const updatedParts = [prefix];
		if (deployment.metadata.branch) {
			updatedParts.push(deployment.metadata.branch);
		}
		if (deployment.metadata.git_commit) {
			updatedParts.push(deployment.metadata.git_commit.substring(0, 8));
		}
		return updatedParts;
	}
	return versionParts;
}

/**
 * Ensure version parts have at least 2 parts
 * @param {string[]} versionParts - Version parts array
 * @param {Object} latestDeployment - Latest deployment object
 * @param {Object} worker - Worker object
 * @returns {string[]} Version parts with fallback
 */
function ensureVersionPartsFallback(versionParts, latestDeployment, worker) {
	if (versionParts.length === 1) {
		if (latestDeployment?.id) {
			versionParts.push(latestDeployment.id.substring(0, 8));
		} else if (worker?.id) {
			versionParts.push(worker.id.substring(0, 8));
		}
	}
	if (versionParts.length === 1) {
		const timestamp = Date.now().toString(36).substring(0, 6);
		versionParts.push(timestamp);
	}
	return versionParts;
}

/**
 * Build deployment info for a worker
 * @param {Object} worker - Worker object
 * @param {string} prefix - Environment prefix
 * @param {string} accountId - Cloudflare account ID
 * @param {string} apiToken - API token
 * @param {string} url - Worker URL
 * @param {string} name - Display name
 * @returns {Promise<Object>} Deployment info object
 */
async function buildWorkerDeployment(worker, prefix, accountId, apiToken, url, name) {
	let deployedAt = worker.created_on || new Date().toISOString();
	let versionParts = getVersionPartsFromMetadata(worker, prefix);
	let latestDeployment = null;

	// Try to get deployment info
	latestDeployment = await fetchDeploymentInfo(accountId, apiToken, worker.id);

	if (latestDeployment) {
		deployedAt = latestDeployment.created_on || deployedAt;
		versionParts = updateVersionPartsFromDeployment(versionParts, latestDeployment, prefix);
	} else {
		// Try alternative endpoint
		latestDeployment = await fetchVersionInfo(accountId, apiToken, worker.id);
		if (latestDeployment) {
			deployedAt = latestDeployment.created_on || deployedAt;
			versionParts = updateVersionPartsFromDeployment(versionParts, latestDeployment, prefix);
		}
	}

	versionParts = ensureVersionPartsFallback(versionParts, latestDeployment, worker);
	const version = versionParts.join('-');

	return {
		name,
		status: 'active',
		environment: prefix === 'preview' ? 'preview' : 'production',
		url,
		version,
		deployedAt: formatDate(deployedAt)
	};
}

/**
 * Fetch production versions from Cloudflare API
 * @param {string} accountId - Cloudflare account ID
 * @param {string} apiToken - API token
 * @returns {Promise<Object[]>} Array of deployment objects
 */
async function fetchProductionVersions(accountId, apiToken) {
	try {
		const productionApiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-production/versions`;
		const response = await fetch(productionApiUrl, {
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			const data = await response.json();
			if (data.success && data.result.length > 0) {
				return data.result.map((version) => ({
					name: `Production Version ${version.id}`,
					status: 'active',
					environment: 'production',
					url: 'https://ftn-production.nick-brett1.workers.dev',
					version: `v${version.id}`,
					deployedAt: formatDate(version.created_on)
				}));
			}
		}
		return [];
	} catch (error) {
		console.warn('[DEPLOYS] Could not fetch production versions:', error.message);
		return [];
	}
}

export async function GET({ request }) {
	try {
		// Temporarily removed auth check for testing

		// Get Cloudflare account ID and API token from environment
		const accountId = env.CLOUDFLARE_ACCOUNT_ID;
		const apiToken = env.CLOUDFLARE_DEPLOYS_TOKEN;

		if (!accountId || !apiToken) {
			const missingVars = [];
			if (!accountId) missingVars.push('CLOUDFLARE_ACCOUNT_ID');
			if (!apiToken) missingVars.push('CLOUDFLARE_DEPLOYS_TOKEN');

			throw error(
				500,
				`Missing Cloudflare environment variables: ${missingVars.join(', ')}. Please check your environment configuration.`
			);
		}

		// First, let's check what Workers exist on this account
		const listWorkersUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`;

		const listResponse = await fetch(listWorkersUrl, {
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!listResponse.ok) {
			const errorText = await listResponse.text();
			throw error(
				500,
				`Failed to list Cloudflare Workers: ${listResponse.status} ${listResponse.statusText}. Response: ${errorText}`
			);
		}

		const workersList = await listResponse.json();

		if (!workersList.success) {
			throw error(
				500,
				`Failed to list Workers: ${workersList.errors?.[0]?.message || 'Unknown error'}`
			);
		}

		// Look for our main Workers (ftn-preview and ftn-production)
		const previewWorker = workersList.result.find((worker) => worker.id === 'ftn-preview');
		const productionWorker = workersList.result.find((worker) => worker.id === 'ftn-production');

		if (!previewWorker && !productionWorker) {
			// Neither main Worker exists, return a helpful message
			const availableWorkers = workersList.result.map((w) => w.id).join(', ');
			throw error(
				404,
				`Main Workers 'ftn-preview' and 'ftn-production' not found on your Cloudflare account. Available Workers: ${availableWorkers || 'none'}. You may need to deploy the Workers first.`
			);
		}

		// Build deployments list from available Workers
		const deployments = [];

		// Add preview environment if it exists
		if (previewWorker) {
			const previewDeployment = await buildWorkerDeployment(
				previewWorker,
				'preview',
				accountId,
				apiToken,
				'https://ftn-preview.nick-brett1.workers.dev',
				'Preview Environment'
			);
			deployments.push(previewDeployment);
		}

		// Add production environment if it exists
		if (productionWorker) {
			const productionDeployment = await buildWorkerDeployment(
				productionWorker,
				'prod',
				accountId,
				apiToken,
				'https://ftn-production.nick-brett1.workers.dev',
				'Production Environment'
			);
			deployments.push(productionDeployment);
		}

		// Add production versions if available
		if (productionWorker) {
			const versions = await fetchProductionVersions(accountId, apiToken);
			deployments.push(...versions);
		}

		return json(deployments);
	} catch (err) {
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}

		// Give more specific error information
		const errorMessage = err.message || 'Unknown error occurred';

		throw error(500, `Deploys API error: ${errorMessage}`);
	}
}
