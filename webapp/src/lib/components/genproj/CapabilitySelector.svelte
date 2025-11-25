<!--
  @fileoverview CapabilitySelector component for genproj feature
  @description Displays and manages capability selection with configuration options
-->

<script>
	import { createEventDispatcher } from 'svelte';
	import { logger } from '$lib/utils/logging.js';
	import { slide } from 'svelte/transition';
	import {
		PythonBrands,
		NodeJsBrands,
		JavaBrands,
		DockerBrands,
		CloudflareBrands,
		CircleNotchSolid,
		CloudSolid,
		CodeSolid,
		PlayCircleSolid,
		FileAltSolid,
		UserSecretSolid,
		RobotSolid,
		ChartLineSolid,
		GlobeSolid,
		ChevronDownSolid,
		ChevronUpSolid,
		CheckCircleSolid,
		InfoCircleSolid,
		PenToSquareRegular
	} from 'svelte-awesome-icons';

	// Tippy.js for tooltips
	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';

	// Svelte Action for Tippy.js
	function useTippy(node, content) {
		let tippyInstance;

		function updateTippy(newContent) {
			if (tippyInstance) {
				tippyInstance.setContent(newContent);
			} else {
				tippyInstance = tippy(node, {
					content: newContent,
					placement: 'top',
					animation: 'fade'
				});
			}
		}

		updateTippy(content);

		return {
			update(newContent) {
				updateTippy(newContent);
			},
			destroy() {
				if (tippyInstance) {
					tippyInstance.destroy();
				}
			}
		};
	}

	// Props
	export let capabilities = [];
	export let selectedCapabilities = [];
	export let configuration = {};

	// Local state for expanded cards (to show benefits)
	let expandedCapabilities = {};

	function toggleBenefits(id) {
		expandedCapabilities[id] = !expandedCapabilities[id];
		// Trigger reactivity
		expandedCapabilities = { ...expandedCapabilities };
	}

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
		core: 'Core Capabilities (Always Included)',
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
		'core',
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
		// If clicking the card, we toggle the state.
		// If the event comes from the checkbox directly, we use its checked state.
		// But since we want the whole header to be clickable, we need to be careful.

		const isCurrentlySelected = selectedCapabilities.includes(capabilityId);
		let shouldSelect = !isCurrentlySelected;

		if (event.target.type === 'checkbox') {
			shouldSelect = event.target.checked;
		} else if (
			event.target.closest('a') ||
			event.target.closest('select') ||
			event.target.closest('input[type="text"]') ||
			event.target.closest('input[type="number"]') ||
			event.target.closest('.benefits-toggle')
		) {
			// Don't toggle selection if clicking a link, input, or the benefits toggle
			return;
		}

		let updatedSelection;

		if (shouldSelect) {
			updatedSelection = [...selectedCapabilities, capabilityId];
		} else {
			// If unchecking, ensure it's not required by another selected capability
			const capability = capabilities.find((c) => c.id === capabilityId);
			if (capability && capability.category === 'core') {
				// Core capabilities cannot be deselected
				if (event.target.type === 'checkbox') {
					event.target.checked = true;
				}
				return;
			}

			const isRequired = isRequiredByOther({ id: capabilityId });
			if (isRequired) {
				logger.warn(
					`Cannot deselect ${capabilityId} as it's required by another selected capability.`
				);
				// If it was a checkbox click, revert it
				if (event.target.type === 'checkbox') {
					event.target.checked = true;
				}
				return;
			}
			updatedSelection = selectedCapabilities.filter((id) => id !== capabilityId);
		}
		dispatch('capabilityToggle', { capabilityId, selected: shouldSelect });
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
		return true;
	}

	// Helper function to format camelCase strings into human-readable labels
	function formatLabel(camelCaseString) {
		if (!camelCaseString) return '';
		const spacedString = camelCaseString.replace(/([A-Z])/g, ' $1');
		return spacedString.charAt(0).toUpperCase() + spacedString.slice(1);
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
		return capability.dependencies.some((depId) => {
			if (selectedCapabilities.includes(depId)) return false;
			const depCap = capabilities.find((c) => c.id === depId);
			// Ignore if internal (not selectable by user)
			return !(depCap && depCap.category === 'internal');
		});
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
			.filter((depId) => {
				const depCap = capabilities.find((c) => c.id === depId);
				// Hide dependency if it's internal (not selectable by user)
				return !(depCap && depCap.category === 'internal');
			})
			.map((depId) => {
				const missingCap = capabilities.find((c) => c.id === depId);
				return missingCap ? missingCap.name : depId;
			});
	}

	// Helper function to get the icon component for a capability
	function getIconForCapability(capabilityId) {
		const iconMap = {
			'coding-agents': RobotSolid,
			'shell-tools': CodeSolid,
			'editor-tools': PenToSquareRegular,
			'spec-kit': FileAltSolid,
			'devcontainer-python': PythonBrands,
			'devcontainer-node': NodeJsBrands,
			'devcontainer-java': JavaBrands,
			docker: DockerBrands,
			circleci: CircleNotchSolid,
			'cloudflare-wrangler': CloudflareBrands,
			sonarcloud: CloudSolid,
			sonarlint: CodeSolid,
			playwright: PlayCircleSolid,
			doppler: UserSecretSolid,
			dependabot: RobotSolid,
			'lighthouse-ci': ChartLineSolid
		};
		return iconMap[capabilityId] || GlobeSolid;
	}

	// Helper function to get the color class for a capability
	function getColorClassForCapability(capabilityId) {
		const colorMap = {
			'coding-agents': 'text-blue-400',
			'shell-tools': 'text-gray-300',
			'editor-tools': 'text-blue-300',
			'spec-kit': 'text-pink-400',
			'devcontainer-python': 'text-yellow-400',
			'devcontainer-node': 'text-green-500',
			'devcontainer-java': 'text-red-500',
			docker: 'text-blue-500',
			circleci: 'text-green-400',
			'cloudflare-wrangler': 'text-orange-500',
			sonarcloud: 'text-orange-400',
			sonarlint: 'text-red-400',
			playwright: 'text-green-500',
			doppler: 'text-blue-400',
			dependabot: 'text-blue-500',
			'lighthouse-ci': 'text-orange-500'
		};
		return colorMap[capabilityId] || 'text-gray-400';
	}
