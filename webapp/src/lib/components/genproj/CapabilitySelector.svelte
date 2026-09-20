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
		RustBrands,
		DockerBrands,
		CloudflareBrands,
		GithubBrands,
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
	export let categories = [];
	export let selectedCapabilities = [];
	export let configuration = {};
	// Only used to show a default that depends on it (see displayDefault).
	export let projectName = '';
	// The project-level field list from the catalog (not attached to any single
	// capability) - today, `language`. Rendered as its own block above the
	// capability sections. The catalog owns the fields, their types, options and
	// labels; the component only renders what it is handed.
	export let configurationSchema = null;
	// Whether the project-level fields must be declared. genproj requires the
	// primary language once two or more devcontainer-* capabilities are selected
	// (with 0 or 1 it is implied); the page owns that rule and passes the verdict
	// down, so the marker the user sees matches the gate that blocks generation.
	export let projectConfigurationRequired = false;

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

	// The catalog owns the sections: their ids, headings and order. The client
	// renders what it is given rather than keeping its own list, so a new
	// category needs no client redeploy. A category that arrives in the data but
	// is missing from the catalog still renders — last, under its raw id — so a
	// capability can never be silently invisible.
	$: declaredCategories = new Map(categories.map((category) => [category.id, category]));

	$: renderedCategories = categories
		.filter((category) => category.visible !== false)
		.sort((a, b) => a.order - b.order);

	$: sectionIds = [
		...renderedCategories.map((category) => category.id),
		...Object.keys(capabilityGroups).filter((id) => !declaredCategories.has(id))
	].filter((id, index, all) => all.indexOf(id) === index);

	function getCategoryLabel(categoryId) {
		return (
			declaredCategories.get(categoryId)?.label ||
			(categoryId === 'Other' ? 'Other Capabilities' : categoryId)
		);
	}

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
			// Mutual exclusion: deselect any capability this one conflicts with
			// (e.g. deployment systems are mutually exclusive).
			const capability = capabilities.find((c) => c.id === capabilityId);
			const conflictingIds = capability?.conflicts || [];
			updatedSelection = [
				...selectedCapabilities.filter((id) => !conflictingIds.includes(id)),
				capabilityId
			];
		} else {
			// If unchecking, ensure it's not required by another selected capability
			const capability = capabilities.find((c) => c.id === capabilityId);
			if (capability?.selectedByDefault) {
				// Pre-selected (core) capabilities cannot be deselected
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
				...configuration[capabilityId],
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
				...configuration[capabilityId],
				[field]: {
					...configuration[capabilityId]?.[field],
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
		return !(property.enum && property.enum.length === 1);
	}

	// Helper function to format camelCase strings into human-readable labels
	function formatLabel(camelCaseString) {
		if (!camelCaseString) return '';
		const spacedString = camelCaseString.replaceAll(/([A-Z])/g, ' $1');
		return spacedString.charAt(0).toUpperCase() + spacedString.slice(1);
	}

	// A catalog `default` may carry the `{{projectName}}` token, because some
	// defaults ARE the project's name - the launcher the payload provides and
	// the directory it installs into. Resolved for display.
	function displayDefault(property) {
		const value = property?.default;
		if (typeof value !== 'string') return '';
		return value.replaceAll('{{projectName}}', projectName || 'your-project');
	}

	// A default that names the project is shown as a hint rather than put in the
	// box, so an untouched field still means "whatever the project is called".
	// Submitting it would freeze the name: rename the project afterwards and the
	// launcher would look for a binary the release does not contain.
	function isDerivedDefault(property) {
		return typeof property?.default === 'string' && property.default.includes('{{');
	}

	// The label to print for an enum value. The catalog names its options
	// (`enumLabels`) so a form can offer "macOS (Apple silicon)" while the value
	// submitted stays `aarch64-apple-darwin` - the identifier the build takes.
	// The map sits beside the `enum` it names, which for an array is on `items`.
	function optionLabel(property, option) {
		const labels = property?.enumLabels || property?.items?.enumLabels || {};
		return labels[option] || option;
	}

	// Whether that name is worth printing *in addition to* the value. It is for
	// a release target: a person picks "macOS (Apple silicon)", and the triple
	// underneath is the part they have to paste into a bug report.
	function hasOptionLabel(property, option) {
		return optionLabel(property, option) !== option;
	}

	// Project-level fields (from the catalog's top-level `configurationSchema`),
	// e.g. the primary `language`. They belong to no capability, so they render
	// in their own block above the capability sections rather than inside a card.
	$: projectProperties = Object.entries(configurationSchema?.properties || {}).filter(
		([_, property]) => shouldDisplayRule(property)
	);

	// The label for a project-level field. The catalog may name it (`title`);
	// otherwise the primary language is spelled out as "Primary Language"
	// rather than the bare "Language".
	function projectFieldLabel(field, property) {
		if (property?.title) return property.title;
		if (field === 'language') return 'Primary Language';
		return formatLabel(field);
	}

	// The languages the current selection implies: one per distinct
	// `devcontainer-<language>` capability that names a value in the field's
	// enum. The schema's own `enum` is the vocabulary, so the derivation stays
	// catalog-driven. Empty means "nothing implied"; two or more is ambiguous.
	function derivedProjectValues(property, selected) {
		if (!property?.enum) return [];
		const derived = new Set();
		for (const id of selected) {
			if (!id.startsWith('devcontainer-')) continue;
			const suffix = id.slice('devcontainer-'.length);
			if (property.enum.includes(suffix)) derived.add(suffix);
		}
		return [...derived];
	}

	// The name an override option offers: the catalog label where one exists,
	// else the raw value, with its first letter capitalised ("node" -> "Node").
	function overrideOptionLabel(property, option) {
		const label = optionLabel(property, option);
		return label.charAt(0).toUpperCase() + label.slice(1);
	}

	// Override options in alphabetical order by their displayed name, so the
	// list reads as a stable, scannable menu rather than in schema order.
	function overrideOptions(property) {
		return (property?.enum || [])
			.map((option) => ({ value: option, label: overrideOptionLabel(property, option) }))
			.sort((a, b) => a.label.localeCompare(b.label));
	}

	// What the selection currently implies, as read-only text: "None" when
	// nothing is implied, the language when exactly one is, and "Multiple" when
	// two or more distinct languages make it ambiguous (the override is then
	// required).
	function impliedProjectDisplay(property, selected) {
		const derived = derivedProjectValues(property, selected);
		if (derived.length === 0) return 'None';
		if (derived.length > 1) return 'Multiple';
		return overrideOptionLabel(property, derived[0]);
	}

	// The implied text for every project-level field, keyed by field. Written as
	// a reactive statement that names the selection as an argument, so the legacy
	// compiler records it as a dependency: a devcontainer picked after first
	// render must update the read-only text.
	$: impliedProjectValues = buildImpliedValues(projectProperties, selectedCapabilities);

	function buildImpliedValues(properties, selected) {
		const values = {};
		for (const [field, property] of properties) {
			values[field] = impliedProjectDisplay(property, selected);
		}
		return values;
	}

	// The override is the *explicit* choice only - never the implied value and
	// never the catalog default - so the combo starts blank ("no override") and
	// an untouched field keeps meaning "whatever the selection implies".
	function overrideValue(field, explicitConfiguration) {
		const explicit = explicitConfiguration[field];
		return explicit === undefined || explicit === null ? '' : explicit;
	}

	$: overrideValues = buildOverrideValues(projectProperties, configuration);

	function buildOverrideValues(properties, explicitConfiguration) {
		const values = {};
		for (const [field] of properties) {
			values[field] = overrideValue(field, explicitConfiguration);
		}
		return values;
	}

	// The value a plain (non-enum) project-level control shows: an explicit
	// choice wins, then the catalog default.
	function projectValue(field, property, explicitConfiguration) {
		const explicit = explicitConfiguration[field];
		if (explicit !== undefined && explicit !== null && explicit !== '') return explicit;
		if (property?.default !== undefined) return property.default;
		return '';
	}

	$: projectValues = buildProjectValues(projectProperties, configuration);

	function buildProjectValues(properties, explicitConfiguration) {
		const values = {};
		for (const [field, property] of properties) {
			values[field] = projectValue(field, property, explicitConfiguration);
		}
		return values;
	}

	function handleProjectConfigurationChange(field, value) {
		const updatedConfiguration = { ...configuration, [field]: value };
		dispatch('projectConfigurationChange', { field, value });
		dispatch('update:configuration', updatedConfiguration);
	}

	// Shared look for the `enum` combo boxes, matching the select styling the
	// ccbilling filter page uses: a lighter, bordered control on the dark card
	// so it reads as an input. `appearance-none` drops the browser's native
	// arrow, which is near-invisible on a dark background; an explicit chevron
	// is drawn over the control instead (see `enumSelectChevronClass`).
	const enumSelectClass =
		'block w-full appearance-none pl-3 pr-10 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 rounded-lg bg-gray-700 text-white shadow-sm cursor-pointer';
	// Positions the chevron over the right edge of a `relative` wrapper.
	const enumSelectChevronClass =
		'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3';

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
			// Ignore if internal (not selectable by user), but always show circleci
			return !(depCap && depCap.category === 'internal' && depId !== 'circleci');
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
				// Hide dependency if it's internal (not selectable by user), but always show circleci
				return !(depCap && depCap.category === 'internal' && depId !== 'circleci');
			})
			.map((depId) => {
				const missingCap = capabilities.find((c) => c.id === depId);
				return missingCap ? missingCap.name : depId;
			});
	}

	// Icon and colour are catalog data, not client hardcodes.
	//
	// The catalog names an `icon` / `iconColor` *token* per capability; these
	// registries map token -> imported glyph and token -> Tailwind class. A new
	// capability that reuses a token therefore needs no change here at all.
	// Only a genuinely new glyph does, because Svelte icons are compiled-in
	// components and cannot arrive over JSON. The `|| GlobeSolid` fallback keeps
	// an older catalog (no tokens) rendering instead of crashing.
	const iconRegistry = {
		robot: RobotSolid,
		code: CodeSolid,
		pencil: PenToSquareRegular,
		file: FileAltSolid,
		python: PythonBrands,
		node: NodeJsBrands,
		java: JavaBrands,
		rust: RustBrands,
		docker: DockerBrands,
		circle: CircleNotchSolid,
		github: GithubBrands,
		cloudflare: CloudflareBrands,
		cloud: CloudSolid,
		play: PlayCircleSolid,
		secret: UserSecretSolid,
		chart: ChartLineSolid,
		globe: GlobeSolid
	};
	const colorRegistry = {
		blue: 'text-blue-400',
		gray: 'text-gray-300',
		pink: 'text-pink-400',
		yellow: 'text-yellow-400',
		green: 'text-green-500',
		red: 'text-red-500',
		orange: 'text-orange-400',
		cyan: 'text-cyan-400',
		purple: 'text-purple-400'
	};

	// Helper function to get the icon component for a capability
	function getIconForCapability(capability) {
		return iconRegistry[capability?.icon] || GlobeSolid;
	}

	// Helper function to get the color class for a capability
	function getColorClassForCapability(capability) {
		return colorRegistry[capability?.iconColor] || 'text-gray-400';
	}
