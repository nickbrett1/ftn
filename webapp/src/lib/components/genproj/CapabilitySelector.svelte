<!--
	CapabilitySelector.svelte
	
	Displays all available project capabilities with clear descriptions,
	enables capability selection, and handles dependency resolution.
	
	Features:
	- Responsive grid layout
	- Capability cards with descriptions
	- Dependency validation
	- Accessibility support
	- Real-time selection feedback
-->

<script>
	import { createEventDispatcher } from 'svelte';
	import { CAPABILITIES as capabilities, CAPABILITY_CATEGORIES as capabilityCategories } from '$lib/utils/capabilities.js';
	
	// Props
	export let selectedCapabilities = [];
	export let disabled = false;
	
	// Event dispatcher
	const dispatch = createEventDispatcher();
	
	// Reactive state
	let hoveredCapability = null;
	
	// Computed values
	$: availableCapabilities = Object.values(capabilities);
	$: capabilitiesByCategory = groupCapabilitiesByCategory(availableCapabilities);
	
	/**
	 * Groups capabilities by category for organized display
	 * @param {Array} caps - Array of capability objects
	 * @returns {Object} Grouped capabilities by category
	 */
	function groupCapabilitiesByCategory(caps) {
		const grouped = {};
		for (const cap of caps) {
			if (!grouped[cap.category]) {
				grouped[cap.category] = [];
			}
			grouped[cap.category].push(cap);
		}
		return grouped;
	}
	
	/**
	 * Handles capability selection/deselection
	 * @param {string} capabilityId - ID of the capability to toggle
	 */
	function toggleCapability(capabilityId) {
		if (disabled) return;
		
		const capability = capabilities[capabilityId];
		if (!capability) return;
		
		let newSelection;
		
		if (selectedCapabilities.includes(capabilityId)) {
			// Deselect capability
			newSelection = selectedCapabilities.filter(id => id !== capabilityId);
		} else {
			// Select capability
			newSelection = [...selectedCapabilities, capabilityId];
		}
		
		dispatch('capabilitiesChanged', {
			selectedCapabilities: newSelection,
			changedCapability: capabilityId,
			action: selectedCapabilities.includes(capabilityId) ? 'deselected' : 'selected'
		});
	}
	
	/**
	 * Checks if a capability is selected
	 * @param {string} capabilityId - ID of the capability
	 * @returns {boolean} Whether the capability is selected
	 */
	function isSelected(capabilityId) {
		return selectedCapabilities.includes(capabilityId);
	}
	
	/**
	 * Checks if a capability is disabled due to dependencies
	 * @param {string} capabilityId - ID of the capability
	 * @returns {boolean} Whether the capability is disabled
	 */
	function isDisabled(capabilityId) {
		const capability = capabilities[capabilityId];
		if (!capability) return true;
		
		// Check if required dependencies are missing
		for (const depId of capability.dependencies) {
			if (!selectedCapabilities.includes(depId)) {
				return true;
			}
		}
		
		return false;
	}
	
	/**
	 * Gets the display name for a category
	 * @param {string} categoryId - ID of the category
	 * @returns {string} Display name for the category
	 */
	function getCategoryDisplayName(categoryId) {
		return capabilityCategories[categoryId]?.name || categoryId;
	}
	
	/**
	 * Gets the color class for a category
	 * @param {string} categoryId - ID of the category
	 * @returns {string} Color class for the category
	 */
	function getCategoryColor(categoryId) {
		const color = capabilityCategories[categoryId]?.color || 'gray';
		return `text-${color}-600`;
	}
</script>

