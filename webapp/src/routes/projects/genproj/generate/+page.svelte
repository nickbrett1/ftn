<script>
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import FileTree from '$lib/components/genproj/FileTree.svelte';
	import { logger } from '$lib/utils/logging.js';

	let { data } = $props();
	let loading = $state(false);
	let error = $state(data.error || null);

	async function handleGenerate() {
		loading = true;
		error = null;

		try {
			const response = await fetch('/projects/genproj/api/generate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: data.projectName,
					repositoryUrl: data.repositoryUrl,
					selectedCapabilities: data.selected.split(',')
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to generate project');
			}

			if (result.repositoryUrl) {
				goto(result.repositoryUrl);
			}
		} catch (e) {
			error = e.message;
			logger.error('Project generation failed', { error: e.message });
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Generate Project</title>
</svelte:head>

<div class="min-h-screen bg-zinc-900 flex flex-col">
	<Header />
	<main class="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
		<h1 class="text-3xl font-bold text-white mb-2">Confirm Project Generation</h1>
		<p class="text-gray-300 mb-8">
			Review the details below and click "Generate Project" to create the repository and files.
		</p>

		{#if error}
			<div class="bg-red-900 bg-opacity-20 border border-red-500 rounded-md p-4 mb-8">
				<p class="text-red-300">{error}</p>
			</div>
		{/if}

		<div class="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6 mb-8">
			<h2 class="text-xl font-semibold text-white mb-4">Project Details</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<p class="text-sm text-gray-400">Project Name</p>
					<p class="text-white font-mono">{data.projectName}</p>
				</div>
				<div>
					<p class="text-sm text-gray-400">Repository</p>
					<p class="text-white font-mono">
						{data.repositoryUrl || `A new repository will be created`}
					</p>
				</div>
			</div>
		</div>

		<div class="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6 mb-8">
			<h2 class="text-xl font-semibold text-white mb-4">Files to be Generated</h2>
			{#if data.previewData}
				<FileTree files={data.previewData.files} />
			{:else}
				<p class="text-gray-400">Could not load file preview.</p>
			{/if}
		</div>

		<div class="flex justify-end">
			<button
				class="px-8 py-3 rounded-md font-medium transition-colors border bg-green-600 text-white hover:bg-green-700 border-green-400 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
				disabled={loading}
				on:click={handleGenerate}
			>
				{#if loading}
					<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
				{:else}
					Generate Project
				{/if}
			</button>
		</div>
	</main>
	<Footer />
</div>
