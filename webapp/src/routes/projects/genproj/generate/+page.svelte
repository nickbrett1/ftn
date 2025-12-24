<script>
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { logger } from '$lib/utils/logging.js';
	import { initiateGitHubAuth } from '$lib/client/github-auth.js';
	import { untrack } from 'svelte';

	let { data } = $props();
	let loading = $state(false);
	// We only use the initial error from data, subsequent errors are local
	let error = $state(untrack(() => data.error || null));
	let success = $state(null);
	let selectedFile = $state(null);

	// Initialize expanded folders from data, but allow it to be independent state
	// We use an IIFE to capture the initial data value without creating a reactive dependency on data
	let expandedFolders = $state(
		(() => new Set(['/', ...getAllFolderPaths(data.previewData?.files || [])]))()
	);
	let showRepoExistsModal = $state(false);
	let newProjectName = $state('');

	function getAllFolderPaths(files) {
		let paths = [];
		for (const file of files) {
			if (file.type === 'folder') {
				paths.push(file.path);
				if (file.children) {
					paths = [...paths, ...getAllFolderPaths(file.children)];
				}
			}
		}
		return paths;
	}

	function toggleFolder(folderPath) {
		const newSet = new Set(expandedFolders);
		if (newSet.has(folderPath)) {
			newSet.delete(folderPath);
		} else {
			newSet.add(folderPath);
		}
		expandedFolders = newSet;
	}

	function isFolderExpanded(folderPath) {
		return expandedFolders.has(folderPath);
	}

	function getFileIcon(filename) {
		const extension = filename.split('.').pop()?.toLowerCase();
		const iconMap = {
			js: '📄',
			ts: '📘',
			json: '📋',
			md: '📝',
			yml: '⚙️',
			yaml: '⚙️',
			xml: '📄',
			html: '🌐',
			css: '🎨',
			scss: '🎨',
			svelte: '🔷',
			vue: '💚',
			react: '⚛️',
			py: '🐍',
			java: '☕',
			go: '🐹',
			rs: '🦀',
			php: '🐘',
			rb: '💎',
			sql: '🗄️',
			dockerfile: '🐳',
			gitignore: '🙈',
			env: '🔐',
			txt: '📄',
			log: '📋'
		};
		return iconMap[extension] || '📄';
	}

	function formatFileSize(bytes) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	async function handleGenerate(options = {}) {
		loading = true;
		error = null;
		success = null;
		showRepoExistsModal = false;

		const projectNameToUse = options.newName || data.projectName;
		const overwrite = options.overwrite || false;

		try {
			const response = await fetch('/projects/genproj/api/generate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: projectNameToUse,
					repositoryUrl: data.repositoryUrl,
					selectedCapabilities: data.selected.split(','),
					overwrite
				})
			});

			const result = await response.json();

			if (!response.ok) {
				if (response.status === 401) {
					if (result.message && result.message.includes('GitHub token not found')) {
						await initiateGitHubAuth(globalThis.location.href);
						return;
					}
					goto('/notauthorised');
					return;
				}
				if (response.status === 409 && result.code === 'REPOSITORY_EXISTS') {
					newProjectName = projectNameToUse;
					showRepoExistsModal = true;
					// Important: stop loading spinner if we show modal
					loading = false;
					return;
				}
				throw new Error(result.message || 'Failed to generate project');
			}

			if (result.repositoryUrl) {
				success = `Project generated successfully! Redirecting to ${result.repositoryUrl}...`;
				// Short delay so user can see success message
				setTimeout(() => {
					if (result.repositoryUrl.startsWith('http')) {
						globalThis.location.href = result.repositoryUrl;
					} else {
						goto(result.repositoryUrl);
					}
				}, 2000);
			} else {
				success = 'Project generated successfully!';
			}
		} catch (error_) {
			error = error_.message;
			logger.error('Project generation failed', { error: error_.message });
		} finally {
			// If we didn't return early due to modal, stop loading
			if (!showRepoExistsModal) {
				loading = false;
			}
		}
	}

	function handleRename() {
		if (newProjectName && newProjectName !== data.projectName) {
			// Don't navigate, just retry generation with new name
			handleGenerate({ newName: newProjectName });
		}
	}

	function handleOverwrite() {
		handleGenerate({ overwrite: true });
	}
