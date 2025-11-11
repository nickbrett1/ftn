<!-- webapp/src/lib/components/genproj/PreviewMode.svelte -->
<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { logger } from '$lib/utils/logging';
	import { ProjectConfig } from '$lib/models/project-config.js';

	const dispatch = createEventDispatcher();

	export let projectName;
	export let repositoryUrl;
	export let selectedCapabilities;
	export let configuration;

	let projectConfig = null;
	$: {
		try {
			projectConfig = new ProjectConfig({
				projectName,
				repositoryUrl,
				selectedCapabilities,
				configuration
			});
			error = null;
		} catch (e) {
			projectConfig = null;
			error = e.message;
		}
	}

	let previewFiles = [];
	let loading = false;
	let error = null;

	// Function to fetch and update the preview
	async function fetchPreview() {
		if (!projectConfig) {
			previewFiles = [];
			loading = false;
			return;
		}
		loading = true;
		error = null;
		try {
			const response = await fetch('/projects/genproj/api/preview', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(projectConfig.toObject())
			});

			if (!response.ok) {
				const errData = await response.json();
				throw new Error(errData.message || `HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			previewFiles = data.files;
			logger.info('Project preview generated successfully', {
				filesCount: previewFiles.length
			});
		} catch (err) {
			error = err.message;
			logger.error('Failed to generate preview', { error: err.message });
		} finally {
			loading = false;
		}
	}

	// Fetch preview whenever projectConfig changes
	$: (projectConfig, fetchPreview());
</script>

<div class="space-y-4">
	{#if loading}
		<p>Loading preview...</p>
	{:else if error}
		<div class="bg-red-900 bg-opacity-20 border border-red-500 rounded-md p-4">
			<div class="flex">
				<div class="shrink-0">
					<svg
						class="h-5 w-5 text-red-400"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-300">Error generating preview</h3>
					<div class="mt-2 text-sm text-red-200">
						<p>{error}</p>
					</div>
				</div>
			</div>
		</div>
	{:else if previewFiles.length === 0}
		<p class="text-gray-500 dark:text-gray-400">
			No capabilities selected or no preview available.
		</p>
	{:else}
		<h3 class="text-xl font-semibold mb-3">Generated Files Preview</h3>
		<div class="space-y-4">
			{#each previewFiles as file (file.filePath)}
				<div class="bg-gray-100 dark:bg-gray-700 rounded-md p-3">
					<p class="font-mono text-sm text-gray-800 dark:text-gray-200 mb-1">
						{file.filePath}
					</p>
					<pre
						class="bg-gray-200 dark:bg-gray-800 p-2 rounded-sm text-xs overflow-auto">{file.content}</pre>
				</div>
			{/each}
		</div>
	{/if}
</div>
