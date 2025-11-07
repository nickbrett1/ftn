import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET({ request }) {
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

	try {
		// Temporarily removed auth check for testing

		// Get Cloudflare account ID and API token from environment
		const accountId = env.CLOUDFLARE_ACCOUNT_ID;
		const apiToken = env.CLOUDFLARE_DEPLOYS_TOKEN;
		
		if (!accountId || !apiToken) {
			const missingVars = [];
			if (!accountId) missingVars.push('CLOUDFLARE_ACCOUNT_ID');
			if (!apiToken) missingVars.push('CLOUDFLARE_DEPLOYS_TOKEN');
			
			throw error(500, `Missing Cloudflare environment variables: ${missingVars.join(', ')}. Please check your environment configuration.`);
		}

		// First, let's check what Workers exist on this account
		const listWorkersUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`;
		
		const listResponse = await fetch(listWorkersUrl, {
			headers: {
				'Authorization': `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!listResponse.ok) {
			const errorText = await listResponse.text();
			throw error(500, `Failed to list Cloudflare Workers: ${listResponse.status} ${listResponse.statusText}. Response: ${errorText}`);
		}

		const workersList = await listResponse.json();

		if (!workersList.success) {
			throw error(500, `Failed to list Workers: ${workersList.errors?.[0]?.message || 'Unknown error'}`);
		}

		// Look for our main Workers (ftn-preview and ftn-production)
		const previewWorker = workersList.result.find(worker => worker.id === 'ftn-preview');
		const productionWorker = workersList.result.find(worker => worker.id === 'ftn-production');
		
		if (!previewWorker && !productionWorker) {
			// Neither main Worker exists, return a helpful message
			const availableWorkers = workersList.result.map(w => w.id).join(', ');
			throw error(404, `Main Workers 'ftn-preview' and 'ftn-production' not found on your Cloudflare account. Available Workers: ${availableWorkers || 'none'}. You may need to deploy the Workers first.`);
		}

		// Build deployments list from available Workers
		const deployments = [];
		
		// Add preview environment if it exists
		if (previewWorker) {
			// Try to get the actual deployment time for preview
			let previewDeployedAt = previewWorker.created_on || new Date().toISOString();
			let previewVersion = 'latest';
			let previewLatestDeployment = null;

			// Build version from worker metadata first
			let versionParts = ['preview'];
			if (previewWorker.metadata) {
				if (previewWorker.metadata.branch) {
					versionParts.push(previewWorker.metadata.branch);
				}
				if (previewWorker.metadata.git_commit) {
					versionParts.push(previewWorker.metadata.git_commit.substring(0, 8));
				}
			}

			try {
				const previewDeployUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-preview/deployments`;
				const previewDeployResponse = await fetch(previewDeployUrl, {
					headers: {
						'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json'
					}
				});

				if (previewDeployResponse.ok) {
					const previewDeployData = await previewDeployResponse.json();
					if (previewDeployData.result && previewDeployData.result.length > 0) {
						previewLatestDeployment = previewDeployData.result[0];
						previewDeployedAt = previewLatestDeployment.created_on || previewDeployedAt;
						if (previewLatestDeployment.metadata) {
							versionParts = ['preview'];
							if (previewLatestDeployment.metadata.branch) {
								versionParts.push(previewLatestDeployment.metadata.branch);
							}
							if (previewLatestDeployment.metadata.git_commit) {
								versionParts.push(previewLatestDeployment.metadata.git_commit.substring(0, 8));
							}
						}
					} else {
						// Try alternative endpoint if deployments call is successful but returns no results
						try {
							const alternativeUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-preview/versions`;
							const altResponse = await fetch(alternativeUrl, {
								headers: {
									'Authorization': `Bearer ${apiToken}`,
									'Content-Type': 'application/json'
								}
							});
							if (altResponse.ok) {
								const altData = await altResponse.json();
								if (altData.result && altData.result.length > 0) {
									const latestVersion = altData.result[0];
									previewLatestDeployment = latestVersion;
									previewDeployedAt = latestVersion.created_on || previewDeployedAt;
									if (latestVersion.metadata) {
										versionParts = ['preview'];
										if (latestVersion.metadata.branch) {
											versionParts.push(latestVersion.metadata.branch);
										}
										if (latestVersion.metadata.git_commit) {
											versionParts.push(latestVersion.metadata.git_commit.substring(0, 8));
										}
									}
								}
							}
						} catch (altError) {
							// Alternative endpoint failed, continue with fallback
						}
					}
				}
			} catch (error) {
				// Could not fetch preview deployment info, continue with created_on as fallback
			}

			// Fallback to worker ID if no metadata
			if (versionParts.length === 1) {
				if (previewLatestDeployment?.id) {
					versionParts.push(previewLatestDeployment.id.substring(0, 8));
				} else if (previewWorker.id) {
					versionParts.push(previewWorker.id.substring(0, 8));
				}
			}

			// Ensure we always have at least 2 parts
			if (versionParts.length === 1) {
				const timestamp = new Date().getTime().toString(36).substring(0, 6);
				versionParts.push(timestamp);
			}

			previewVersion = versionParts.join('-');

			deployments.push({
				name: 'Preview Environment',
				status: 'active',
				environment: 'preview',
				url: 'https://ftn-preview.nick-brett1.workers.dev',
				version: previewVersion,
				deployedAt: formatDate(previewDeployedAt)
			});
		}
		
		// Add production environment if it exists
		if (productionWorker) {
			// Try to get the actual deployment time for production
			let productionDeployedAt = productionWorker.created_on || new Date().toISOString();
			let productionVersion = 'latest';
			let productionDeployData = null;
			let productionLatestDeployment = null;
			
			// Build version from worker metadata first
			let versionParts = ['prod'];
			
			if (productionWorker.metadata) {
				if (productionWorker.metadata.branch) {
					versionParts.push(productionWorker.metadata.branch);
				}
				if (productionWorker.metadata.git_commit) {
					versionParts.push(productionWorker.metadata.git_commit.substring(0, 8));
				}
			}
			
			try {
				// Get deployment information for the production worker
				const productionDeployUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-production/deployments`;
				
				const productionDeployResponse = await fetch(productionDeployUrl, {
					headers: {
						'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json'
					}
				});

				if (productionDeployResponse.ok) {
					productionDeployData = await productionDeployResponse.json();
					
					if (productionDeployData.result && productionDeployData.result.length > 0) {
						// Use the most recent deployment time
						productionLatestDeployment = productionDeployData.result[0]; // Assuming sorted by most recent first
						productionDeployedAt = productionLatestDeployment.created_on || productionDeployedAt;
						
						// Override version parts with deployment metadata if available
						if (productionLatestDeployment.metadata) {
							versionParts = ['prod'];
							if (productionLatestDeployment.metadata.branch) {
								versionParts.push(productionLatestDeployment.metadata.branch);
							}
							if (productionLatestDeployment.metadata.git_commit) {
								versionParts.push(productionLatestDeployment.metadata.git_commit.substring(0, 8));
							}
						}
					}
				} else {
					// Try alternative endpoint
					try {
						const alternativeUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-production/versions`;
						
						const altResponse = await fetch(alternativeUrl, {
							headers: {
								'Authorization': `Bearer ${apiToken}`,
								'Content-Type': 'application/json'
							}
						});
						
						if (altResponse.ok) {
							const altData = await altResponse.json();
							
							if (altData.result && altData.result.length > 0) {
								const latestVersion = altData.result[0];
								productionLatestDeployment = latestVersion;
								productionDeployedAt = latestVersion.created_on || productionDeployedAt;
								
								if (latestVersion.metadata) {
									versionParts = ['prod'];
									if (latestVersion.metadata.branch) {
										versionParts.push(latestVersion.metadata.branch);
									}
									if (latestVersion.metadata.git_commit) {
										versionParts.push(latestVersion.metadata.git_commit.substring(0, 8));
									}
								}
							}
						}
					} catch (altError) {
						// Alternative endpoint failed, continue with fallback
					}
				}
			} catch (error) {
				// Could not fetch production deployment info, continue with created_on as fallback
			}
			
			// Fallback to worker ID if no metadata
			if (versionParts.length === 1) {
				if (productionLatestDeployment?.id) {
					versionParts.push(productionLatestDeployment.id.substring(0, 8));
				} else if (productionWorker.id) {
					versionParts.push(productionWorker.id.substring(0, 8));
				}
			}
			
			// Ensure we always have at least 2 parts
			if (versionParts.length === 1) {
				const timestamp = new Date().getTime().toString(36).substring(0, 6);
				versionParts.push(timestamp);
			}
			
			productionVersion = versionParts.join('-');
			
			deployments.push({
				name: 'Production Environment',
				status: 'active',
				environment: 'production',
				url: 'https://ftn-production.nick-brett1.workers.dev',
				version: productionVersion,
				deployedAt: formatDate(productionDeployedAt)
			});
		}
		
		// If we have Workers, try to get version information for production
		if (productionWorker) {
			try {
				const productionApiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-production/versions`;
				
				const productionResponse = await fetch(productionApiUrl, {
					headers: {
						'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json'
					}
				});

				if (productionResponse.ok) {
					const productionData = await productionResponse.json();
					if (productionData.success && productionData.result.length > 0) {
						// Add production versions
						productionData.result.forEach(version => {
							deployments.push({
								name: `Production Version ${version.id}`,
								status: 'active',
								environment: 'production',
								url: 'https://ftn-production.nick-brett1.workers.dev',
								version: `v${version.id}`,
								deployedAt: formatDate(version.created_on)
							});
						});
					}
				}
			} catch (error) {
				// Could not fetch production versions, continue without production versions
			}
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