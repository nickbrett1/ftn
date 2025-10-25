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
		devcontainer: 'Development Containers',
		'ci-cd': 'CI/CD',
		'code-quality': 'Code Quality',
		secrets: 'Secrets Management',
		deployment: 'Deployment',
		monitoring: 'Monitoring & Testing'
	};

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
	{#each Object.entries(capabilityGroups) as [category, categoryCapabilities]}
		<div data-testid="category-{category}" class="space-y-4">
			<h3 class="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
				{categoryNames[category] || category}
			</h3>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each categoryCapabilities as capability}
					<div
						data-testid="capability-card"
						class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow {selectedCapabilities.includes(
							capability.id
						)
							? 'ring-2 ring-blue-500 bg-blue-50'
							: 'bg-white'}"
					>
						<!-- Capability Header -->
						<div class="flex items-start justify-between mb-3">
							<div class="flex-1">
								<h4 data-testid="capability-name" class="font-medium text-gray-900">
									{capability.name}
								</h4>
								<p data-testid="capability-description" class="text-sm text-gray-600 mt-1">
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
									on:change={(e) => handleCapabilityToggle(capability.id, e)}
								/>
							</div>
						</div>

						<!-- Capability Category -->
						<div class="mb-3">
							<span
								data-testid="capability-category"
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
							>
								{categoryNames[capability.category] || capability.category}
							</span>
						</div>

						<!-- Capability Details (shown on hover/selection) -->
						<div data-testid="capability-details" class="space-y-3 opacity-0 hover:opacity-100 transition-opacity duration-200 {selectedCapabilities.includes(capability.id) ? 'opacity-100' : ''}">
								<!-- Dependencies -->
								{#if hasDependencies(capability)}
									<div class="text-sm">
										<span class="font-medium text-gray-700">Dependencies:</span>
										<ul class="mt-1 space-y-1">
											{#each capability.dependencies as depId}
												{@const dep = capabilities.find((c) => c.id === depId)}
												<li class="flex items-center">
													<span class="text-gray-600">{dep?.name || depId}</span>
													{#if !selectedCapabilities.includes(depId)}
														<span class="ml-2 text-red-600 text-xs">(missing)</span>
													{/if}
												</li>
											{/each}
										</ul>
									</div>
								{/if}

								<!-- Conflicts -->
								{#if hasConflicts(capability)}
									<div class="text-sm">
										<span class="font-medium text-gray-700">Conflicts with:</span>
										<ul class="mt-1 space-y-1">
											{#each capability.conflicts as conflictId}
												{@const conflict = capabilities.find((c) => c.id === conflictId)}
												<li class="flex items-center">
													<span class="text-gray-600">{conflict?.name || conflictId}</span>
													{#if selectedCapabilities.includes(conflictId)}
														<span class="ml-2 text-red-600 text-xs">(conflict)</span>
													{/if}
												</li>
											{/each}
										</ul>
									</div>
								{/if}

								<!-- Authentication Requirements -->
								{#if requiresAuth(capability)}
									<div class="text-sm">
										<span class="font-medium text-gray-700">Requires:</span>
										<div class="mt-1 flex flex-wrap gap-1">
											{#each capability.requiresAuth as authService}
												<span
													data-testid="auth-service-{authService}"
													class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
												>
													{authService}
												</span>
											{/each}
										</div>
									</div>
								{/if}

								<!-- Configuration Options -->
								{#if capability.configurationSchema?.properties}
									<div data-testid="capability-config" class="space-y-2">
										<span class="font-medium text-gray-700 text-sm">Configuration:</span>
										{#each Object.entries(capability.configurationSchema.properties) as [field, rules]}
											<div>
												<label class="block text-xs font-medium text-gray-600 mb-1">
													{field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
												</label>
												<div class="text-sm">
													{#if rules.enum}
														<select
															class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
															data-testid="config-{field.replace(/_/g, '-')}"
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
															type="checkbox"
															class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
															data-testid="config-{field.replace(/_/g, '-')}"
															checked={configuration[capability.id]?.[field] || false}
															on:change={(e) =>
																handleConfigurationChange(capability.id, field, e.target.checked)}
														/>
													{:else if rules.type === 'array'}
														<input
															type="text"
															class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
															data-testid="config-{field.replace(/_/g, '-')}"
															value={(configuration[capability.id]?.[field] || []).join(', ')}
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
													{:else}
														<input
															type={rules.type || 'text'}
															class="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
															data-testid="config-{field.replace(/_/g, '-')}"
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
{#if selectedCapabilities.some((id) => capabilities.find((c) => c.id === id)?.dependencies?.length > 0)}
	<div
		data-testid="dependency-warning"
		class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-6"
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
				<h3 class="text-sm font-medium text-yellow-800">Missing Dependencies</h3>
				<div class="mt-2 text-sm text-yellow-700">
					<p>Some selected capabilities have dependencies that are not selected.</p>
				</div>
				<div class="mt-4">
					<button
						data-testid="add-dependency-button"
						class="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-md text-sm hover:bg-yellow-200 transition-colors"
						on:click={() => {
							// TODO: Implement auto-add dependencies
							logger.info('Add dependencies requested');
						}}
					>
						Add Missing Dependencies
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Conflict Warnings -->
{#if selectedCapabilities.some((id) => capabilities
		.find((c) => c.id === id)
		?.conflicts?.some((conflict) => selectedCapabilities.includes(conflict)))}
	<div data-testid="conflict-warning" class="bg-red-50 border border-red-200 rounded-md p-4 mt-6">
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
				<h3 class="text-sm font-medium text-red-800">Capability Conflicts</h3>
				<div class="mt-2 text-sm text-red-700">
					<p>Some selected capabilities conflict with each other.</p>
				</div>
				<div class="mt-4">
					<button
						data-testid="resolve-conflict-button"
						class="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm hover:bg-red-200 transition-colors"
						on:click={() => {
							// TODO: Implement conflict resolution
							logger.info('Resolve conflicts requested');
						}}
					>
						Resolve Conflicts
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Authentication Requirements -->
{#if selectedCapabilities.some((id) => capabilities.find((c) => c.id === id)?.requiresAuth?.length > 0)}
	<div
		data-testid="auth-requirements"
		class="bg-blue-50 border border-blue-200 rounded-md p-4 mt-6"
	>
		<div class="flex">
			<div class="flex-shrink-0">
				<svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800">Authentication Required</h3>
				<div class="mt-2 text-sm text-blue-700">
					<p>Some selected capabilities require authentication with external services:</p>
					<ul class="mt-2 space-y-1">
						{#each selectedCapabilities as capabilityId}
							{@const capability = capabilities.find((c) => c.id === capabilityId)}
							{#if capability?.requiresAuth?.length > 0}
								<li class="flex items-center">
									<span class="font-medium">{capability.name}:</span>
									<div class="ml-2 flex flex-wrap gap-1">
										{#each capability.requiresAuth as authService}
											<span
												data-testid="auth-service-{authService}"
												class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
											>
												{authService}
											</span>
										{/each}
									</div>
								</li>
							{/if}
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Additional styles if needed */
</style>
