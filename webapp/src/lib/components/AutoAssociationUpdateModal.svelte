<script>
	import { createEventDispatcher } from 'svelte';
	import Button from './Button.svelte';

	let {
		isOpen = false,
		merchantName = '',
		currentAllocation = '',
		newAllocation = '',
		autoAssociationBudget = '',
		isDeletionRequest = false
	} = $props();

	const dispatch = createEventDispatcher();

	function handleUpdateAutoAssociation() {
		dispatch('updateAutoAssociation');
	}

	function handleSkip() {
		dispatch('skip');
	}

	// Close modal when clicking outside
	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			dispatch('close');
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && handleBackdropClick(e)}
		role="button"
		tabindex="0"
		aria-label="Close modal"
	>
		<div class="bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-w-md w-full p-6">
			<div class="flex items-center mb-4">
				<div class="flex-shrink-0">
					<svg class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>
				<h3 class="ml-3 text-lg font-medium text-white">Update Auto-Association?</h3>
			</div>

			<div class="mb-6">
				{#if isDeletionRequest}
					<p class="text-sm text-gray-300 mb-4">
						You're changing the allocation for <strong>{merchantName}</strong> from{' '}
						<strong>{autoAssociationBudget}</strong> to <strong>Unallocated</strong>.
					</p>
					<p class="text-sm text-gray-300">
						Would you like to <strong>delete the auto-association rule</strong> for{' '}
						<strong>{merchantName}</strong>? This means future charges from this merchant{' '}
						will remain unallocated until manually assigned.
					</p>
				{:else}
					<p class="text-sm text-gray-300 mb-4">
						You're changing the allocation for <strong>{merchantName}</strong> from{' '}
						<strong>{autoAssociationBudget}</strong> to
						<strong>{newAllocation || 'Unallocated'}</strong>.
					</p>
					<p class="text-sm text-gray-300">
						Would you like to update the auto-association rule so that future charges from{' '}
						<strong>{merchantName}</strong> will automatically be allocated to{' '}
						<strong>{newAllocation || 'Unallocated'}</strong>?
					</p>
				{/if}
			</div>

			<div class="flex flex-col sm:flex-row gap-3">
				{#if isDeletionRequest}
					<Button
						onclick={handleUpdateAutoAssociation}
						class="flex-1 bg-red-600 hover:bg-red-700 text-white"
					>
						Delete Auto-Association
					</Button>
				{:else}
					<Button
						onclick={handleUpdateAutoAssociation}
						class="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
					>
						Update Auto-Association
					</Button>
				{/if}
				<Button onclick={handleSkip} class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800">
					Skip
				</Button>
			</div>
		</div>
	</div>
{/if}