</script>

<div class="space-y-12">
	<!-- Project-level configuration (catalog `configurationSchema`): fields that
	     belong to the project, not to a capability. Rendered above the sections,
	     from catalog data alone. -->
	{#if projectProperties.length > 0}
		<div data-testid="project-configuration">
			<h2
				class="text-2xl font-bold text-white mb-6 flex items-center border-b border-gray-700 pb-2"
			>
				<span class="mr-2">Project Configuration</span>
				{#if projectConfigurationRequired}
					<span
						class="text-xs font-normal text-yellow-400 ml-auto"
						data-testid="project-config-required"
					>
						Required
					</span>
				{/if}
			</h2>

			<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
				{#each projectProperties as [field, property]}
					<div class="bg-gray-800 rounded-xl border-2 border-gray-700 p-6">
						{#if property.enum}
							<!-- The selection implies a value, shown read-only; only a
							     deliberate override is submitted. -->
							<h3 class="text-sm font-semibold text-white mb-3">
								{projectFieldLabel(field, property)}
								{#if projectConfigurationRequired}
									<span class="text-red-400" aria-hidden="true">*</span>
								{/if}
							</h3>
							<div class="space-y-3">
								<div>
									<span class="block text-xs font-medium text-gray-400 mb-1">Implied</span>
									<div
										data-testid="project-config-{field}-implied"
										class="block w-full px-3 py-2 text-sm rounded-lg bg-gray-900 border border-gray-700 text-gray-200"
									>
										{impliedProjectValues[field]}
									</div>
								</div>
								<div>
									<label
										for="project-{field}"
										class="block text-xs font-medium text-gray-300 mb-1.5"
									>
										Override
										{#if projectConfigurationRequired}
											<span class="text-red-400" aria-hidden="true">*</span>
										{/if}
									</label>
									<div class="relative">
										<select
											id="project-{field}"
											data-testid="project-config-{field}"
											class={enumSelectClass}
											value={overrideValues[field]}
											onchange={(e) => handleProjectConfigurationChange(field, e.target.value)}
										>
											<option value=""></option>
											{#each overrideOptions(property) as option}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
										<div class={enumSelectChevronClass}>
											<ChevronDownSolid class="w-4 h-4 text-gray-300" aria-hidden="true" />
										</div>
									</div>
								</div>
							</div>
						{:else}
							<label for="project-{field}" class="block text-xs font-medium text-gray-300 mb-1.5">
								{formatLabel(field)}
								{#if projectConfigurationRequired}
									<span class="text-red-400" aria-hidden="true">*</span>
								{/if}
							</label>
							{#if property.description}
								<p class="text-xs text-gray-400 mb-2">{property.description}</p>
							{/if}

							{#if property.type === 'boolean'}
								<div class="flex items-center">
									<input
										type="checkbox"
										id="project-{field}"
										data-testid="project-config-{field}"
										class="form-checkbox h-4 w-4 text-green-500 rounded focus:ring-green-400 cursor-pointer border-gray-600 bg-gray-800"
										checked={projectValues[field] || false}
										onchange={(e) => handleProjectConfigurationChange(field, e.target.checked)}
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
												checked={configuration[field]?.includes(option) || false}
												onchange={(e) => {
													const current = configuration[field] || [];
													const next = e.target.checked
														? [...current, option]
														: current.filter((item) => item !== option);
													handleProjectConfigurationChange(field, next);
												}}
											/>
											<span class="ml-1.5 text-gray-300 text-xs"
												>{optionLabel(property, option)}</span
											>
											{#if hasOptionLabel(property, option)}
												<span class="ml-1.5 text-gray-500 text-[10px] font-mono">{option}</span>
											{/if}
										</label>
									{/each}
								</div>
							{:else if property.type === 'number' || property.type === 'integer'}
								<input
									type="number"
									id="project-{field}"
									data-testid="project-config-{field}"
									class="block w-full pl-3 pr-3 py-2 text-sm border-gray-600 focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-md bg-gray-800 text-white"
									min={property.minimum}
									max={property.maximum}
									value={projectValues[field]}
									onchange={(e) => handleProjectConfigurationChange(field, Number(e.target.value))}
								/>
							{:else}
								<input
									type="text"
									id="project-{field}"
									data-testid="project-config-{field}"
									class="block w-full pl-3 pr-3 py-2 text-sm border-gray-600 focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-md bg-gray-800 text-white"
									value={projectValues[field]}
									onchange={(e) => handleProjectConfigurationChange(field, e.target.value)}
								/>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#each sectionIds as categoryId}
		{#if capabilityGroups[categoryId] && capabilityGroups[categoryId].length > 0}
			<div>
				<h2
					class="text-2xl font-bold text-white mb-6 flex items-center border-b border-gray-700 pb-2"
				>
					<span class="mr-2">{getCategoryLabel(categoryId)}</span>
					<span class="text-sm font-normal text-gray-500 ml-auto"
						>{capabilityGroups[categoryId].length} options</span
					>
				</h2>

				<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
					{#each capabilityGroups[categoryId] as capability (capability.id)}
						{@const isSelected =
							selectedCapabilities.includes(capability.id) || capability.selectedByDefault}
						{@const isPreselected = capability.selectedByDefault}
						{@const isRequired = isRequiredByOther(capability)}
						{@const visibleProperties = Object.entries(
							capability.configurationSchema?.properties || {}
						).filter(([_, property]) => shouldDisplayRule(property))}

						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<div
							class="group relative flex flex-col bg-gray-800 rounded-xl transition-all duration-200 border-2
                                {isSelected
								? 'border-green-500 shadow-lg shadow-green-900/20'
								: 'border-gray-700 hover:border-gray-500 shadow-md'}
								{isPreselected ? 'cursor-default' : ''}
                            "
							onclick={(e) => !isPreselected && handleCapabilityToggle(capability.id, e)}
						>
							<!-- Selection Indicator (Top Right) -->
							<div class="absolute top-4 right-4 z-10">
								<input
									id="capability-{capability.id}"
									type="checkbox"
									class="form-checkbox h-6 w-6 text-green-500 rounded focus:ring-green-400 border-gray-600 bg-gray-900 {isPreselected
										? 'opacity-50 cursor-not-allowed'
										: 'cursor-pointer'}"
									checked={isSelected}
									disabled={isRequired || isPreselected}
									onclick={(e) => e.stopPropagation()}
									onchange={(e) => handleCapabilityToggle(capability.id, e)}
								/>
							</div>

							<!-- Card Header -->
							<div class="p-6 pb-2 flex-grow">
								<div class="flex items-start pr-10">
									<div class="p-3 rounded-lg bg-gray-900 mr-4 shrink-0">
										<svelte:component
											this={getIconForCapability(capability)}
											class="w-8 h-8 {getColorClassForCapability(capability)}"
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

							<!-- Configuration Section (Only if selected and has visible config) -->
							{#if isSelected && visibleProperties.length > 0}
								<div class="px-6 py-4 bg-gray-900/50 border-t border-gray-700/50" transition:slide>
									<div class="space-y-4">
										<h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
											Configuration
										</h4>
										{#each visibleProperties as [field, property]}
											<div onclick={(e) => e.stopPropagation()}>
												<label
													for="{capability.id}-{field}"
													class="block text-xs font-medium text-gray-300 mb-1.5"
												>
													{formatLabel(field)}
												</label>
												{#if property.enum}
													<div class="relative">
														<select
															id="{capability.id}-{field}"
															class={enumSelectClass}
															value={configuration[capability.id]?.[field] || property.default}
															onchange={(e) =>
																handleConfigurationChange(capability.id, field, e.target.value)}
														>
															{#each property.enum as option}
																<option value={option}>{optionLabel(property, option)}</option>
															{/each}
														</select>
														<div class={enumSelectChevronClass}>
															<ChevronDownSolid class="w-4 h-4 text-gray-300" aria-hidden="true" />
														</div>
													</div>
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
																		newArray = e.target.checked
																			? [...currentArray, option]
																			: currentArray.filter((item) => item !== option);
																		handleConfigurationChange(capability.id, field, newArray);
																	}}
																/>
																<span class="ml-1.5 text-gray-300 text-xs"
																	>{optionLabel(property, option)}</span
																>
																{#if hasOptionLabel(property, option)}
																	<span class="ml-1.5 text-gray-500 text-[10px] font-mono"
																		>{option}</span
																	>
																{/if}
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
												{:else if property.type === 'object' && property.properties && property.properties.enabled && property.properties.name}
													<div class="space-y-2">
														<div class="flex items-center">
															<input
																type="checkbox"
																id="{capability.id}-{field}-enabled"
																class="form-checkbox h-4 w-4 text-green-500 rounded focus:ring-green-400 cursor-pointer border-gray-600 bg-gray-800"
																checked={configuration[capability.id]?.[field]?.enabled ??
																	property.properties.enabled.default}
																onchange={(e) =>
																	handleNestedConfigurationChange(
																		capability.id,
																		field,
																		'enabled',
																		e.target.checked
																	)}
															/>
															<span class="ml-2 text-sm text-gray-300"
																>Enable {formatLabel(field)}</span
															>
														</div>
														{#if configuration[capability.id]?.[field]?.enabled ?? property.properties.enabled.default}
															<input
																type="text"
																id="{capability.id}-{field}-name"
																placeholder={property.properties.name.default || 'Name'}
																class="block w-full pl-3 pr-3 py-2 text-sm border-gray-600 focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-md bg-gray-800 text-white"
																value={configuration[capability.id]?.[field]?.name ||
																	property.properties.name.default ||
																	''}
																onchange={(e) =>
																	handleNestedConfigurationChange(
																		capability.id,
																		field,
																		'name',
																		e.target.value
																	)}
															/>
														{/if}
													</div>
												{:else if property.type === 'number' || property.type === 'integer'}
													<div>
														<input
															type="number"
															id="{capability.id}-{field}"
															class="block w-full pl-3 pr-3 py-2 text-sm border-gray-600 focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-md bg-gray-800 text-white"
															min={property.minimum}
															max={property.maximum}
															value={configuration[capability.id]?.[field] ??
																property.default ??
																''}
															onchange={(e) =>
																handleConfigurationChange(
																	capability.id,
																	field,
																	Number(e.target.value)
																)}
														/>
													</div>
												{:else}
													<input
														type="text"
														id="{capability.id}-{field}"
														class="block w-full pl-3 pr-3 py-2 text-sm border-gray-600 focus:outline-none focus:ring-green-500 focus:border-green-500 rounded-md bg-gray-800 text-white"
														value={configuration[capability.id]?.[field] ??
															(isDerivedDefault(property) ? '' : displayDefault(property))}
														placeholder={isDerivedDefault(property) ? displayDefault(property) : ''}
														onchange={(e) =>
															handleConfigurationChange(capability.id, field, e.target.value)}
													/>
												{/if}
											</div>
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
