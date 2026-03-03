<script>
	import Button from '$lib/components/Button.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Consulting Services - Fintech Nick</title>
</svelte:head>

<div class="min-h-screen bg-black text-white py-20 px-4">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header Section -->
		<div class="space-y-4">
			<h1 class="text-4xl md:text-6xl font-bold tracking-tighter">Consulting Services</h1>
			<p class="text-xl text-gray-400 max-w-2xl">
				Specialized expertise in financial technology, data engineering, and modern web applications.
			</p>
		</div>

		<!-- Services Grid -->
		<div class="grid md:grid-cols-2 gap-8">
			<div class="p-6 bg-gray-900/50 border border-gray-800 rounded-lg space-y-4">
				<h2 class="text-2xl font-bold text-blue-400">Fintech Architecture</h2>
				<p class="text-gray-300">
					Design and implementation of secure, scalable financial systems. From transaction processing
					to regulatory compliance.
				</p>
			</div>
			<div class="p-6 bg-gray-900/50 border border-gray-800 rounded-lg space-y-4">
				<h2 class="text-2xl font-bold text-green-400">Data Engineering</h2>
				<p class="text-gray-300">
					Building robust ETL pipelines using modern tools like dbt, DuckDB, and Cloudflare D1. Optimize your data flow and analytics.
				</p>
			</div>
			<div class="p-6 bg-gray-900/50 border border-gray-800 rounded-lg space-y-4">
				<h2 class="text-2xl font-bold text-purple-400">Cloud & AI Integration</h2>
				<p class="text-gray-300">
					Leveraging Cloudflare Workers, AI models, and edge computing to deliver high-performance user experiences.
				</p>
			</div>
			<div class="p-6 bg-gray-900/50 border border-gray-800 rounded-lg space-y-4">
				<h2 class="text-2xl font-bold text-yellow-400">Security Audits</h2>
				<p class="text-gray-300">
					Deep dive security reviews of your application stack, focusing on authentication, encryption, and data protection.
				</p>
			</div>
		</div>

		<!-- Pricing / Checkout Section -->
		<div class="p-8 bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl space-y-6 text-center">
			<h2 class="text-3xl font-bold">Initial Consultation</h2>
			<p class="text-lg text-gray-400">
				Book a 1-hour deep dive session to discuss your project requirements, challenges, and goals.
			</p>
			
			<div class="text-5xl font-bold py-4">$100.00 <span class="text-lg font-normal text-gray-500">/ hour</span></div>

			{#if form?.error}
				<div class="bg-red-900/30 border border-red-500/50 text-red-200 p-4 rounded-lg">
					{form.error}
				</div>
			{/if}

			<form method="POST" action="?/checkout" use:enhance>
				<Button type="submit" variant="primary" size="lg" class="w-full sm:w-auto px-12 py-4 text-xl">
					Book Session with Stripe
				</Button>
			</form>
			
			<p class="text-sm text-gray-500">
				Secure payment processed by Stripe. You'll be redirected to complete your booking.
			</p>
		</div>

		<div class="flex justify-center pt-8">
			<Button href="/" variant="secondary">Back to Home</Button>
		</div>
	</div>
</div>
