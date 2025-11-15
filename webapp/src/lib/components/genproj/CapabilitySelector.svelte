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
		const category = capability.category || 'Other';
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
		monitoring: 'Monitoring & Testing',
		Other: 'Other Capabilities'
	};

	// Order of categories for display
	const categoryOrder = [
		'devcontainer',
		'ci-cd',
		'code-quality',
		'secrets',
		'deployment',
		'monitoring',
		'Other'
	];

	// Handlers
	function handleCapabilityToggle(capabilityId, event) {
		const isChecked = event.target.checked;
		let updatedSelection;

		if (isChecked) {
			updatedSelection = [...selectedCapabilities, capabilityId];
		} else {
			// If unchecking, ensure it's not required by another selected capability
			const isRequired = isRequiredByOther({ id: capabilityId });
			if (isRequired) {
				logger.warn(
					`Cannot deselect ${capabilityId} as it's required by another selected capability.`
				);
				event.target.checked = true; // Revert checkbox state
				return;
			}
			updatedSelection = selectedCapabilities.filter((id) => id !== capabilityId);
		}
		dispatch('capabilityToggle', { capabilityId, selected: isChecked });
		dispatch('update:selectedCapabilities', updatedSelection);
	}

	function handleConfigurationChange(capabilityId, field, value) {
		const updatedConfiguration = {
			...configuration,
			[capabilityId]: {
				...(configuration[capabilityId] || {}),
				[field]: value
			}
		};
		dispatch('configurationChange', { capabilityId, config: updatedConfiguration[capabilityId] });
		dispatch('update:configuration', updatedConfiguration);
	}

	function handleNestedConfigurationChange(capabilityId, field, nestedField, value) {
		const updatedConfiguration = {
			...configuration,
			[capabilityId]: {
				...(configuration[capabilityId] || {}),
				[field]: {
					...(configuration[capabilityId]?.[field] || {}),
					[nestedField]: value
				}
			}
		};
		dispatch('configurationChange', { capabilityId, config: updatedConfiguration[capabilityId] });
		dispatch('update:configuration', updatedConfiguration);
	}

	// Helper function to determine if a rule should be displayed
	function shouldDisplayRule(property) {
		// Hide if it's an enum with only one option
		if (property.enum && property.enum.length === 1) {
			return false;
		}
		// Add other conditions here if needed for non-enum single options
		return true;
	}

	// Helper function to format camelCase strings into human-readable labels
	function formatLabel(camelCaseString) {
		if (!camelCaseString) return '';
		// Add a space before all uppercase letters that are not at the beginning
		const spacedString = camelCaseString.replace(/([A-Z])/g, ' $1');
		// Capitalize the first letter of the entire string
		return spacedString.charAt(0).toUpperCase() + spacedString.slice(1);
	}

	// Helper function to check if a capability has dependencies
	function hasDependencies(capability) {
		return capability.dependencies && capability.dependencies.length > 0;
	}

	// Helper function to check if a capability has conflicts
	function hasConflicts(capability) {
		return capability.conflicts && capability.conflicts.length > 0;
	}

	// Helper function to check if a capability is required by another selected capability
	function isRequiredByOther(currentCapability) {
		return capabilities.some(
			(cap) =>
				selectedCapabilities.includes(cap.id) &&
				cap.dependencies &&
				cap.dependencies.includes(currentCapability.id)
		);
	}

	// Helper to check if a capability is in conflict with any other selected capability
	function isInConflict(capability) {
		return capability.conflicts.some((conflictId) => selectedCapabilities.includes(conflictId));
	}

	// Helper to check if a capability is missing dependencies
	function isMissingDependencies(capability) {
		return capability.dependencies.some((depId) => !selectedCapabilities.includes(depId));
	}

	// Helper to get the names of conflicting capabilities
	function getConflictingCapabilities(capability) {
		return capability.conflicts
			.filter((conflictId) => selectedCapabilities.includes(conflictId))
			.map((conflictId) => {
				const conflictingCap = capabilities.find((c) => c.id === conflictId);
				return conflictingCap ? conflictingCap.name : conflictId;
			});
	}

	// Helper to get the names of missing dependencies
	function getMissingDependencies(capability) {
		return capability.dependencies
			.filter((depId) => !selectedCapabilities.includes(depId))
			.map((depId) => {
				const missingCap = capabilities.find((c) => c.id === depId);
				return missingCap ? missingCap.name : depId;
			});
	}
</script>

