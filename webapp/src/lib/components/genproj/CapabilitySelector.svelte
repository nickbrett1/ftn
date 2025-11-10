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
		'devcontainer': 'Development Containers',
		'ci-cd': 'CI/CD',
		'code-quality': 'Code Quality',
		'secrets': 'Secrets Management',
		'deployment': 'Deployment',
		'monitoring': 'Monitoring & Testing',
	};

	// Order of categories for display
	const categoryOrder = [
		'devcontainer',
		'ci-cd',
		'code-quality',
		'secrets',
		'deployment',
		'monitoring',
		'Other',
	];

	// Handlers
	function handleCapabilityToggle(capabilityId, event) {
		const isChecked = event.target.checked;
		let updatedSelection;

		if (isChecked) {
			updatedSelection = [...selectedCapabilities, capabilityId];
		} else {
			updatedSelection = selectedCapabilities.filter((id) => id !== capabilityId);
		}
		dispatch('update:selectedCapabilities', updatedSelection);
	}

	function handleConfigurationChange(capabilityId, field, value) {
		const updatedConfiguration = {
			...configuration,
			[capabilityId]: {
				...(configuration[capabilityId] || {}),
				[field]: value,
			},
		};
		dispatch('update:configuration', updatedConfiguration);
	}

	function handleNestedConfigurationChange(capabilityId, field, nestedField, value) {
		const updatedConfiguration = {
			...configuration,
			[capabilityId]: {
				...(configuration[capabilityId] || {}),
				[field]: {
					...(configuration[capabilityId]?.[field] || {}),
					[nestedField]: value,
				},
			},
		};
		dispatch('update:configuration', updatedConfiguration);
	}

	// Helper function to determine if a rule should be displayed
	function shouldDisplayRule(rules) {
		// Hide if it's an enum with only one option
		if (rules.enum && rules.enum.length === 1) {
			return false;
		}
		// Add other conditions here if needed for non-enum single options
		// For now, we only hide single-option enums as per the original logic
		return true;
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
</script>

<style>
	/* Additional styles if needed */
</style>
