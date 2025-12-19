<!--
	PreviewMode.svelte
	
	Preview component that shows generated files and external service changes
	without requiring authentication. Provides real-time preview updates.
	
	Features:
	- File tree display
	- Code syntax highlighting
	- External service preview
	- Responsive design
	- Accessibility support
-->

<script>
	import { createEventDispatcher, onMount, tick } from 'svelte';
	import { selectedCapabilities, capabilityValidation } from '$lib/client/capability-store.js';
	import { CAPABILITIES as capabilities } from '$lib/utils/capabilities.js';

	// Props
	export let previewData = null;
	export let loading = false;
	export let error = null;

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Reactive state
	let selectedFile = null;
	let expandedFolders = new Set(['/']);
	let fileTree = [];
	let externalServices = [];
	let fileTreeContainer; // Reference to the file tree container element

	// Reactive updates
	$: {
		if (previewData) {
			fileTree = previewData.files || [];
			// Only show GitHub external services for the current release
			externalServices = (previewData.externalServices || []).filter(
				(service) => service.type === 'github'
			);
			// Expand all folders by default when new previewData arrives
			expandedFolders = new Set();
			expandAllFolders(fileTree, expandedFolders);
			expandedFolders = new Set(expandedFolders); // Trigger reactivity

			// Default select README.md if present
			const readme = findReadme(fileTree);
			if (readme) {
				selectedFile = readme;
				// Auto-scroll to README.md
				tick().then(() => {
					scrollSelectedIntoView();
				});
			} else {
				selectedFile = null;
			}
		}
	}

	/**
	 * Recursively finds the README.md file in the file tree
	 * @param {Array} files - The file tree array
	 * @returns {Object|null} - The README file object or null
	 */
	function findReadme(files) {
		// First pass: check for README.md in the current level
		for (const file of files) {
			if (file.type === 'file' && file.name.toLowerCase() === 'readme.md') {
				return file;
			}
		}

		// Second pass: recursively check subfolders
		for (const file of files) {
			if (file.type === 'folder' && file.children) {
				const found = findReadme(file.children);
				if (found) return found;
			}
		}
		return null;
	}

	/**
	 * Scrolls the selected file into view within the file tree container
	 */
	function scrollSelectedIntoView() {
		if (!selectedFile || !fileTreeContainer) return;

		// Use data-path attribute to find the element within the scoped container
		const buttons = Array.from(fileTreeContainer.querySelectorAll('button'));
		const element = buttons.find((btn) => btn.dataset.path === selectedFile.path);

		if (element) {
			element.scrollIntoView({ block: 'center', behavior: 'smooth' });
		}
	}

	/**
	 * Recursively expands all folders
	 * @param {Array} files - The file tree array
	 * @param {Set} set - The set of expanded folders
	 */
	function expandAllFolders(files, set) {
		for (const file of files) {
			if (file.type === 'folder') {
				set.add(file.path);
				if (file.children) {
					expandAllFolders(file.children, set);
				}
			}
		}
	}

	/**
	 * Handles file selection
	 * @param {Object} file - File object to select
	 */
	function selectFile(file) {
		selectedFile = file;
		dispatch('fileSelected', file);
	}

	/**
	 * Toggles folder expansion
	 * @param {string} folderPath - Path of the folder to toggle
	 */
	function toggleFolder(folderPath) {
		const newSet = new Set(expandedFolders);
		if (newSet.has(folderPath)) {
			newSet.delete(folderPath);
		} else {
			newSet.add(folderPath);
		}
		expandedFolders = newSet; // Trigger reactivity
	}

	/**
	 * Checks if a folder is expanded
	 * @param {string} folderPath - Path of the folder to check
	 * @returns {boolean} Whether the folder is expanded
	 */
	function isFolderExpanded(folderPath) {
		return expandedFolders.has(folderPath);
	}

	/**
	 * Gets the file icon based on extension
	 * @param {string} filename - Name of the file
	 * @returns {string} Icon emoji
	 */
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

	/**
	 * Gets the syntax highlighting language
	 * @param {string} filename - Name of the file
	 * @returns {string} Language for syntax highlighting
	 */
	function getLanguage(filename) {
		const extension = filename.split('.').pop()?.toLowerCase();
		const langMap = {
			js: 'javascript',
			ts: 'typescript',
			json: 'json',
			md: 'markdown',
			yml: 'yaml',
			yaml: 'yaml',
			xml: 'xml',
			html: 'html',
			css: 'css',
			scss: 'scss',
			svelte: 'svelte',
			py: 'python',
			java: 'java',
			go: 'go',
			rs: 'rust',
			php: 'php',
			rb: 'ruby',
			sql: 'sql',
			dockerfile: 'dockerfile',
			env: 'bash',
			txt: 'text'
		};
		return langMap[extension] || 'text';
	}

	/**
	 * Formats file size
	 * @param {number} bytes - File size in bytes
	 * @returns {string} Formatted file size
	 */
	function formatFileSize(bytes) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	/**
	 * Recursively counts total files in the file tree
	 * @param {Array} files - Array of file/folder objects
	 * @returns {number} Total count of files
	 */
	function countFiles(files) {
		if (!files) return 0;
		return files.reduce((count, item) => {
			if (item.type === 'folder') {
				return count + countFiles(item.children);
			}
			return count + 1;
		}, 0);
	}

	/**
	 * Handles continue to generation
	 */
	function continueToGeneration() {
		dispatch('continue');
	}
</script>

