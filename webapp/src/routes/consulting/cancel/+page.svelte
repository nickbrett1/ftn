<script>
	import Button from '$lib/components/Button.svelte';
</script>

<svelte:head>
	<title>Payment Cancelled - Fintech Nick</title>
</svelte:head>

<div class="min-h-screen bg-black text-white flex items-center justify-center px-4">
	<div class="max-w-md w-full text-center space-y-8 p-8 bg-gray-900/50 border border-yellow-500/30 rounded-2xl">
		<div class="w-20 h-20 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</div>

		<div class="space-y-4">
			<h1 class="text-3xl font-bold">Payment Cancelled</h1>
			<p class="text-gray-400">
				The payment process was cancelled. No charges were made to your account.
			</p>
		</div>

		<div class="space-y-4 pt-4">
			<Button href="/consulting" variant="primary" size="lg" class="w-full">Try Again</Button>
			<Button href="/" variant="secondary" size="lg" class="w-full">Return Home</Button>
		</div>
	</div>
</div>
