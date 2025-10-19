<!--
	ErrorBoundary.svelte
	
	Simple error boundary component for genproj tool.
	Catches and displays errors gracefully.
	
	Props:
	- children: Slot content to wrap
-->

<script>
	import { onMount } from 'svelte';
	
	let { children } = $props();
	let hasError = $state(false);
	let errorMessage = $state('');
	
	onMount(() => {
		// Reset error state when component mounts
		hasError = false;
		errorMessage = '';
	});
	
	function handleError(error) {
		console.error('ErrorBoundary caught error:', error);
		hasError = true;
		errorMessage = error.message || 'An unexpected error occurred';
	}
</script>

{#if hasError}
	<div class="bg-red-50 border border-red-200 rounded-md p-4">
		<div class="flex">
			<div class="flex-shrink-0">
				<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
				</svg>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-red-800">Error</h3>
				<div class="mt-2 text-sm text-red-700">
					<p>{errorMessage}</p>
				</div>
				<div class="mt-4">
					<button 
						onclick={() => { hasError = false; errorMessage = ''; }}
						class="bg-red-100 px-3 py-1 rounded text-sm text-red-800 hover:bg-red-200"
					>
						Try Again
					</button>
				</div>
			</div>
		</div>
	</div>
{:else}
	{@render children?.()}
{/if}
