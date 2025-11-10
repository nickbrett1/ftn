<script>
	import Card from '$lib/components/Card.svelte';
	import HoverFadeCard from '$lib/components/HoverFadeCard.svelte';
	import { LinkedinInBrands, EnvelopeRegular, EnvelopeOpenRegular } from 'svelte-awesome-icons';
</script>

<div id="contact" class="section">
	<div class="my-20 text-xl leading-none text-green-400">&rarr; CONTACT</div>

	<div
		class="grid gap-4 items-stretch auto-rows-fr grid-cols-[repeat(auto-fill,minmax(312px,1fr))] text-white"
	>
		<div class="md:p-6 text-pretty md:text-right text-3xl leading-tight tracking-tight">
			Have a project in mind? Drop me a note and I'll get back to you as soon as I can.
		</div>

		<HoverFadeCard onclick={() => (globalThis.location.href = 'mailto:nick@fintechnick.com')}>
			{#snippet initial()}
				<div class="flex flex-col items-center grow">
					<EnvelopeRegular aria-label="Email" class="size-20 grow" />
					<span class="text-xl leading-none content-center pt-2 grow">Email</span>
				</div>
			{/snippet}
			{#snippet onHover()}
				<div class="flex flex-col items-center grow">
					<EnvelopeOpenRegular aria-label="Email" class="size-20 grow" />
					<span class="text-xl leading-none content-center pt-2 grow">Email</span>
				</div>
			{/snippet}
		</HoverFadeCard>

		<Card onclick={() => (globalThis.location = 'https://www.linkedin.com/in/nick-brett/')}>
			<div class="flex flex-col items-center grow hover:text-sky-600">
				<LinkedinInBrands aria-label="LinkedIn" class="size-20 grow" />
				<span class="text-xl leading-none content-center pt-2 grow">LinkedIn</span>
			</div>
		</Card>
	</div>
</div>
