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
		
		console.log('Deploys API: Environment variables check:', {
			hasAccountId: !!accountId,
			hasApiToken: !!apiToken,
			accountIdLength: accountId?.length || 0,
			apiTokenLength: apiToken?.length || 0
		});
		
		if (!accountId || !apiToken) {
			const missingVars = [];
			if (!accountId) missingVars.push('CLOUDFLARE_ACCOUNT_ID');
			if (!apiToken) missingVars.push('CLOUDFLARE_DEPLOYS_TOKEN');
			
			throw error(500, `Missing Cloudflare environment variables: ${missingVars.join(', ')}. Please check your environment configuration.`);
		}

		// First, let's check what Workers exist on this account
		const listWorkersUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`;
		console.log('Deploys API: Checking available Workers at:', listWorkersUrl);
		
		const listResponse = await fetch(listWorkersUrl, {
			headers: {
				'Authorization': `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!listResponse.ok) {
			const errorText = await listResponse.text();
			console.error('Deploys API: Failed to list Workers:', errorText);
			throw error(500, `Failed to list Cloudflare Workers: ${listResponse.status} ${listResponse.statusText}. Response: ${errorText}`);
		}

		const workersList = await listResponse.json();
		console.log('Deploys API: Available Workers:', workersList);

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
			let previewDeployData = null;
			let previewLatestDeployment = null;
			
			// Build version from worker metadata first
			let versionParts = ['preview'];
			console.log('Deploys API: Preview worker full object:', previewWorker);
			console.log('Deploys API: Preview worker metadata:', previewWorker.metadata);
			
			if (previewWorker.metadata) {
				if (previewWorker.metadata.branch) {
					console.log('Deploys API: Found branch in metadata:', previewWorker.metadata.branch);
					versionParts.push(previewWorker.metadata.branch);
				}
				if (previewWorker.metadata.git_commit) {
					console.log('Deploys API: Found git_commit in metadata:', previewWorker.metadata.git_commit);
					versionParts.push(previewWorker.metadata.git_commit.substring(0, 8));
				}
			}
			
			console.log('Deploys API: Initial version parts from worker metadata:', versionParts);
			
			// Try to get deployment information for the preview worker
			try {
				const previewDeployUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-preview/deployments`;
				console.log('Deploys API: Getting preview deployment info from:', previewDeployUrl);
				
				const previewDeployResponse = await fetch(previewDeployUrl, {
					headers: {
						'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json'
					}
				});

				if (previewDeployResponse.ok) {
					previewDeployData = await previewDeployResponse.json();
					console.log('Deploys API: Preview deployments response:', previewDeployData);
					
					if (previewDeployData.result && previewDeployData.result.length > 0) {
						// Use the most recent deployment time
						previewLatestDeployment = previewDeployData.result[0]; // Assuming sorted by most recent first
						previewDeployedAt = previewLatestDeployment.created_on || previewDeployedAt;
						
						console.log('Deploys API: Preview deployment metadata:', previewLatestDeployment.metadata);
						console.log('Deploys API: Preview deployment full object:', previewLatestDeployment);
						
						// Override version parts with deployment metadata if available
						if (previewLatestDeployment.metadata) {
							versionParts = ['preview'];
							if (previewLatestDeployment.metadata.branch) {
								versionParts.push(previewLatestDeployment.metadata.branch);
							}
							if (previewLatestDeployment.metadata.git_commit) {
								versionParts.push(previewLatestDeployment.metadata.git_commit.substring(0, 8));
							}
						}
						
						console.log('Deploys API: Found preview deployment at:', previewDeployedAt, 'version parts:', versionParts);
					}
				} else {
					console.log('Deploys API: Preview deployments response not ok:', previewDeployResponse.status, previewDeployResponse.statusText);
					// Try alternative endpoint
					try {
						const alternativeUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-preview/versions`;
						console.log('Deploys API: Trying alternative endpoint:', alternativeUrl);
						
						const altResponse = await fetch(alternativeUrl, {
							headers: {
								'Authorization': `Bearer ${apiToken}`,
								'Content-Type': 'application/json'
							}
						});
						
						if (altResponse.ok) {
							const altData = await altResponse.json();
							console.log('Deploys API: Alternative endpoint response:', altData);
							
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
								
								console.log('Deploys API: Found preview version at:', previewDeployedAt, 'version parts:', versionParts);
							}
						}
					} catch (altError) {
						console.log('Alternative endpoint also failed:', altError.message);
					}
				}
			} catch (error) {
				console.log('Could not fetch preview deployment info:', error.message);
				// Continue with created_on as fallback
			}
			
			// Fallback to worker ID if no metadata
			console.log('Deploys API: Before fallback, version parts:', versionParts);
			
			if (versionParts.length === 1) {
				if (previewLatestDeployment?.id) {
					console.log('Deploys API: Adding deployment ID to version parts:', previewLatestDeployment.id.substring(0, 8));
					versionParts.push(previewLatestDeployment.id.substring(0, 8));
				} else if (previewWorker.id) {
					console.log('Deploys API: Adding worker ID to version parts:', previewWorker.id.substring(0, 8));
					versionParts.push(previewWorker.id.substring(0, 8));
				}
			}
			
			// Ensure we always have at least 2 parts
			if (versionParts.length === 1) {
				console.log('Deploys API: Still only 1 part, adding timestamp fallback');
				const timestamp = new Date().getTime().toString(36).substring(0, 6);
				versionParts.push(timestamp);
			}
			
			previewVersion = versionParts.join('-');
			console.log('Deploys API: Final preview version:', previewVersion);
			console.log('Deploys API: Final version parts array:', versionParts);
			
			deployments.push({
				name: 'Preview Environment',
				status: 'active',
				environment: 'preview',
				url: 'https://ftn-preview.nick-brett1.workers.dev',
				version: previewVersion,
				deployedAt: formatDate(previewDeployedAt),
				_debug: {
					metadata: previewWorker.metadata,
					deployment_metadata: previewLatestDeployment?.metadata || null,
					version_parts: versionParts,
					worker_created_on: previewWorker.created_on,
					deployment_created_on: previewLatestDeployment?.created_on || null,
					worker_id: previewWorker.id
				}
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
			console.log('Deploys API: Production worker full object:', productionWorker);
			console.log('Deploys API: Production worker metadata:', productionWorker.metadata);
			
			if (productionWorker.metadata) {
				if (productionWorker.metadata.branch) {
					console.log('Deploys API: Found branch in metadata:', productionWorker.metadata.branch);
					versionParts.push(productionWorker.metadata.branch);
				}
				if (productionWorker.metadata.git_commit) {
					console.log('Deploys API: Found git_commit in metadata:', productionWorker.metadata.git_commit);
					versionParts.push(productionWorker.metadata.git_commit.substring(0, 8));
				}
			}
			
			console.log('Deploys API: Initial production version parts from worker metadata:', versionParts);
			
			try {
				// Get deployment information for the production worker
				const productionDeployUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-production/deployments`;
				console.log('Deploys API: Getting production deployment info from:', productionDeployUrl);
				
				const productionDeployResponse = await fetch(productionDeployUrl, {
					headers: {
						'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json'
					}
				});

				if (productionDeployResponse.ok) {
					productionDeployData = await productionDeployResponse.json();
					console.log('Deploys API: Production deployments response:', productionDeployData);
					
					if (productionDeployData.result && productionDeployData.result.length > 0) {
						// Use the most recent deployment time
						productionLatestDeployment = productionDeployData.result[0]; // Assuming sorted by most recent first
						productionDeployedAt = productionLatestDeployment.created_on || productionDeployedAt;
						
						console.log('Deploys API: Production deployment metadata:', productionLatestDeployment.metadata);
						console.log('Deploys API: Production deployment full object:', productionLatestDeployment);
						
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
						
						console.log('Deploys API: Found production deployment at:', productionDeployedAt, 'version parts:', versionParts);
					}
				} else {
					console.log('Deploys API: Production deployments response not ok:', productionDeployResponse.status, productionDeployResponse.statusText);
					// Try alternative endpoint
					try {
						const alternativeUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-production/versions`;
						console.log('Deploys API: Trying alternative endpoint:', alternativeUrl);
						
						const altResponse = await fetch(alternativeUrl, {
							headers: {
								'Authorization': `Bearer ${apiToken}`,
								'Content-Type': 'application/json'
							}
						});
						
						if (altResponse.ok) {
							const altData = await altResponse.json();
							console.log('Deploys API: Alternative endpoint response:', altData);
							
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
								
								console.log('Deploys API: Found production version at:', productionDeployedAt, 'version parts:', versionParts);
							}
						}
					} catch (altError) {
						console.log('Alternative endpoint also failed:', altError.message);
					}
				}
			} catch (error) {
				console.log('Could not fetch production deployment info:', error.message);
				// Continue with created_on as fallback
			}
			
			// Fallback to worker ID if no metadata
			console.log('Deploys API: Before production fallback, version parts:', versionParts);
			
			if (versionParts.length === 1) {
				if (productionLatestDeployment?.id) {
					console.log('Deploys API: Adding production deployment ID to version parts:', productionLatestDeployment.id.substring(0, 8));
					versionParts.push(productionLatestDeployment.id.substring(0, 8));
				} else if (productionWorker.id) {
					console.log('Deploys API: Adding production worker ID to version parts:', productionWorker.id.substring(0, 8));
					versionParts.push(productionWorker.id.substring(0, 8));
				}
			}
			
			// Ensure we always have at least 2 parts
			if (versionParts.length === 1) {
				console.log('Deploys API: Production still only 1 part, adding timestamp fallback');
				const timestamp = new Date().getTime().toString(36).substring(0, 6);
				versionParts.push(timestamp);
			}
			
			productionVersion = versionParts.join('-');
			console.log('Deploys API: Final production version:', productionVersion);
			console.log('Deploys API: Final production version parts array:', versionParts);
			
			deployments.push({
				name: 'Production Environment',
				status: 'active',
				environment: 'production',
				url: 'https://ftn-production.nick-brett1.workers.dev',
				version: productionVersion,
				deployedAt: formatDate(productionDeployedAt),
				_debug: {
					metadata: productionWorker.metadata,
					deployment_metadata: productionLatestDeployment?.metadata || null,
					version_parts: versionParts,
					worker_created_on: productionWorker.created_on,
					deployment_created_on: productionLatestDeployment?.created_on || null,
					worker_id: productionWorker.id
				}
			});
		}
		
		// If we have Workers, try to get version information for production
		if (productionWorker) {
			try {
				const productionApiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-production/versions`;
				console.log('Deploys API: Making request to production:', productionApiUrl);
				
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
				console.log('Could not fetch production versions:', error.message);
				// Continue without production versions
			}
		}

		return json(deployments);
	} catch (err) {
		console.error('Deploys API: Caught error:', err);
		
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}
		
		// Give more specific error information
		const errorMessage = err.message || 'Unknown error occurred';
		console.error('Deploys API: Error details:', {
			message: errorMessage,
			stack: err.stack,
			name: err.name
		});
		
		throw error(500, `Deploys API error: ${errorMessage}`);
	}
}