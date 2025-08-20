import { json, error } from '@sveltejs/kit';

export async function GET({ request, url }) {
	try {
		// Get the target URL from query parameters
		const targetUrl = url.searchParams.get('url');
		
		if (!targetUrl) {
			throw error(400, 'URL query parameter is required');
		}

		// First, try to fetch from a potential deployment info endpoint
		let workerInfo = null;
		
		try {
			const deploymentInfoUrl = new URL('/api/deployment-info', targetUrl);
			const deploymentResponse = await fetch(deploymentInfoUrl.toString(), {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'Mozilla/5.0 (compatible; Deployment-Info-Fetcher/1.0)'
				}
			});
			
			if (deploymentResponse.ok) {
				workerInfo = await deploymentResponse.json();
				console.log('Found deployment info endpoint:', workerInfo);
			}
		} catch (endpointError) {
			console.log('No deployment info endpoint found, trying alternative approaches');
		}
		
		// If no endpoint found, try to extract info from the page content
		if (!workerInfo) {
			try {
				// Make a request to the worker to get the page content
				const response = await fetch(targetUrl, {
					method: 'GET',
					headers: {
						'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
						'User-Agent': 'Mozilla/5.0 (compatible; Deployment-Info-Fetcher/1.0)'
					}
				});

				if (!response.ok) {
					throw error(response.status, `Failed to fetch worker info: ${response.status} ${response.statusText}`);
				}

				const html = await response.text();
				
				// Log a sample of the HTML for debugging
				console.log('HTML sample (first 1000 chars):', html.substring(0, 1000));
				console.log('HTML length:', html.length);
				
				// Try to find the constants in the HTML content
				// Since these are injected by Vite, they might be in different formats
				
				// Pattern 1: Look for constants in script tags (most common)
				let buildTimeMatch = html.match(/__BUILD_TIME__\s*=\s*['"]([^'"]+)['"]/);
				let gitBranchMatch = html.match(/__GIT_BRANCH__\s*=\s*['"]([^'"]+)['"]/);
				let gitCommitMatch = html.match(/__GIT_COMMIT__\s*=\s*['"]([^'"]+)['"]/);
				
				// Pattern 2: Look for constants in the footer text (since Footer.svelte uses them)
				if (!gitBranchMatch) {
					gitBranchMatch = html.match(/Branch:\s*([^\s|]+)/);
				}
				if (!gitCommitMatch) {
					gitCommitMatch = html.match(/Commit:\s*([^\s|]+)/);
				}
				
				// Pattern 3: Look for constants in JSON-like structures
				if (!buildTimeMatch) {
					buildTimeMatch = html.match(/["']__BUILD_TIME__["']\s*:\s*["']([^"']+)["']/);
				}
				if (!gitBranchMatch) {
					gitBranchMatch = html.match(/["']__GIT_BRANCH__["']\s*:\s*["']([^"']+)["']/);
				}
				if (!gitCommitMatch) {
					gitCommitMatch = html.match(/["']__GIT_COMMIT__["']\s*:\s*["']([^"']+)["']/);
				}
				
				// Pattern 4: Look for constants in meta tags or data attributes
				if (!buildTimeMatch) {
					buildTimeMatch = html.match(/data-build-time=["']([^"']+)["']/);
				}
				if (!gitBranchMatch) {
					gitBranchMatch = html.match(/data-git-branch=["']([^"']+)["']/);
				}
				if (!gitCommitMatch) {
					gitCommitMatch = html.match(/data-git-commit=["']([^"']+)["']/);
				}
				
				// Pattern 5: Look for build time in the footer "Built:" text
				if (!buildTimeMatch) {
					const builtMatch = html.match(/Built:\s*([^<]+)/);
					if (builtMatch) {
						try {
							const builtDate = new Date(builtMatch[1].trim());
							if (!isNaN(builtDate.getTime())) {
								buildTimeMatch = [null, builtDate.toISOString()];
							}
						} catch (e) {
							console.warn('Could not parse built date:', builtMatch[1]);
						}
					}
				}
				
				// Pattern 6: Look for any script tags that might contain the constants
				const scriptTags = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
				if (scriptTags) {
					console.log('Found script tags:', scriptTags.length);
					scriptTags.forEach((script, index) => {
						console.log(`Script ${index}:`, script.substring(0, 200));
						
						// Look for constants in each script tag
						if (!buildTimeMatch) {
							const match = script.match(/__BUILD_TIME__\s*=\s*['"]([^'"]+)['"]/);
							if (match) {
								buildTimeMatch = match;
								console.log('Found BUILD_TIME in script tag:', match[1]);
							}
						}
						if (!gitBranchMatch) {
							const match = script.match(/__GIT_BRANCH__\s*=\s*['"]([^'"]+)['"]/);
							if (match) {
								gitBranchMatch = match;
								console.log('Found GIT_BRANCH in script tag:', match[1]);
							}
						}
						if (!gitCommitMatch) {
							const match = script.match(/__GIT_COMMIT__\s*=\s*['"]([^'"]+)['"]/);
							if (match) {
								gitCommitMatch = match;
								console.log('Found GIT_COMMIT in script tag:', match[1]);
							}
						}
						
						// Look for the global window assignments we added
						if (!buildTimeMatch) {
							const match = script.match(/window\.__BUILD_TIME__\s*=\s*__BUILD_TIME__/);
							if (match) {
								// Look for the actual value in the same script tag
								const valueMatch = script.match(/__BUILD_TIME__\s*=\s*['"]([^'"]+)['"]/);
								if (valueMatch) {
									buildTimeMatch = valueMatch;
									console.log('Found BUILD_TIME in global script:', valueMatch[1]);
								}
							}
						}
						if (!gitBranchMatch) {
							const match = script.match(/window\.__GIT_BRANCH__\s*=\s*__GIT_BRANCH__/);
							if (match) {
								const valueMatch = script.match(/__GIT_BRANCH__\s*=\s*['"]([^'"]+)['"]/);
								if (valueMatch) {
									gitBranchMatch = valueMatch;
									console.log('Found GIT_BRANCH in global script:', valueMatch[1]);
								}
							}
						}
						if (!gitCommitMatch) {
							const match = script.match(/window\.__GIT_COMMIT__\s*=\s*__GIT_COMMIT__/);
							if (match) {
								const valueMatch = script.match(/__GIT_COMMIT__\s*=\s*['"]([^'"]+)['"]/);
								if (valueMatch) {
									gitCommitMatch = valueMatch;
									console.log('Found GIT_COMMIT in global script:', valueMatch[1]);
								}
							}
						}
					});
				}
				
				// Pattern 7: Look for constants in the footer text more broadly
				if (!gitBranchMatch || !gitCommitMatch) {
					const footerMatch = html.match(/Branch:\s*([^\s|]+)\s*\|\s*Commit:\s*([^\s|]+)/);
					if (footerMatch) {
						if (!gitBranchMatch) {
							gitBranchMatch = [null, footerMatch[1]];
							console.log('Found branch in footer:', footerMatch[1]);
						}
						if (!gitCommitMatch) {
							gitCommitMatch = [null, footerMatch[2]];
							console.log('Found commit in footer:', footerMatch[2]);
						}
					}
				}
				
				workerInfo = {
					buildTime: buildTimeMatch ? buildTimeMatch[1] : null,
					gitBranch: gitBranchMatch ? gitBranchMatch[1] : null,
					gitCommit: gitCommitMatch ? gitCommitMatch[1] : null,
					lastUpdated: null
				};
				
				console.log('Extracted from HTML:', {
					buildTimeMatch: buildTimeMatch ? buildTimeMatch[1] : null,
					gitBranchMatch: gitBranchMatch ? gitBranchMatch[1] : null,
					gitCommitMatch: gitCommitMatch ? gitCommitMatch[1] : null
				});
				
			} catch (htmlError) {
				console.log('Could not parse HTML:', htmlError.message);
			}
		}
		
		// If we found build time, use it as the last updated time
		if (workerInfo && workerInfo.buildTime) {
			try {
				workerInfo.lastUpdated = new Date(workerInfo.buildTime).toISOString();
			} catch (e) {
				console.warn('Could not parse build time:', workerInfo.buildTime);
			}
		}
		
		// If we still don't have worker info, create a fallback
		if (!workerInfo) {
			workerInfo = {
				buildTime: null,
				gitBranch: null,
				gitCommit: null,
				lastUpdated: null,
				note: 'Worker info not available - constants may not be accessible from server'
			};
		}
		
		// Log what we found for debugging
		console.log('Worker info extracted:', {
			url: targetUrl,
			buildTime: workerInfo.buildTime,
			gitBranch: workerInfo.gitBranch,
			gitCommit: workerInfo.gitCommit,
			lastUpdated: workerInfo.lastUpdated,
			note: workerInfo.note
		});
		
		return json(workerInfo);
	} catch (err) {
		console.error('Worker info API error:', err);
		
		if (err.status) {
			throw err;
		}
		
		throw error(500, `Failed to fetch worker info: ${err.message}`);
	}
}