</script>

<div class="space-y-12">
	{#each categoryOrder as categoryId}
		{#if capabilityGroups[categoryId] && capabilityGroups[categoryId].length > 0}
			<div>
				<h2
					class="text-2xl font-bold text-white mb-6 flex items-center border-b border-gray-700 pb-2"
				>
					<span class="mr-2">{categoryNames[categoryId] || categoryId}</span>
					<span class="text-sm font-normal text-gray-500 ml-auto"
						>{capabilityGroups[categoryId].length} options</span
					>
				</h2>

				<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
					{#each capabilityGroups[categoryId] as capability (capability.id)}
						{@const isSelected =
							selectedCapabilities.includes(capability.id) || capability.category === 'core'}
						{@const isCore = capability.category === 'core'}
						{@const isRequired = isRequiredByOther(capability)}

						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<div
							class="group relative flex flex-col bg-gray-800 rounded-xl transition-all duration-200 border-2
                                {isSelected
								? 'border-green-500 shadow-lg shadow-green-900/20'
								: 'border-gray-700 hover:border-gray-500 shadow-md'}
								{isCore ? 'cursor-default' : ''}
                            "
							onclick={(e) => !isCore && handleCapabilityToggle(capability.id, e)}
						>
							<!-- Selection Indicator (Top Right) -->
							<div class="absolute top-4 right-4 z-10">
								<input
									id="capability-{capability.id}"
									type="checkbox"
									class="form-checkbox h-6 w-6 text-green-500 rounded focus:ring-green-400 border-gray-600 bg-gray-900 {isCore
										? 'opacity-50 cursor-not-allowed'
										: 'cursor-pointer'}"
									checked={isSelected}
									disabled={isRequired || isCore}
									onclick={(e) => e.stopPropagation()}
									onchange={(e) => handleCapabilityToggle(capability.id, e)}
								/>
							</div>

							<!-- Card Header -->
							<div class="p-6 pb-2 flex-grow">
								<div class="flex items-start pr-10">
									<div class="p-3 rounded-lg bg-gray-900 mr-4 shrink-0">
										<svelte:component
											this={getIconForCapability(capability.id)}
											class="w-8 h-8 {getColorClassForCapability(capability.id)}"
										/>
									</div>
									<div>
										<h3 class="text-lg font-bold text-white leading-tight mb-1">
											{capability.name}
										</h3>
										{#if capability.links}
											<div class="flex flex-wrap gap-x-3 gap-y-1">
												{#each capability.links as link}
													<a
														href={link.url}
														target="_blank"
														rel="noopener noreferrer"
														class="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
														onclick={(e) => e.stopPropagation()}
													>
														{link.label}
														<GlobeSolid class="w-3 h-3" />
													</a>
												{/each}
											</div>
										{:else if capability.website}
											<a
												href={capability.website}
												target="_blank"
												rel="noopener noreferrer"
												class="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
												onclick={(e) => e.stopPropagation()}
											>
												Docs <GlobeSolid class="w-3 h-3" />
											</a>
										{/if}
									</div>
								</div>

								<p class="text-gray-400 text-sm mt-4 leading-relaxed">
									{capability.description}
								</p>

								<!-- Warnings / Info -->
								{#if isRequired}
									<div
										class="mt-3 flex items-start gap-2 text-yellow-500 text-xs bg-yellow-900/20 p-2 rounded"
									>
										<InfoCircleSolid class="w-4 h-4 mt-0.5 shrink-0" />
										<span>Required by another selection.</span>
									</div>
								{/if}

								{#if isInConflict(capability)}
									<div
										class="mt-3 flex items-start gap-2 text-red-400 text-xs bg-red-900/20 p-2 rounded"
									>
										<InfoCircleSolid class="w-4 h-4 mt-0.5 shrink-0" />
										<span>Conflicts with: {getConflictingCapabilities(capability).join(', ')}</span>
									</div>
								{/if}

								{#if isMissingDependencies(capability)}
									<div
										class="mt-3 flex items-start gap-2 text-yellow-400 text-xs bg-yellow-900/20 p-2 rounded"
									>
										<InfoCircleSolid class="w-4 h-4 mt-0.5 shrink-0" />
										<span>Requires: {getMissingDependencies(capability).join(', ')}</span>
									</div>
								{/if}
							</div>

							<!-- Configuration Section (Only if selected and has config) -->
							{#if isSelected && capability.configurationSchema && Object.keys(capability.configurationSchema.properties || {}).length > 0}
								<div class="px-6 py-4 bg-gray-900/50 border-t border-gray-700/50" transition:slide>
									<div class="space-y-4">
										<h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
											Configuration
										</h4>
										{#each Object.entries(capability.configurationSchema.properties) as [field, property]}
											{#if shouldDisplayRule(property)}
												<div onclick={(e) => e.stopPropagation()}>
													<label
														for="{capability.id}-{field}"
														class="block text-xs font-medium text-gray-300 mb-1.5"
													>
														{formatLabel(field)}
													</label>
													{#if property.enum}
														<select
															id="{capability.id}-{field}"
															class="block w-full pl-3 pr-10 py-2 text-sm border-gray-600 focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-md bg-gray-800 text-white shadow-sm"
															value={configuration[capability.id]?.[field] || property.default}
															onchange={(e) =>
																handleConfigurationChange(capability.id, field, e.target.value)}
														>
															{#each property.enum as option}
																<option value={option}>{option}</option>
															{/each}
														</select>
													{:else if property.type === 'boolean'}
														<div class="flex items-center">
															<input
																type="checkbox"
																id="{capability.id}-{field}"
																class="form-checkbox h-4 w-4 text-green-500 rounded focus:ring-green-400 cursor-pointer border-gray-600 bg-gray-800"
																checked={configuration[capability.id]?.[field] ||
																	property.default ||
																	false}
																onchange={(e) =>
																	handleConfigurationChange(capability.id, field, e.target.checked)}
															/>
															<span class="ml-2 text-sm text-gray-300">Enabled</span>
														</div>
													{:else if property.type === 'array' && property.items && property.items.enum}
														<div class="flex flex-wrap gap-2">
															{#each property.items.enum as option}
																<label
																	class="inline-flex items-center bg-gray-800 px-2 py-1 rounded border border-gray-600"
																>
																	<input
																		type="checkbox"
																		class="form-checkbox h-3 w-3 text-green-500 rounded focus:ring-green-400 cursor-pointer border-gray-500 bg-gray-700"
																		checked={configuration[capability.id]?.[field]?.includes(
																			option
																		) || false}
																		onchange={(e) => {
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
																	<span class="ml-1.5 text-gray-300 text-xs">{option}</span>
																</label>
															{/each}
														</div>
													{:else if property.type === 'object' && field === 'thresholds' && property.properties.performance}
														<div>
															<input
																type="number"
																class="block w-full pl-3 pr-3 py-2 text-sm border-gray-600 focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-md bg-gray-800 text-white"
																min={property.properties.performance.minimum}
																max={property.properties.performance.maximum}
																value={configuration[capability.id]?.thresholds?.performance ||
																	property.properties.performance.default ||
																	0}
																onchange={(e) =>
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
															class="block w-full pl-3 pr-3 py-2 text-sm border-gray-600 focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-md bg-gray-800 text-white"
															value={configuration[capability.id]?.[field] ||
																property.default ||
																''}
															onchange={(e) =>
																handleConfigurationChange(capability.id, field, e.target.value)}
														/>
													{/if}
												</div>
											{/if}
										{/each}
									</div>
								</div>
							{/if}

							<!-- Benefits Section (Footer) -->
							<div class="mt-auto border-t border-gray-700/50">
								{#if capability.benefits && capability.benefits.length > 0}
									<button
										class="w-full flex items-center justify-between p-4 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700/30 transition-colors benefits-toggle text-left focus:outline-none"
										onclick={(e) => {
											e.stopPropagation();
											toggleBenefits(capability.id);
										}}
									>
										<span class="uppercase tracking-wider">Why use this?</span>
										<svelte:component
											this={expandedCapabilities[capability.id] ? ChevronUpSolid : ChevronDownSolid}
											class="w-3 h-3"
										/>
									</button>

									{#if expandedCapabilities[capability.id]}
										<div class="px-6 pb-6 pt-2 bg-gray-900/30" transition:slide={{ duration: 200 }}>
											<ul class="space-y-2">
												{#each capability.benefits as benefit}
													<li class="flex items-start text-sm text-gray-300">
														<CheckCircleSolid class="w-4 h-4 text-green-500 mr-2 mt-0.5 shrink-0" />
														<span>{benefit}</span>
													</li>
												{/each}
											</ul>
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

<style>
	/* Custom scrollbar for config sections if needed */
	select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
		background-position: right 0.5rem center;
		background-repeat: no-repeat;
		background-size: 1.5em 1.5em;
	}
</style>
