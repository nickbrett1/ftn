<script>
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	
	const dispatch = createEventDispatcher();
	
	export let isOpen = false;
	export let title = '';
	export let showCloseButton = true;
	export let maxWidth = 'max-w-2xl';
	export let padding = 'p-6';
	
	function handleClose() {
		dispatch('close');
	}
	
	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div 
		class="modal-backdrop"
		on:click={handleBackdropClick}
		transition:fade={{ duration: 200 }}
	>
		<!-- Modal Container -->
		<div 
			class="modal-container {maxWidth}"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			{#if title || showCloseButton}
				<div class="flex items-center justify-between border-b border-gray-700 {padding}">
					{#if title}
						<h2 class="text-xl font-semibold text-white">{title}</h2>
					{/if}
					{#if showCloseButton}
						<button
							on:click={handleClose}
							class="text-gray-400 hover:text-white transition-colors"
							aria-label="Close modal"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
			{/if}
			
			<!-- Content -->
			<div class="{padding}">
				<slot />
			</div>
		</div>
	</div>
{/if}

<style>
	/* Modal-specific styles moved from app.css */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(17, 24, 39, 0.75); /* gray-900 with opacity */
		z-index: 9999;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 1rem;
		overflow-y: auto;
	}

	/* Mobile modal positioning improvements */
	@media (max-width: 768px) {
		.modal-backdrop {
			align-items: flex-start;
			padding-top: 1rem;
		}
		
		.modal-backdrop > div {
			margin-top: 0;
		}
	}

	.modal-container {
		position: relative;
		background-color: rgb(17, 24, 39); /* gray-900 */
		border: 1px solid rgb(55, 65, 81); /* gray-700 */
		border-radius: 0.5rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		width: 100%;
		margin: 2rem auto;
	}

	/* Mobile modal adjustments */
	@media (max-width: 640px) {
		.modal-container {
			margin: 1rem auto;
			max-width: calc(100vw - 2rem);
		}
	}
</style>