<!-- webapp/src/lib/components/genproj/ConfigurationForm.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';
	import { ProjectConfig } from '$lib/models/project-config';
	import { capabilities } from '$lib/config/capabilities';
	import { isNotEmpty } from '$lib/utils/validation';
	import CapabilitySelector from './CapabilitySelector.svelte';

	const dispatch = createEventDispatcher();

	/** @type {ProjectConfig} */
	export let projectConfig;

	let projectName = projectConfig.projectName || '';
	let repositoryUrl = projectConfig.repositoryUrl || '';
	let selectedCapabilities = projectConfig.selectedCapabilities || [];

	$: {
		// Update projectConfig whenever local state changes
		projectConfig.projectName = projectName;
		projectConfig.repositoryUrl = repositoryUrl;
		projectConfig.selectedCapabilities = selectedCapabilities;
		projectConfig.updatedAt = new Date().toISOString();
		dispatch('change', projectConfig);
	}

	function handleCapabilityChange(event) {
		selectedCapabilities = event.detail;
	}

	// Basic validation for project name
	let projectNameError = '';
	$: {
		projectNameError = isNotEmpty(projectName) ? '' : 'Project name cannot be empty.';
	}
</script>

<div class="space-y-6">
	<!-- Project Name Input -->
	<div>
		<label for="projectName" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
			>Project Name</label
		>
		<input
			type="text"
			id="projectName"
			bind:value={projectName}
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
			placeholder="e.g., my-awesome-project"
			data-test-id="project-name-input"
		/>
		{#if projectNameError}
			<p class="mt-2 text-sm text-red-600">{projectNameError}</p>
		{/if}
	</div>

	<!-- Repository URL Input -->
	<div>
		<label for="repositoryUrl" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
			>GitHub Repository URL (Optional)</label
		>
		<input
			type="url"
			id="repositoryUrl"
			bind:value={repositoryUrl}
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
			placeholder="e.g., https://github.com/username/repo"
			data-test-id="repository-url-input"
		/>
	</div>

	<!-- Capability Selector -->
	<div>
		<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-3">Select Capabilities</h3>
		<CapabilitySelector bind:selectedCapabilities on:change={handleCapabilityChange} />
	</div>
</div>