<div class="capability-selector">
	<!-- Header -->
	<div class="mb-8">
		<h2 class="text-3xl font-bold text-gray-900 mb-4">
			Choose Your Project Capabilities
		</h2>
		<p class="text-lg text-gray-600 max-w-3xl">
			Select the capabilities you want to include in your project. 
			Some capabilities have dependencies that will be automatically selected.
		</p>
	</div>
	
	<!-- Capability Categories -->
	{#each Object.entries(capabilitiesByCategory) as [categoryId, categoryCapabilities]}
		<div class="mb-12">
			<!-- Category Header -->
			<div class="mb-6">
				<h3 class="text-xl font-semibold {getCategoryColor(categoryId)} mb-2">
					{getCategoryDisplayName(categoryId)}
				</h3>
				<p class="text-sm text-gray-500">
					{capabilityCategories[categoryId]?.description || ''}
				</p>
			</div>
			
			<!-- Capability Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each categoryCapabilities as capability (capability.id)}
					{@const selected = isSelected(capability.id)}
					{@const disabledCap = isDisabled(capability.id)}
					
					<button
						type="button"
						class="capability-card group relative p-6 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
							{selected 
								? 'border-blue-500 bg-blue-50 shadow-md' 
								: disabledCap 
									? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
									: 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'}"
						disabled={disabled || disabledCap}
						on:click={() => toggleCapability(capability.id)}
						on:mouseenter={() => hoveredCapability = capability.id}
						on:mouseleave={() => hoveredCapability = null}
						aria-pressed={selected}
						aria-describedby="capability-{capability.id}-description"
					>
						<!-- Selection Indicator -->
						<div class="absolute top-4 right-4">
							{#if selected}
								<div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
									<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
									</svg>
								</div>
							{:else}
								<div class="w-6 h-6 border-2 border-gray-300 rounded-full"></div>
							{/if}
						</div>
						
						<!-- Capability Content -->
						<div class="text-left">
							<!-- Icon -->
							<div class="mb-3">
								<div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
									<span class="text-2xl">
										{#if capability.category === 'framework'}
											🏗️
										{:else if capability.category === 'language'}
											💻
										{:else if capability.category === 'styling'}
											🎨
										{:else if capability.category === 'development'}
											🔧
										{:else if capability.category === 'testing'}
											🧪
										{:else if capability.category === 'quality'}
											📊
										{:else if capability.category === 'cicd'}
											🔄
										{:else if capability.category === 'secrets'}
											🔐
										{:else if capability.category === 'deployment'}
											🚀
										{:else if capability.category === 'maintenance'}
											🛠️
										{:else if capability.category === 'performance'}
											⚡
										{:else}
											📦
										{/if}
									</span>
								</div>
							</div>
							
							<!-- Title -->
							<h4 class="text-lg font-semibold text-gray-900 mb-2">
								{capability.name}
							</h4>
							
							<!-- Description -->
							<p 
								id="capability-{capability.id}-description"
								class="text-sm text-gray-600 mb-3 line-clamp-3"
							>
								{capability.description}
							</p>
							
							<!-- Dependencies -->
							{#if capability.dependencies.length > 0}
								<div class="text-xs text-gray-500">
									<span class="font-medium">Requires:</span>
									{capability.dependencies.map(depId => capabilities[depId]?.name).join(', ')}
								</div>
							{/if}
							
							<!-- Tags -->
							{#if capability.tags && capability.tags.length > 0}
								<div class="mt-3 flex flex-wrap gap-1">
									{#each capability.tags.slice(0, 3) as tag}
										<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
											{tag}
										</span>
									{/each}
									{#if capability.tags.length > 3}
										<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
											+{capability.tags.length - 3} more
										</span>
									{/if}
								</div>
							{/if}
						</div>
						
						<!-- Hover Effect -->
						{#if hoveredCapability === capability.id && !disabledCap}
							<div class="absolute inset-0 bg-blue-500 bg-opacity-5 rounded-lg pointer-events-none"></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/each}
	
	<!-- Selection Summary -->
	{#if selectedCapabilities.length > 0}
		<div class="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
			<div class="flex items-center justify-between">
				<div>
					<h4 class="font-semibold text-blue-900">
						{selectedCapabilities.length} capability{selectedCapabilities.length === 1 ? '' : 'ies'} selected
					</h4>
					<p class="text-sm text-blue-700">
						{selectedCapabilities.map(id => capabilities[id]?.name).join(', ')}
					</p>
				</div>
				<button
					type="button"
					class="text-sm text-blue-600 hover:text-blue-800 font-medium"
					on:click={() => dispatch('clearSelection')}
				>
					Clear All
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.capability-card {
		min-height: 200px;
	}
	
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	/* Focus styles for accessibility */
	.capability-card:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}
	
	/* Disabled state styles */
	.capability-card:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
	
	.capability-card:disabled:hover {
		transform: none;
		box-shadow: none;
	}
</style>