{#snippet fileTreeItem(file)}
	<div class="file-item">
		{#if file.type === 'folder'}
			<button
				type="button"
				class="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded"
				on:click={() => toggleFolder(file.path)}
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
				data-path={file.path}
				class="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded cursor-pointer
					{selectedFile?.path === file.path ? 'bg-blue-900 border-l-2 border-blue-500' : ''}"
				on:click={() => selectFile(file)}
			>
				<span class="mr-2 text-sm">{getFileIcon(file.name)}</span>
				<span class="text-sm text-gray-300 flex-1">{file.name}</span>
				<span class="text-xs text-gray-400">{formatFileSize(file.size)}</span>
			</button>
		{/if}
	</div>
{/snippet}

<div class="preview-mode">
	{#if loading}
		<!-- Loading State -->
		<div class="flex items-center justify-center min-h-96">
			<div class="text-center">
				<div
					class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"
				></div>
				<p class="text-gray-600">Generating preview...</p>
			</div>
		</div>
	{:else if error}
		<!-- Error State -->
		<div class="flex items-center justify-center min-h-96">
			<div class="text-center max-w-md">
				<div
					class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
				>
					<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">Preview Generation Failed</h3>
				<p class="text-gray-600 mb-4">{error}</p>
				<button
					type="button"
					class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					on:click={refreshPreview}
				>
					Try Again
				</button>
			</div>
		</div>
	{:else if previewData}
		<!-- Main Preview Content -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
			<!-- File Tree -->
			<div class="lg:col-span-1 bg-gray-800 rounded-lg shadow-sm border border-gray-700">
				<div class="p-4 border-b border-gray-700">
					<h3 class="text-lg font-semibold text-gray-100">Generated Files</h3>
					<p class="text-sm text-gray-400 mt-1">
						{countFiles(fileTree)} files will be created
					</p>
				</div>

				<div class="p-4 overflow-y-auto max-h-96 file-tree-container" bind:this={fileTreeContainer}>
					{#each fileTree as file (file.path)}
						{@render fileTreeItem(file)}
					{/each}
				</div>
			</div>

			<!-- File Content -->
			<div
				class="lg:col-span-2 bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden"
			>
				{#if selectedFile}
					<div class="p-4 border-b border-gray-700">
						<div class="flex items-center justify-between">
							<div>
								<h3 class="text-lg font-semibold text-gray-100">{selectedFile.name}</h3>
								<p class="text-sm text-gray-400">{selectedFile.path}</p>
							</div>
							<div class="flex items-center space-x-2">
								<span class="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
									{getLanguage(selectedFile.name)}
								</span>
								<span class="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</span>
							</div>
						</div>
					</div>

					<div class="p-4 overflow-x-auto">
						<pre class="text-sm text-gray-200 whitespace-pre"><code>{selectedFile.content}</code
							></pre>
					</div>
				{:else}
					<div class="flex items-center justify-center h-64 text-gray-500">
						<div class="text-center">
							<div class="text-4xl mb-4">📄</div>
							<p>Select a file to preview its content</p>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- External Services Preview -->
		{#if externalServices.length > 0}
			<div class="mt-8 bg-gray-800 rounded-lg shadow-sm border border-gray-700">
				<div class="p-6">
					<h3 class="text-lg font-semibold text-gray-100 mb-4">External Service Changes</h3>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each externalServices as service}
							<div class="border border-gray-700 rounded-lg p-4">
								<div class="flex items-center mb-3">
									<span class="text-2xl mr-3">
										{#if service.type === 'github'}
											🐙
										{:else if service.type === 'circleci'}
											🔄
										{:else if service.type === 'doppler'}
											🔐
										{:else if service.type === 'sonarcloud'}
											📊
										{:else}
											⚙️
										{/if}
									</span>
									<div>
										<h4 class="font-semibold text-gray-100">{service.name}</h4>
										<p class="text-sm text-gray-400">{service.type}</p>
									</div>
								</div>

								<div class="space-y-2">
									{#each service.actions as action}
										<div class="flex items-center text-sm">
											<span class="mr-2">
												{#if action.type === 'create'}
													✅
												{:else if action.type === 'configure'}
													⚙️
												{:else if action.type === 'update'}
													🔄
												{:else}
													📝
												{/if}
											</span>
											<span class="text-gray-300">{action.description}</span>
										</div>
									{/each}
								</div>

								{#if service.requiresAuth}
									<div class="mt-3 p-2 bg-yellow-900 border border-yellow-700 rounded">
										<p class="text-xs text-yellow-300">🔐 Authentication required</p>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<!-- No Preview Data -->
		<div class="flex items-center justify-center min-h-96">
			<div class="text-center max-w-md">
				<div class="text-4xl mb-4">👀</div>
				<h3 class="text-lg font-semibold text-gray-100 mb-2">No Preview Available</h3>
				<p class="text-gray-400 mb-4">
					Please configure your project and capabilities to see a preview.
				</p>
				<button
					type="button"
					class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
					on:click={() => dispatch('configure')}
				>
					Go to Configuration
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.preview-mode {
		min-height: calc(100vh - 200px);
	}

	.file-item {
		margin-bottom: 0.25rem;
	}

	/* Smooth transitions */
	button {
		transition: all 0.2s ease-in-out;
	}

	/* Focus styles for accessibility */
	button:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.preview-mode {
			padding: 1rem;
		}

		.grid {
			grid-template-columns: 1fr;
		}
	}

	/* Custom scrollbar for file tree */
	.file-tree-container {
		scrollbar-width: thin;
		scrollbar-color: #4b5563 #1f2937;
	}

	.file-tree-container::-webkit-scrollbar {
		width: 8px;
	}

	.file-tree-container::-webkit-scrollbar-track {
		background: #1f2937;
		border-radius: 4px;
	}

	.file-tree-container::-webkit-scrollbar-thumb {
		background-color: #4b5563;
		border-radius: 4px;
		border: 2px solid #1f2937;
	}

	.file-tree-container::-webkit-scrollbar-thumb:hover {
		background-color: #6b7280;
	}
</style>