</script>

<svelte:head>
	<title>Generate Project</title>
</svelte:head>

{#snippet fileTreeItem(file)}
	<div class="file-item">
		{#if file.type === 'folder'}
			<button
				type="button"
				class="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded"
				onclick={() => toggleFolder(file.path)}
			>
				<span class="mr-2">
					{isFolderExpanded(file.path) ? '📂' : '📁'}
				</span>
				<span class="font-medium text-gray-100">{file.name}</span>
			</button>

			{#if isFolderExpanded(file.path)}
				<div class="ml-4 mt-1 border-l border-gray-700 pl-2">
					{#each file.children || [] as childFile}
						{@render fileTreeItem(childFile)}
					{/each}
				</div>
			{/if}
		{:else}
			<div class="flex items-center w-full text-left p-2 rounded">
				<span class="mr-2 text-sm">{getFileIcon(file.name)}</span>
				<span class="text-sm text-gray-300 flex-1">{file.name}</span>
				<span class="text-xs text-gray-400">{formatFileSize(file.size)}</span>
			</div>
		{/if}
	</div>
{/snippet}

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

		{#if success}
			<div class="bg-green-900 bg-opacity-20 border border-green-500 rounded-md p-4 mb-8">
				<p class="text-green-300">{success}</p>
			</div>
		{/if}

		{#if showRepoExistsModal}
			<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
				<div class="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700">
					<h3 class="text-xl font-bold text-white mb-4">Repository Already Exists</h3>
					<p class="text-gray-300 mb-6">
						A repository named <span class="font-mono text-blue-400">{newProjectName}</span> already exists
						on your account. How would you like to proceed?
					</p>

					<div class="space-y-4">
						<div class="bg-gray-700 p-4 rounded-md">
							<label for="new-name" class="block text-sm font-medium text-gray-300 mb-2">
								Option 1: Choose a different name
							</label>
							<div class="flex gap-2">
								<input
									id="new-name"
									type="text"
									bind:value={newProjectName}
									class="flex-1 bg-gray-900 border border-gray-600 text-white rounded px-3 py-2 text-sm"
								/>
								<button
									onclick={handleRename}
									class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors"
								>
									Rename
								</button>
							</div>
						</div>

						<div class="bg-gray-700 p-4 rounded-md">
							<p class="text-sm font-medium text-gray-300 mb-2">
								Option 2: Use existing repository
							</p>
							<button
								onclick={handleOverwrite}
								class="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm transition-colors flex items-center justify-center gap-2"
							>
								<span>⚠️</span> Overwrite / Use Existing
							</button>
							<p class="text-xs text-gray-400 mt-2">
								This will add files to the existing repository. Existing files may be overwritten.
							</p>
						</div>

						<div class="flex justify-end pt-2">
							<button
								onclick={() => (showRepoExistsModal = false)}
								class="text-gray-400 hover:text-white px-4 py-2 transition-colors"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
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
				<div class="p-4 overflow-y-auto max-h-96">
					{#each data.previewData.files as file (file.path)}
						{@render fileTreeItem(file)}
					{/each}
				</div>
			{:else}
				<p class="text-gray-400">Could not load file preview.</p>
			{/if}
		</div>

		<div class="flex justify-start gap-4">
			<a
				href="/projects/genproj?selected={data.selected}&projectName={encodeURIComponent(
					data.projectName
				)}&repositoryUrl={encodeURIComponent(data.repositoryUrl)}"
				class="px-8 py-3 rounded-md font-medium transition-colors border bg-gray-700 text-white hover:bg-gray-600 border-gray-500 flex items-center justify-center"
			>
				Back to Configuration
			</a>
			<button
				class="px-8 py-3 rounded-md font-medium transition-colors border bg-green-600 text-white hover:bg-green-700 border-green-400 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
				disabled={loading}
				onclick={handleGenerate}
			>
				{#if loading}
					<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
				{:else}
					Generate Project <span class="ml-2">🚀</span>
				{/if}
			</button>
		</div>
	</main>
	<Footer />
</div>
