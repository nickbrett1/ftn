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
	let showConflictModal = $state(false);
	let newProjectName = $state('');
	let conflicts = $state([]);
	let conflictResolutions = $state({});
	let currentConflictIndex = $state(0);
	let activeConflictTab = $state('new');

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

	async function checkConflicts(projectNameToUse) {
		loading = true;
		try {
			const response = await fetch('/projects/genproj/api/conflicts', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: projectNameToUse,
					selectedCapabilities: data.selected.split(',')
				})
			});

			const result = await response.json();

			if (!response.ok) {
				// If checking conflicts fails, log it but maybe proceed to blind overwrite or error?
				// For now, let's treat it as an error
				throw new Error(result.message || 'Failed to check conflicts');
			}

			if (result.conflicts && result.conflicts.length > 0) {
				conflicts = result.conflicts;
				// Initialize resolutions to 'overwrite' (or 'keep' if preferred default)
				conflictResolutions = {};
				conflicts.forEach((c) => {
					conflictResolutions[c.path] = 'overwrite';
				});
				showConflictModal = true;
				showRepoExistsModal = false;
				loading = false;
				return true; // Conflicts found
			}
			return false; // No conflicts
		} catch (err) {
			console.error('Conflict check error:', err);
			// Fallback: if check fails, maybe proceed with standard flow or show error
			// Let's just return false to proceed with standard overwrite attempt which handles errors
			return false;
		}
	}

	async function handleGenerate(options = {}) {
		loading = true;
		error = null;
		success = null;

		// Don't hide modal immediately if we are just transitioning between modals
		if (!options.fromConflictModal) {
			showRepoExistsModal = false;
			showConflictModal = false;
		}

		const projectNameToUse = options.newName || data.projectName;
		const overwrite = options.overwrite || false;
		const resolutions = options.resolutions || null;

		// If overwrite is requested but resolutions aren't set, check for conflicts first
		if (overwrite && !resolutions && !options.skipConflictCheck) {
			const hasConflicts = await checkConflicts(projectNameToUse);
			if (hasConflicts) {
				return;
			}
		}

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
					overwrite,
					resolutions
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
				showConflictModal = false;
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
				showConflictModal = false;
			}
		} catch (error_) {
			error = error_.message;
			logger.error('Project generation failed', { error: error_.message });
		} finally {
			// If we didn't return early due to modal, stop loading
			if (!showRepoExistsModal && !showConflictModal) {
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

	function handleResolveConflicts() {
		handleGenerate({
			overwrite: true,
			resolutions: conflictResolutions,
			fromConflictModal: true,
			skipConflictCheck: true
		});
	}

	function setResolution(path, resolution) {
		conflictResolutions[path] = resolution;
		// Trigger reactivity
		conflictResolutions = { ...conflictResolutions };
	}

	function getCurrentConflict() {
		return conflicts[currentConflictIndex];
	}

	function nextConflict() {
		if (currentConflictIndex < conflicts.length - 1) {
			currentConflictIndex++;
		}
	}

	function prevConflict() {
		if (currentConflictIndex > 0) {
			currentConflictIndex--;
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
								This will add files to the existing repository. You will be able to review conflicts
								and decide whether to overwrite or keep existing files.
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

		{#if showConflictModal}
			<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
				<div
					class="bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl h-[80vh] flex flex-col border border-gray-700 overscroll-contain"
				>
					<div class="p-6 border-b border-gray-700 flex justify-between items-center">
						<h3 class="text-xl font-bold text-white">Resolve File Conflicts</h3>
						<span class="text-sm text-gray-400">
							Conflict {currentConflictIndex + 1} of {conflicts.length}
						</span>
					</div>

					<div class="flex-1 overflow-hidden flex flex-col md:flex-row">
						<!-- Sidebar file list -->
						<div
							class="w-full hidden md:block md:w-1/4 border-r border-gray-700 overflow-y-auto bg-gray-900"
						>
							{#each conflicts as conflict, index}
								<button
									class="w-full text-left p-3 border-b border-gray-800 hover:bg-gray-800 transition-colors flex items-center justify-between {currentConflictIndex ===
									index
										? 'bg-gray-800 border-l-4 border-l-blue-500'
										: ''}"
									onclick={() => (currentConflictIndex = index)}
								>
									<span class="text-sm truncate font-mono text-gray-300">{conflict.path}</span>
									<span class="text-xs">
										{#if conflictResolutions[conflict.path] === 'overwrite'}
											<span class="text-yellow-400">Overwrite</span>
										{:else}
											<span class="text-green-400">Keep</span>
										{/if}
									</span>
								</button>
							{/each}
						</div>

						<!-- Content area -->
						<div class="flex-1 flex flex-col overflow-hidden">
							<div
								class="p-4 bg-gray-800 border-b border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
							>
								<h4 class="font-mono text-white text-lg break-all md:break-normal">
									{getCurrentConflict().path}
								</h4>
								<div class="flex gap-2 w-full md:w-auto justify-end">
									<button
										class="px-3 py-1 text-sm rounded border {conflictResolutions[
											getCurrentConflict().path
										] === 'keep'
											? 'bg-green-600 border-green-500 text-white'
											: 'bg-gray-700 border-gray-600 text-gray-300'}"
										onclick={() => setResolution(getCurrentConflict().path, 'keep')}
									>
										Keep Existing
									</button>
									<button
										class="px-3 py-1 text-sm rounded border {conflictResolutions[
											getCurrentConflict().path
										] === 'overwrite'
											? 'bg-yellow-600 border-yellow-500 text-white'
											: 'bg-gray-700 border-gray-600 text-gray-300'}"
										onclick={() => setResolution(getCurrentConflict().path, 'overwrite')}
									>
										Overwrite
									</button>
								</div>
							</div>

							<div class="flex-1 overflow-hidden flex flex-col md:grid md:grid-cols-2 relative">
								<!-- Mobile Tabs -->
								<div class="flex border-b border-gray-700 md:hidden shrink-0">
									<button
										class="flex-1 py-2 text-center text-sm font-medium {activeConflictTab ===
										'existing'
											? 'text-white border-b-2 border-blue-500'
											: 'text-gray-400'}"
										onclick={() => (activeConflictTab = 'existing')}
									>
										Existing
									</button>
									<button
										class="flex-1 py-2 text-center text-sm font-medium {activeConflictTab === 'new'
											? 'text-white border-b-2 border-green-500'
											: 'text-gray-400'}"
										onclick={() => (activeConflictTab = 'new')}
									>
										New
									</button>
								</div>

								<div
									class="flex flex-col border-r border-gray-700 h-full md:h-auto overflow-hidden {activeConflictTab ===
									'existing'
										? 'flex'
										: 'hidden'} md:flex"
								>
									<div
										class="bg-gray-900 p-2 text-xs text-center text-gray-400 uppercase tracking-wide md:block hidden"
									>
										Existing Content
									</div>
									<div class="flex-1 overflow-auto p-4 bg-gray-950 font-mono text-xs text-gray-300">
										<pre>{getCurrentConflict().existingContent}</pre>
									</div>
								</div>
								<div
									class="flex flex-col h-full md:h-auto overflow-hidden {activeConflictTab === 'new'
										? 'flex'
										: 'hidden'} md:flex"
								>
									<div
										class="bg-gray-900 p-2 text-xs text-center text-gray-400 uppercase tracking-wide md:block hidden"
									>
										New Content
									</div>
									<div
										class="flex-1 overflow-auto p-4 bg-gray-950 font-mono text-xs text-green-300"
									>
										<pre>{getCurrentConflict().generatedContent}</pre>
									</div>
								</div>
							</div>

							<!-- Navigation controls -->
							<div class="p-4 bg-gray-800 border-t border-gray-700 flex justify-between">
								<button
									class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
									disabled={currentConflictIndex === 0}
									onclick={prevConflict}
								>
									Previous
								</button>
								<div class="text-gray-400 text-sm flex items-center">
									{Object.values(conflictResolutions).filter((r) => r === 'overwrite').length} to overwrite,
									{Object.values(conflictResolutions).filter((r) => r === 'keep').length} to keep
								</div>
								<button
									class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
									disabled={currentConflictIndex === conflicts.length - 1}
									onclick={nextConflict}
								>
									Next
								</button>
							</div>
						</div>
					</div>

					<div class="p-6 border-t border-gray-700 flex justify-end gap-3 bg-gray-800">
						<button
							onclick={() => {
								showConflictModal = false;
								loading = false;
							}}
							class="px-4 py-2 text-gray-300 hover:text-white transition-colors"
						>
							Cancel
						</button>
						<button
							onclick={handleResolveConflicts}
							class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
						>
							Confirm & Generate
						</button>
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
				)}&repositoryUrl={encodeURIComponent(data.repositoryUrl)}&config={btoa(
					JSON.stringify(data.configuration)
				)}"
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
