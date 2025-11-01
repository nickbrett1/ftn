<!--
  @fileoverview CapabilitySelector component for genproj feature
  @description Displays and manages capability selection with configuration options
-->

<script>
	import { createEventDispatcher } from 'svelte';
	import { logger } from '$lib/utils/logging.js';

	// Props
	export let capabilities = [];
	export let selectedCapabilities = [];
	export let configuration = {};

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Group capabilities by category
	$: capabilityGroups = capabilities.reduce((groups, capability) => {
		const category = capability.category;
		if (!groups[category]) {
			groups[category] = [];
		}
		groups[category].push(capability);
		return groups;
	}, {});

	// Category display names
	const categoryNames = {
		devcontainer: 'Development Container Support',
		'project-structure': 'Project Structure',
		'ci-cd': 'CI/CD',
		'code-quality': 'Code Quality',
		secrets: 'Secrets Management',
		deployment: 'Deployment',
		monitoring: 'Monitoring & Testing'
	};

	// Category display order
	const categoryOrder = [
		'devcontainer',
		'project-structure',
		'ci-cd',
		'code-quality',
		'secrets',
		'deployment',
		'monitoring'
	];

	// Handle capability toggle
	function handleCapabilityToggle(capabilityId, event) {
		const selected = event.target.checked;
		dispatch('capabilityToggle', { capabilityId, selected });
	}

	// Handle configuration change
	function handleConfigurationChange(capabilityId, field, value) {
		const currentConfig = configuration[capabilityId] || {};
		const newConfig = { ...currentConfig, [field]: value };
		dispatch('configurationChange', { capabilityId, config: newConfig });
	}

	// Handle nested configuration change
	function handleNestedConfigurationChange(capabilityId, field, nestedField, value) {
		const currentConfig = configuration[capabilityId] || {};
		const currentNested = currentConfig[field] || {};
		const newConfig = {
			...currentConfig,
			[field]: { ...currentNested, [nestedField]: value }
		};
		dispatch('configurationChange', { capabilityId, config: newConfig });
	}

	// Check if capability has dependencies
	function hasDependencies(capability) {
		return capability.dependencies && capability.dependencies.length > 0;
	}

	// Check if capability has conflicts
	function hasConflicts(capability) {
		return capability.conflicts && capability.conflicts.length > 0;
	}

	// Check if capability requires authentication
	function requiresAuth(capability) {
		return capability.requiresAuth && capability.requiresAuth.length > 0;
	}

	// Get missing dependencies
	function getMissingDependencies(capability) {
		return capability.dependencies.filter((dep) => !selectedCapabilities.includes(dep));
	}

	// Get active conflicts
	function getActiveConflicts(capability) {
		return capability.conflicts.filter((conflict) => selectedCapabilities.includes(conflict));
	}

	// Check if capability is required by another selected capability
	function isRequiredByOther(capability) {
		return (
			capabilities.filter(
				(c) => selectedCapabilities.includes(c.id) && c.dependencies?.includes(capability.id)
			).length > 0
		);
	}

	// Render configuration field
	function renderConfigField(capability, field, rules) {
		const value = configuration[capability.id]?.[field] || rules.default || '';

		if (rules.enum) {
			return `
        <select 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="config-${field.replace(/_/g, '-')}"
          onchange="handleConfigChange('${capability.id}', '${field}', this.value)"
        >
          ${rules.enum
						.map(
							(option) => `
            <option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>
          `
						)
						.join('')}
        </select>
      `;
		}

		if (rules.type === 'boolean') {
			return `
        <input 
          type="checkbox" 
          class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          data-testid="config-${field.replace(/_/g, '-')}"
          ${value ? 'checked' : ''}
          onchange="handleConfigChange('${capability.id}', '${field}', this.checked)"
        />
      `;
		}

		return `
      <input 
        type="${rules.type || 'text'}" 
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        data-testid="config-${field.replace(/_/g, '-')}"
        value="${value}"
        onchange="handleConfigChange('${capability.id}', '${field}', this.value)"
      />
    `;
	}

	// Handle config change
	function handleConfigChange(capabilityId, field, value) {
		handleConfigurationChange(capabilityId, field, value);
	}
</script>

