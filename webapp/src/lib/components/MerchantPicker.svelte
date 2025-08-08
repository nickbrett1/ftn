<script>
	import { onMount } from 'svelte';

	const {
		selectedMerchant = '',
		onSelect = () => {},
		placeholder = 'Select a merchant...'
	} = $props();

	let merchants = $state([]);
	let isLoading = $state(true);
	let error = $state('');
	let showManualInput = $state(false);
	let manualMerchant = $state('');

	async function loadMerchants() {
		try {
			isLoading = true;
			error = '';

			const response = await fetch('/projects/ccbilling/budgets/unassigned-merchants');
			if (!response.ok) {
				throw new Error('Failed to load merchants');
			}

			merchants = await response.json();
		} catch (err) {
			error = err.message;
		} finally {
			isLoading = false;
		}
	}

	function handleSelect(event) {
		const selectedValue = event.target.value;
		if (selectedValue) {
			onSelect(selectedValue);
		}
	}

	function handleManualInput() {
		if (manualMerchant.trim()) {
			onSelect(manualMerchant.trim());
		}
	}

	function handleManualKeyPress(event) {
		if (event.key === 'Enter' && manualMerchant.trim()) {
			onSelect(manualMerchant.trim());
		}
	}

	function toggleManualInput() {
		showManualInput = !showManualInput;
		if (!showManualInput) {
			manualMerchant = '';
		}
	}

	onMount(() => {
		loadMerchants();
	});
</script>

<div class="w-full">
	<label for="merchant-picker" class="block text-sm font-medium text-gray-300 mb-2">
		Select Merchant
	</label>

	{#if isLoading}
		<div class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-400">
			Loading merchants...
		</div>
	{:else if error}
		<div class="w-full px-3 py-2 bg-red-900 border border-red-700 rounded-md text-red-200">
			Error: {error}
		</div>
	{:else if merchants.length === 0 && !showManualInput}
		<div class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-400">
			No unassigned merchants found
		</div>
	{:else}
		{#if !showManualInput}
			<select
				id="merchant-picker"
				onchange={handleSelect}
				class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
				<option value="">{placeholder}</option>
				{#each merchants as merchant}
					<option value={merchant} selected={selectedMerchant === merchant}>
						{merchant}
					</option>
				{/each}
			</select>
			<p class="text-gray-500 text-xs mt-1">
				These merchants appear in your uploaded statements but haven't been assigned to any budget
				yet.
			</p>
		{:else}
			<input
				type="text"
				value={manualMerchant}
				oninput={(e) => (manualMerchant = e.target.value)}
				onkeypress={handleManualKeyPress}
				placeholder="Enter merchant name manually..."
				class="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			/>
			<p class="text-gray-500 text-xs mt-1">
				Enter the merchant name as it appears on your credit card statements
			</p>
		{/if}

		<div class="mt-2">
			<button
				type="button"
				onclick={toggleManualInput}
				class="text-blue-400 hover:text-blue-300 text-sm underline"
			>
				{showManualInput ? 'Use dropdown instead' : 'Enter manually'}
			</button>
		</div>
	{/if}
</div>
