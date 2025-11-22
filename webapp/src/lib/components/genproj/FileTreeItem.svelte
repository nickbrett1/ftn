<!--
	FileTreeItem.svelte

	Recursive component for rendering file tree items
-->

<script>
	import { createEventDispatcher } from 'svelte';

	export let item;
	export let selectedFile;
	export let expandedFolders;
	export let level = 0;

	const dispatch = createEventDispatcher();

	function toggleFolder(folderPath) {
		dispatch('toggleFolder', folderPath);
	}

	function selectFile(file) {
		dispatch('selectFile', file);
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
</script>

<div class="file-item">
	{#if item.type === 'folder'}
		<button
			type="button"
			class="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
			style="padding-left: {level * 1.5 + 0.5}rem"
			on:click={() => toggleFolder(item.path)}
		>
			<span
				class="mr-2 transform transition-transform {isFolderExpanded(item.path) ? 'rotate-90' : ''}"
			>
				▶
			</span>
			<span class="font-medium text-gray-100 flex-1">{item.name}</span>
			<span class="text-xs text-gray-400">{formatFileSize(item.size)}</span>
		</button>

		{#if isFolderExpanded(item.path)}
			<div class="folder-content">
				{#each item.children || [] as child}
					<svelte:self
						item={child}
						{selectedFile}
						{expandedFolders}
						level={level + 1}
						on:toggleFolder
						on:selectFile
					/>
				{/each}
			</div>
		{/if}
	{:else}
		<button
			type="button"
			class="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
				{selectedFile?.path === item.path ? 'bg-blue-900 border-l-2 border-blue-500' : ''}"
			style="padding-left: {level * 1.5 + 1.75}rem"
			on:click={() => selectFile(item)}
		>
			<span class="mr-2 text-sm">{getFileIcon(item.name)}</span>
			<span class="text-sm text-gray-300 flex-1 truncate">{item.name}</span>
			<span class="text-xs text-gray-400 ml-2 whitespace-nowrap">{formatFileSize(item.size)}</span>
		</button>
	{/if}
</div>
