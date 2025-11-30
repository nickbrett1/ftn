<script>
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { logger } from '$lib/utils/logging.js';

	let { data } = $props();
	let loading = $state(false);
	let error = $state(data.error || null);
	let selectedFile = $state(null);
	let expandedFolders = $state(
		new Set(['/', ...getAllFolderPaths(data.previewData?.files || [])])
	);

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
		} catch (error_) {
			error = error_.message;
			logger.error('Project generation failed', { error: error_.message });
		} finally {
			loading = false;
		}
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
			<button
				type="button"
				class="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded cursor-pointer
					{selectedFile?.path === file.path ? 'bg-blue-900 border-l-2 border-blue-500' : ''}"
				onclick={() => (selectedFile = file)}
			>
				<span class="mr-2 text-sm">{getFileIcon(file.name)}</span>
				<span class="text-sm text-gray-300 flex-1">{file.name}</span>
				<span class="text-xs text-gray-400">{formatFileSize(file.size)}</span>
			</button>
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

		<div class="flex justify-start">
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
