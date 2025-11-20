import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Helper function to format dates clearly
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

function validateEnvironmentVariables(accountId, apiToken) {
	if (!accountId || !apiToken) {
		const missingVariables = [];
		if (!accountId) missingVariables.push('CLOUDFLARE_ACCOUNT_ID');
		if (!apiToken) missingVariables.push('CLOUDFLARE_DEPLOYS_TOKEN');

		throw error(
			500,
			`Missing Cloudflare environment variables: ${missingVariables.join(
				', '
			)}. Please check your environment configuration.`
		);
	}
}

async function getCloudflareWorkers(accountId, apiToken) {
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

	return workersList.result;
}

async function getLatestDeployment(accountId, apiToken, workerId) {
	const deployUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerId}/deployments`;
	const deployResponse = await fetch(deployUrl, {
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'Content-Type': 'application/json'
		}
	});

	if (deployResponse.ok) {
		const deployData = await deployResponse.json();
		if (deployData.result && deployData.result.length > 0) {
			return deployData.result[0];
		}
	}
	return null;
}

function determineVersion(environment, latestDeployment) {
	const versionParts = [environment];
	if (latestDeployment?.metadata) {
		if (latestDeployment.metadata.branch) {
			versionParts.push(latestDeployment.metadata.branch);
		}
		if (latestDeployment.metadata.git_commit) {
			versionParts.push(latestDeployment.metadata.git_commit.slice(0, 8));
		}
	}

	if (versionParts.length === 1) {
		const timestamp = Date.now().toString(36).slice(0, 6);
		versionParts.push(timestamp);
	}

	return versionParts.join('-');
}

async function getWorkerDetails(accountId, apiToken, workerId, environment) {
	const latestDeployment = await getLatestDeployment(accountId, apiToken, workerId);

	const worker = {
		id: workerId,
		deployedAt: latestDeployment?.created_on || new Date().toISOString(),
		version: 'latest',
		latestDeployment
	};

	worker.version = determineVersion(environment, latestDeployment);
	return worker;
}

function formatDeployment(name, environment, url, workerDetails) {
	return {
		name,
		status: 'active',
		environment,
		url,
		version: workerDetails.version,
		deployedAt: formatDate(workerDetails.deployedAt)
	};
}

async function getPreviewDeployment(accountId, apiToken) {
	const previewDetails = await getWorkerDetails(accountId, apiToken, 'ftn-preview', 'preview');
	return formatDeployment(
		'Preview Environment',
		'preview',
		'https://ftn-preview.nick-brett1.workers.dev',
		previewDetails
	);
}

async function getProductionVersions(accountId, apiToken) {
	const productionApiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-production/versions`;
	const productionResponse = await fetch(productionApiUrl, {
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'Content-Type': 'application/json'
		}
	});

	const deployments = [];
	if (productionResponse.ok) {
		const productionData = await productionResponse.json();
		if (productionData.success && productionData.result.length > 0) {
			for (const version of productionData.result) {
				deployments.push({
					name: `Production Version ${version.id}`,
					status: 'active',
					environment: 'production',
					url: 'https://ftn-production.nick-brett1.workers.dev',
					version: `v${version.id}`,
					deployedAt: formatDate(version.created_on)
				});
			}
		}
	}
	return deployments;
}

async function getProductionDeployments(accountId, apiToken) {
	const deployments = [];

	const productionDetails = await getWorkerDetails(accountId, apiToken, 'ftn-production', 'prod');

	deployments.push(
		formatDeployment(
			'Production Environment',
			'production',
			'https://ftn-production.nick-brett1.workers.dev',
			productionDetails
		)
	);

	const olderVersions = await getProductionVersions(accountId, apiToken);
	deployments.push(...olderVersions);

	return deployments;
}

function handleApiError(error_) {
	if (error_.status) {
		throw error_; // Re-throw SvelteKit errors
	}

	// Give more specific error information
	const errorMessage = error_.message || 'Unknown error occurred';

	throw error(500, `Deploys API error: ${errorMessage}`);
}

export async function GET() {
	try {
		const accountId = env.CLOUDFLARE_ACCOUNT_ID;
		const apiToken = env.CLOUDFLARE_DEPLOYS_TOKEN;

		validateEnvironmentVariables(accountId, apiToken);

		const workers = await getCloudflareWorkers(accountId, apiToken);
		const previewWorker = workers.find((worker) => worker.id === 'ftn-preview');
		const productionWorker = workers.find((worker) => worker.id === 'ftn-production');

		if (!previewWorker && !productionWorker) {
			const availableWorkers = workers.map((w) => w.id).join(', ');
			throw error(
				404,
				`Main Workers 'ftn-preview' and 'ftn-production' not found on your Cloudflare account. Available Workers: ${
					availableWorkers || 'none'
				}. You may need to deploy the Workers first.`
			);
		}

		const deployments = [];

		if (previewWorker) {
			deployments.push(await getPreviewDeployment(accountId, apiToken));
		}

		if (productionWorker) {
			const productionDeployments = await getProductionDeployments(accountId, apiToken);
			deployments.push(...productionDeployments);
		}

		return json(deployments);
	} catch (error_) {
		handleApiError(error_);
	}
}