<div class="space-y-8">
	{#each categoryOrder as categoryId}
		{#if capabilityGroups[categoryId] && capabilityGroups[categoryId].length > 0}
			<div class="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
				<h2 class="text-2xl font-bold text-white mb-6">
					{categoryNames[categoryId] || categoryId}
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each capabilityGroups[categoryId] as capability (capability.id)}
						<div
							class="flex items-start p-4 rounded-md transition-all duration-200 ease-in-out {selectedCapabilities.includes(
								capability.id
							)
								? 'bg-green-900 bg-opacity-30 border border-green-600'
								: 'bg-gray-900 border border-gray-700 hover:border-gray-600'}"
						>
							<div class="flex items-center h-5">
								<input
									id="capability-{capability.id}"
									type="checkbox"
									class="form-checkbox h-5 w-5 text-green-500 rounded focus:ring-green-400 cursor-pointer"
									checked={selectedCapabilities.includes(capability.id)}
									on:change={(event) => handleCapabilityToggle(capability.id, event)}
									disabled={isRequiredByOther(capability)}
								/>
							</div>
							<div class="ml-3 text-sm w-full">
								<label
									for="capability-{capability.id}"
									class="font-medium {selectedCapabilities.includes(capability.id)
										? 'text-white'
										: 'text-gray-300'} cursor-pointer"
								>
									{capability.name}
								</label>
								<p class="text-gray-400 mt-1">{capability.description}</p>

								{#if capability.website}
									<p class="text-gray-500 text-xs mt-1">
										<a
											href={capability.website}
											target="_blank"
											rel="noopener noreferrer"
											class="text-blue-400 hover:underline"
										>
											Learn more
										</a>
									</p>
								{/if}

								{#if isRequiredByOther(capability)}
									<p class="text-yellow-400 text-xs mt-2">
										Required by another selected capability. Cannot deselect.
									</p>
								{/if}

								{#if selectedCapabilities.includes(capability.id)}
									<!-- Display configuration options if capability is selected and has a schema -->
									{#if capability.configurationSchema && Object.keys(capability.configurationSchema.properties || {}).length > 0}
										<div class="mt-4 space-y-3">
											{#each Object.entries(capability.configurationSchema.properties) as [field, property]}
												{#if shouldDisplayRule(property)}
													<div>
														<label
															for="{capability.id}-{field}"
															class="block text-xs font-medium text-gray-400 mb-1"
														>
															{formatLabel(field)}:
														</label>
														{#if property.enum}
															<select
																id="{capability.id}-{field}"
																class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-green-400 focus:border-green-400 sm:text-sm rounded-md bg-gray-900 text-white"
																value={configuration[capability.id]?.[field] || property.default}
																on:change={(e) =>
																	handleConfigurationChange(capability.id, field, e.target.value)}
															>
																{#each property.enum as option}
																	<option value={option}>{option}</option>
																{/each}
															</select>
														{:else if property.type === 'boolean'}
															<input
																type="checkbox"
																id="{capability.id}-{field}"
																class="form-checkbox h-4 w-4 text-green-500 rounded focus:ring-green-400 cursor-pointer"
																checked={configuration[capability.id]?.[field] ||
																	property.default ||
																	false}
																on:change={(e) =>
																	handleConfigurationChange(capability.id, field, e.target.checked)}
															/>
														{:else if property.type === 'array' && property.items && property.items.enum}
															<div class="flex flex-wrap gap-2 mt-1">
																{#each property.items.enum as option}
																	<label class="inline-flex items-center">
																		<input
																			type="checkbox"
																			class="form-checkbox h-4 w-4 text-green-500 rounded focus:ring-green-400 cursor-pointer"
																			checked={configuration[capability.id]?.[field]?.includes(
																				option
																			) || false}
																			on:change={(e) => {
																				const currentArray =
																					configuration[capability.id]?.[field] || [];
																				let newArray;
																				if (e.target.checked) {
																					newArray = [...currentArray, option];
																				} else {
																					newArray = currentArray.filter((item) => item !== option);
																				}
																				handleConfigurationChange(capability.id, field, newArray);
																			}}
																		/>
																		<span class="ml-2 text-gray-300 text-sm">{option}</span>
																	</label>
																{/each}
															</div>
														{:else if property.type === 'object' && field === 'thresholds' && property.properties.performance}
															<div>
																<label
																	for="{capability.id}-threshold-performance"
																	class="block text-xs font-medium text-gray-400 mb-1"
																>
																	Performance Threshold (0-100):
																</label>
																<input
																	type="number"
																	id="{capability.id}-threshold-performance"
																	class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-600 focus:outline-none focus:ring-green-400 focus:border-green-400 sm:text-sm rounded-md bg-gray-900 text-white"
																	min={property.properties.performance.minimum}
																	max={property.properties.performance.maximum}
																	value={configuration[capability.id]?.thresholds?.performance ||
																		property.properties.performance.default ||
																		0}
																	on:change={(e) =>
																		handleNestedConfigurationChange(
																			capability.id,
																			'thresholds',
																			'performance',
																			Number(e.target.value)
																		)}
																/>
															</div>
														{:else}
															<input
																type="text"
																id="{capability.id}-{field}"
																class="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-600 focus:outline-none focus:ring-green-400 focus:border-green-400 sm:text-sm rounded-md bg-gray-900 text-white"
																value={configuration[capability.id]?.[field] ||
																	property.default ||
																	''}
																on:change={(e) =>
																	handleConfigurationChange(capability.id, field, e.target.value)}
															/>
														{/if}
													</div>
												{/if}
											{/each}
										</div>
									{/if}

									<!-- Conflict Warnings -->
									{#if isInConflict(capability)}
										<div class="mt-3 text-red-400 text-xs">
											Conflicts with: {getConflictingCapabilities(capability).join(', ')}
										</div>
									{/if}

									<!-- Missing Dependencies Warnings -->
									{#if isMissingDependencies(capability)}
										<div class="mt-3 text-yellow-400 text-xs">
											Requires: {getMissingDependencies(capability).join(', ')}
										</div>
									{/if}

									<!-- Authentication Requirements -->
									{#if capability.requiresAuth && capability.requiresAuth.length > 0}
										<div class="mt-3 text-blue-400 text-xs">
											Requires authentication for: {capability.requiresAuth.join(', ')}
										</div>
									{/if}
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/each}
</div>
