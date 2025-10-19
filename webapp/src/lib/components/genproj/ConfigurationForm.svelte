<!--
	ConfigurationForm.svelte
	
	Form component for configuring project details and capabilities.
	Handles project name, description, and capability-specific configuration options.
	
	Features:
	- Project basic information form
	- Capability-specific configuration sections
	- Real-time validation
	- Responsive design
	- Accessibility support
-->

<script>
	import { createEventDispatcher } from 'svelte';
	import { selectedCapabilities, capabilityValidation } from '$lib/client/capability-store.js';
	import { CAPABILITIES as capabilities } from '$lib/utils/capabilities.js';

	// Props
	export let projectConfig = {
		name: '',
		description: '',
		repositoryUrl: '',
		isPrivate: false,
		capabilityConfigs: {}
	};

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Reactive state
	let formData = { ...projectConfig };
	let validationErrors = {};
	let isSubmitting = false;

	// Reactive validation
	$: {
		validationErrors = validateForm(formData);
	}

	/**
	 * Validates the form data
	 * @param {Object} data - Form data to validate
	 * @returns {Object} Validation errors object
	 */
	function validateForm(data) {
		const errors = {};

		// Project name validation
		if (!data.name.trim()) {
			errors.name = 'Project name is required';
		} else if (data.name.length < 3) {
			errors.name = 'Project name must be at least 3 characters';
		} else if (!/^[a-zA-Z0-9-_]+$/.test(data.name)) {
			errors.name = 'Project name can only contain letters, numbers, hyphens, and underscores';
		}

		// Repository URL validation (if provided)
		if (data.repositoryUrl && !isValidRepositoryUrl(data.repositoryUrl)) {
			errors.repositoryUrl = 'Please enter a valid GitHub repository URL';
		}

		// Capability-specific validation
		for (const capabilityId of $selectedCapabilities) {
			const capability = capabilities[capabilityId];
			if (capability?.configSchema) {
				const capabilityConfig = data.capabilityConfigs[capabilityId] || {};
				const capabilityErrors = validateCapabilityConfig(capability, capabilityConfig);
				if (Object.keys(capabilityErrors).length > 0) {
					errors[`capability_${capabilityId}`] = capabilityErrors;
				}
			}
		}

		return errors;
	}

	/**
	 * Validates a repository URL
	 * @param {string} url - URL to validate
	 * @returns {boolean} Whether the URL is valid
	 */
	function isValidRepositoryUrl(url) {
		const githubUrlRegex = /^https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+$/;
		const sshUrlRegex = /^git@github\.com:[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+\.git$/;
		return githubUrlRegex.test(url) || sshUrlRegex.test(url);
	}

	/**
	 * Validates capability-specific configuration
	 * @param {Object} capability - Capability definition
	 * @param {Object} config - Configuration to validate
	 * @returns {Object} Validation errors
	 */
	function validateCapabilityConfig(capability, config) {
		const errors = {};

		if (capability.configSchema) {
			for (const [fieldName, fieldSchema] of Object.entries(capability.configSchema)) {
				const value = config[fieldName];

				if (fieldSchema.required && (!value || value.toString().trim() === '')) {
					errors[fieldName] = `${fieldSchema.label || fieldName} is required`;
				} else if (value && fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
					errors[fieldName] = fieldSchema.errorMessage || 'Invalid format';
				}
			}
		}

		return errors;
	}

	/**
	 * Handles form field changes
	 * @param {string} field - Field name
	 * @param {*} value - Field value
	 */
	function handleFieldChange(field, value) {
		formData = {
			...formData,
			[field]: value
		};

		dispatch('configChanged', { field, value, formData });
	}

	/**
	 * Handles capability configuration changes
	 * @param {string} capabilityId - Capability ID
	 * @param {string} field - Field name
	 * @param {*} value - Field value
	 */
	function handleCapabilityConfigChange(capabilityId, field, value) {
		formData = {
			...formData,
			capabilityConfigs: {
				...formData.capabilityConfigs,
				[capabilityId]: {
					...formData.capabilityConfigs[capabilityId],
					[field]: value
				}
			}
		};

		dispatch('configChanged', {
			field: `capability_${capabilityId}_${field}`,
			value,
			formData
		});
	}

	/**
	 * Handles form submission
	 */
	function handleSubmit() {
		if (Object.keys(validationErrors).length > 0) {
			return;
		}

		isSubmitting = true;
		dispatch('submit', formData);

		// Reset submitting state after a delay
		setTimeout(() => {
			isSubmitting = false;
		}, 1000);
	}

	/**
	 * Checks if the form is valid
	 * @returns {boolean} Whether the form is valid
	 */
	function isFormValid() {
		return Object.keys(validationErrors).length === 0 && $selectedCapabilities.length > 0;
	}
</script>

<div class="configuration-form">
	<form on:submit|preventDefault={handleSubmit} class="space-y-8">
		<!-- Project Basic Information -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Project Name -->
				<div class="md:col-span-2">
					<label for="project-name" class="block text-sm font-medium text-gray-700 mb-2">
						Project Name *
					</label>
					<input
						id="project-name"
						type="text"
						bind:value={formData.name}
						on:input={(e) => handleFieldChange('name', e.target.value)}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
							{validationErrors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}"
						placeholder="my-awesome-project"
						required
					/>
					{#if validationErrors.name}
						<p class="mt-1 text-sm text-red-600">{validationErrors.name}</p>
					{/if}
				</div>

				<!-- Project Description -->
				<div class="md:col-span-2">
					<label for="project-description" class="block text-sm font-medium text-gray-700 mb-2">
						Project Description
					</label>
					<textarea
						id="project-description"
						bind:value={formData.description}
						on:input={(e) => handleFieldChange('description', e.target.value)}
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						placeholder="A brief description of your project..."
					></textarea>
				</div>

				<!-- Repository URL -->
				<div class="md:col-span-2">
					<label for="repository-url" class="block text-sm font-medium text-gray-700 mb-2">
						GitHub Repository URL
					</label>
					<input
						id="repository-url"
						type="url"
						bind:value={formData.repositoryUrl}
						on:input={(e) => handleFieldChange('repositoryUrl', e.target.value)}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
							{validationErrors.repositoryUrl ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}"
						placeholder="https://github.com/username/repository"
					/>
					{#if validationErrors.repositoryUrl}
						<p class="mt-1 text-sm text-red-600">{validationErrors.repositoryUrl}</p>
					{/if}
					<p class="mt-1 text-sm text-gray-500">Leave empty to create a new repository</p>
				</div>

				<!-- Private Repository -->
				<div class="flex items-center">
					<input
						id="is-private"
						type="checkbox"
						bind:checked={formData.isPrivate}
						on:change={(e) => handleFieldChange('isPrivate', e.target.checked)}
						class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
					/>
					<label for="is-private" class="ml-2 block text-sm text-gray-700">
						Private Repository
					</label>
				</div>
			</div>
		</div>

		<!-- Capability-Specific Configuration -->
		{#each $selectedCapabilities as capabilityId}
			{@const capability = capabilities[capabilityId]}
			{@const capabilityConfig = formData.capabilityConfigs[capabilityId] || {}}
			{@const capabilityErrors = validationErrors[`capability_${capabilityId}`] || {}}

			{#if capability?.configSchema}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">
						{capability.name} Configuration
					</h3>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						{#each Object.entries(capability.configSchema) as [fieldName, fieldSchema]}
							<div class="md:col-span-{fieldSchema.fullWidth ? '2' : '1'}">
								<label
									for="{capabilityId}-{fieldName}"
									class="block text-sm font-medium text-gray-700 mb-2"
								>
									{fieldSchema.label || fieldName}
									{#if fieldSchema.required}
										<span class="text-red-500">*</span>
									{/if}
								</label>

								{#if fieldSchema.type === 'select'}
									<select
										id="{capabilityId}-{fieldName}"
										bind:value={capabilityConfig[fieldName]}
										on:change={(e) =>
											handleCapabilityConfigChange(capabilityId, fieldName, e.target.value)}
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
											{capabilityErrors[fieldName] ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}"
									>
										<option value="">Select {fieldSchema.label || fieldName}</option>
										{#each fieldSchema.options as option}
											<option value={option.value}>{option.label}</option>
										{/each}
									</select>
								{:else if fieldSchema.type === 'textarea'}
									<textarea
										id="{capabilityId}-{fieldName}"
										bind:value={capabilityConfig[fieldName]}
										on:input={(e) =>
											handleCapabilityConfigChange(capabilityId, fieldName, e.target.value)}
										rows="3"
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
											{capabilityErrors[fieldName] ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}"
										placeholder={fieldSchema.placeholder || ''}
									></textarea>
								{:else}
									<input
										id="{capabilityId}-{fieldName}"
										type={fieldSchema.type || 'text'}
										bind:value={capabilityConfig[fieldName]}
										on:input={(e) =>
											handleCapabilityConfigChange(capabilityId, fieldName, e.target.value)}
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
											{capabilityErrors[fieldName] ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}"
										placeholder={fieldSchema.placeholder || ''}
										required={fieldSchema.required}
									/>
								{/if}

								{#if capabilityErrors[fieldName]}
									<p class="mt-1 text-sm text-red-600">{capabilityErrors[fieldName]}</p>
								{/if}

								{#if fieldSchema.helpText}
									<p class="mt-1 text-sm text-gray-500">{fieldSchema.helpText}</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/each}

		<!-- Form Actions -->
		<div class="flex flex-col sm:flex-row gap-4 justify-end">
			<button
				type="button"
				class="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
				on:click={() => dispatch('cancel')}
			>
				Cancel
			</button>

			<button
				type="submit"
				disabled={!isFormValid() || isSubmitting}
				class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if isSubmitting}
					<span class="flex items-center">
						<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Processing...
					</span>
				{:else}
					Continue to Preview
				{/if}
			</button>
		</div>
	</form>
</div>

<style>
	/* Form styling */
	.configuration-form {
		max-width: 4xl;
		margin: 0 auto;
	}

	/* Focus styles for accessibility */
	input:focus,
	textarea:focus,
	select:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	/* Error state styling */
	.border-red-300 {
		border-color: #fca5a5;
	}

	.focus\:ring-red-500:focus {
		--tw-ring-color: #ef4444;
	}

	.focus\:border-red-500:focus {
		border-color: #ef4444;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.configuration-form {
			padding: 1rem;
		}

		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
