<script>
	import { createEventDispatcher } from 'svelte';
	import Button from './Button.svelte';

	let { isOpen = false, merchantName = '', currentAllocation = '', newAllocation = '', autoAssociationBudget = '' } = $props();

	console.log('AutoAssociationUpdateModal props:', { isOpen, merchantName, currentAllocation, newAllocation, autoAssociationBudget });

	// Reactive statement to ensure proper reactivity
	$effect(() => {
		console.log('Modal effect triggered - isOpen changed to:', isOpen);
	});

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

<!-- Debug info - always visible -->
<div class="fixed top-4 right-4 bg-red-500 text-white p-2 rounded z-[9999] text-xs">
	Modal Debug: isOpen={isOpen}, merchant={merchantName}, current={currentAllocation}, new={newAllocation}
</div>

<!-- Additional debug info -->
<div class="fixed top-20 right-4 bg-blue-500 text-white p-2 rounded z-[9999] text-xs">
	Conditional Debug: {#if isOpen}SHOWING{/if}{#if !isOpen}HIDDEN{/if}
</div>

{#if isOpen}
	<div
		class="fixed inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center z-[9999] p-4"
		on:click={handleBackdropClick}
	>
		<div class="bg-yellow-300 border-4 border-red-500 rounded-lg shadow-xl max-w-md w-full p-6">
			<div class="flex items-center mb-4">
				<div class="flex-shrink-0">
					<svg
						class="h-6 w-6 text-red-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>
				<h3 class="ml-3 text-lg font-medium text-red-900">
					Update Auto-Association?
				</h3>
			</div>

			<div class="mb-6">
				<p class="text-sm text-red-800 mb-4">
					You're changing the allocation for <strong>{merchantName}</strong> from{' '}
					<strong>{autoAssociationBudget}</strong> to <strong>{newAllocation}</strong>.
				</p>
				<p class="text-sm text-red-800">
					Would you like to update the auto-association rule so that future charges from{' '}
					<strong>{merchantName}</strong> will automatically be allocated to{' '}
					<strong>{newAllocation}</strong>?
				</p>
			</div>

			<div class="flex flex-col sm:flex-row gap-3">
				<Button
					on:click={handleUpdateAutoAssociation}
					class="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
				>
					Update Auto-Association
				</Button>
				<Button
					on:click={handleSkip}
					class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800"
				>
					Skip
				</Button>
			</div>
		</div>
	</div>
{/if}