<div data-testid="capability-list" class="space-y-8">
	{#each categoryOrder.filter((cat) => capabilityGroups[cat]) as category}
		{@const categoryCapabilities = capabilityGroups[category]}
		<div data-testid="category-{category}" class="space-y-4">
			<h3 class="text-lg font-semibold text-white border-b border-gray-700 pb-2">
				{categoryNames[category] || category}
			</h3>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each categoryCapabilities as capability}
					<div
						data-testid="capability-card"
						class="border border-gray-700 rounded-lg p-4 transition-colors {selectedCapabilities.includes(
							capability.id
						)
							? 'ring-2 ring-green-400 bg-green-900 bg-opacity-20 hover:bg-green-900 hover:bg-opacity-30'
							: 'bg-gray-800 hover:bg-gray-700'}"
					>
						<!-- Capability Header -->
						<div class="flex items-start justify-between mb-3">
							<div class="flex-1">
								{#if capability.url}
									<h4 data-testid="capability-name" class="font-medium text-white">
										<a
											href={capability.url}
											target="_blank"
											rel="noopener noreferrer"
											class="hover:text-green-400 hover:underline transition-colors"
										>
											{capability.name}
											<svg
												class="inline-block ml-1 w-3 h-3 text-gray-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
												/>
											</svg>
										</a>
									</h4>
								{:else}
									<h4 data-testid="capability-name" class="font-medium text-white">
										{capability.name}
									</h4>
								{/if}
								<p data-testid="capability-description" class="text-sm text-gray-300 mt-1">
									{capability.description}
								</p>
							</div>
							<div class="ml-4">
								<input
									data-testid="capability-checkbox"
									data-capability-id={capability.id}
									type="checkbox"
									class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									checked={selectedCapabilities.includes(capability.id)}
									disabled={!selectedCapabilities.includes(capability.id) &&
										isRequiredByOther(capability)}
									on:change={(e) => handleCapabilityToggle(capability.id, e)}
								/>
							</div>
						</div>

						<!-- Capability Details (always visible) -->
						<div data-testid="capability-details" class="space-y-3">
							<!-- Dependencies -->
							{#if hasDependencies(capability)}
								<div class="text-sm">
									<span class="font-medium text-gray-300">Dependencies:</span>
									<ul class="mt-1 space-y-1">
										{#each capability.dependencies as depId}
											{@const dep = capabilities.find((c) => c.id === depId)}
											<li class="flex items-center">
												<span class="text-gray-400">{dep?.name || depId}</span>
												{#if !selectedCapabilities.includes(depId)}
													<span class="ml-2 text-red-400 text-xs">(missing)</span>
												{/if}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							<!-- Conflicts -->
							{#if hasConflicts(capability)}
								<div class="text-sm">
									<span class="font-medium text-gray-300">Incompatible with:</span>
									<ul class="mt-1 space-y-1">
										{#each capability.conflicts as conflictId}
											{@const conflict = capabilities.find((c) => c.id === conflictId)}
											<li class="flex items-center">
												<span class="text-gray-400">{conflict?.name || conflictId}</span>
												{#if selectedCapabilities.includes(conflictId)}
													<span class="ml-2 text-red-400 text-xs">(selected)</span>
												{/if}
											</li>
										{/each}
									</ul>
									<p class="mt-1 text-xs text-gray-500">
										These options cannot be used together. Please choose one.
									</p>
								</div>
							{/if}

							<!-- Configuration Options -->
							{#if capability.configurationSchema?.properties && Object.keys(capability.configurationSchema.properties).length > 0}
								<div data-testid="capability-config" class="space-y-2">
									<span class="font-medium text-gray-300 text-sm">Configuration:</span>
									{#each Object.entries(capability.configurationSchema.properties) as [field, rules]}
										<div>
											<label
												class="block text-xs font-medium text-gray-400 mb-1"
												for="config-{capability.id}-{field}"
											>
												{field
													.replace(/([A-Z])/g, ' $1')
													.replace(/_/g, ' ')
													.replace(/\b\w/g, (l) => l.toUpperCase())
													.trim()}
											</label>
											<div class="text-sm">
												{#if rules.enum}
													<select
														id="config-{capability.id}-{field}"
														class="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-green-400"
														data-testid="config-{field.replace(/([A-Z])/g, '-$1').toLowerCase()}"
														value={configuration[capability.id]?.[field] || rules.default || ''}
														on:change={(e) =>
															handleConfigurationChange(capability.id, field, e.target.value)}
													>
														{#each rules.enum as option}
															<option value={option}>{option}</option>
														{/each}
													</select>
												{:else if rules.type === 'boolean'}
													<input
														id="config-{capability.id}-{field}"
														type="checkbox"
														class="rounded border-gray-600 bg-gray-900 text-green-600 focus:ring-green-400"
														data-testid="config-{field.replace(/([A-Z])/g, '-$1').toLowerCase()}"
														checked={configuration[capability.id]?.[field] !== undefined
															? configuration[capability.id]?.[field]
															: (rules.default ?? false)}
														on:change={(e) =>
															handleConfigurationChange(capability.id, field, e.target.checked)}
													/>
												{:else if rules.type === 'array'}
													{#if rules.items?.enum}
														<!-- Multi-select checkboxes for enum arrays -->
														<div class="space-y-1">
															{#each rules.items.enum as option}
																<label class="flex items-center text-xs">
																	<input
																		type="checkbox"
																		class="mr-2 rounded border-gray-600 bg-gray-900 text-green-600 focus:ring-green-400"
																		checked={(
																			configuration[capability.id]?.[field] ||
																			rules.default ||
																			[]
																		).includes(option)}
																		on:change={(e) => {
																			const current =
																				configuration[capability.id]?.[field] ||
																				rules.default ||
																				[];
																			const updated = e.target.checked
																				? [...current, option]
																				: current.filter((item) => item !== option);
																			handleConfigurationChange(capability.id, field, updated);
																		}}
																	/>
																	<span class="text-gray-300">{option}</span>
																</label>
															{/each}
														</div>
													{:else}
														<input
															id="config-{capability.id}-{field}"
															type="text"
															class="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-green-400"
															data-testid="config-{field.replace(/([A-Z])/g, '-$1').toLowerCase()}"
															value={(
																configuration[capability.id]?.[field] ||
																rules.default ||
																[]
															).join(', ')}
															placeholder="comma-separated values"
															on:change={(e) =>
																handleConfigurationChange(
																	capability.id,
																	field,
																	e.target.value
																		.split(',')
																		.map((s) => s.trim())
																		.filter((s) => s)
																)}
														/>
													{/if}
												{:else if rules.type === 'object'}
													<!-- Nested object - render properties recursively -->
													<div class="ml-4 space-y-2 border-l-2 border-gray-700 pl-3">
														{#each Object.entries(rules.properties || {}) as [nestedField, nestedRules]}
															<div>
																<label
																	class="block text-xs font-medium text-gray-500 mb-1"
																	for="config-{capability.id}-{field}-{nestedField}"
																>
																	{nestedField
																		.replace(/([A-Z])/g, ' $1')
																		.replace(/_/g, ' ')
																		.replace(/\b\w/g, (l) => l.toUpperCase())
																		.trim()}
																</label>
																{#if nestedRules.type === 'number'}
																	<input
																		id="config-{capability.id}-{field}-{nestedField}"
																		type="number"
																		min={nestedRules.minimum}
																		max={nestedRules.maximum}
																		class="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-green-400"
																		data-testid="config-{field}-{nestedField
																			.replace(/([A-Z])/g, '-$1')
																			.toLowerCase()}"
																		value={configuration[capability.id]?.[field]?.[nestedField] ||
																			nestedRules.default ||
																			''}
																		on:change={(e) =>
																			handleNestedConfigurationChange(
																				capability.id,
																				field,
																				nestedField,
																				e.target.value
																			)}
																	/>
																{/if}
															</div>
														{/each}
													</div>
												{:else}
													<input
														id="config-{capability.id}-{field}"
														type={rules.type || 'text'}
														class="w-full px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-green-400"
														data-testid="config-{field.replace(/([A-Z])/g, '-$1').toLowerCase()}"
														value={configuration[capability.id]?.[field] || rules.default || ''}
														on:change={(e) =>
															handleConfigurationChange(capability.id, field, e.target.value)}
													/>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<!-- Dependency Warnings -->
{#if selectedCapabilities.some((id) => {
	const capability = capabilities.find((c) => c.id === id);
	if (!capability?.dependencies?.length) return false;
	return capability.dependencies.some((dep) => !selectedCapabilities.includes(dep));
})}
	<div
		data-testid="dependency-warning"
		class="bg-yellow-900 bg-opacity-20 border border-yellow-500 rounded-md p-4 mt-6"
	>
		<div class="flex">
			<div class="flex-shrink-0">
				<svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-yellow-300">Missing Dependencies</h3>
				<div class="mt-2 text-sm text-yellow-200">
					<p>Some selected capabilities have dependencies that are not selected.</p>
				</div>
				<div class="mt-4 text-xs text-yellow-200">
					These dependencies are added automatically. Review the selection below if adjustments are
					needed.
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Conflict Warnings -->
{#if selectedCapabilities.some((id) => capabilities
		.find((c) => c.id === id)
		?.conflicts?.some((conflict) => selectedCapabilities.includes(conflict)))}
	<div
		data-testid="conflict-warning"
		class="bg-red-900 bg-opacity-20 border border-red-500 rounded-md p-4 mt-6"
	>
		<div class="flex">
			<div class="flex-shrink-0">
				<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-red-300">Incompatible Options Selected</h3>
				<div class="mt-2 text-sm text-red-200">
					<p>
						Some selected options are incompatible and cannot be used together. Please deselect
						conflicting options to continue.
					</p>
				</div>
				<div class="mt-4">
					<button
						data-testid="resolve-conflict-button"
						class="bg-red-600 text-red-50 px-3 py-2 rounded-md text-sm hover:bg-red-700 transition-colors border border-red-400"
						on:click={() => {
							// TODO: Implement conflict resolution
							logger.info('Resolve conflicts requested');
						}}
					>
						Deselect Conflicting Options
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Additional styles if needed */
</style>
