<script>
	import Button from '$lib/components/Button.svelte';
</script>

<svelte:head>
	<title>Payment Successful - Fintech Nick</title>
</svelte:head>

<div class="min-h-screen bg-black text-white flex items-center justify-center px-4">
	<div class="max-w-md w-full text-center space-y-8 p-8 bg-gray-900/50 border border-green-500/30 rounded-2xl">
		<div class="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
			</svg>
		</div>

		<div class="space-y-4">
			<h1 class="text-3xl font-bold">Payment Successful!</h1>
			<p class="text-gray-400">
				Thank you for booking a consulting session. I've received your payment and will be in touch shortly to schedule our deep dive.
			</p>
		</div>

		<div class="pt-4">
			<Button href="/" variant="primary" size="lg" class="w-full">Return Home</Button>
		</div>
	</div>
</div>
