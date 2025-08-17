<script>
	import {
		GithubBrands,
		LinkedinInBrands,
		EnvelopeRegular,
		CreditCardSolid
	} from 'svelte-awesome-icons';

	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		tippy('#deployments', {
			content: 'View Deployments & Preview Environments'
		});
		tippy('#credit-card-billing', {
			content: 'Credit Card Billing Tool'
		});
	});


</script>

<footer class="left-0 w-full overflow-hidden py-24">
	<div class="relative mx-auto max-w-7xl px-4 md:px-6">
		<p class="mb-2 block text-base font-bold tracking-tight text-green-400">NICK BRETT</p>
		<div class="flex flex-col md:flex-row border-t border-white/20 pt-8 text-sm text-white gap-6 md:gap-32">
			<div class="flex justify-center md:justify-start gap-2">
				<!-- Always show deploys icon -->
				<button
					id="deployments"
					onclick={() => {
						goto('/deploys');
					}}
					class="hover:text-green-400 cursor-pointer text-2xl size-8 md:size-[48px] flex items-center justify-center"
				>
					🚀
				</button>
				
				<!-- Credit Card Billing Tool icon -->
				<button
					id="credit-card-billing"
					onclick={() => {
						goto('/projects/ccbilling');
					}}
					class="hover:text-green-400 cursor-pointer size-8 md:size-[48px] flex items-center justify-center"
				>
					<CreditCardSolid />
				</button>
			</div>

			<div class="flex-1"></div>

			<div class="flex justify-center md:justify-end gap-4">
				<a
					href="mailto:nick@fintechnick.com"
					class="hover:text-green-400 size-8 md:size-[48px] p-1 flex items-center justify-center"
				>
					<EnvelopeRegular />
				</a>
				<a
					href="https://github.com/nickbrett1/ftn"
					class="hover:text-green-400 size-8 md:size-[48px] p-1 flex items-center justify-center"
				>
					<GithubBrands />
				</a>
				<a
					href="https://www.linkedin.com/in/nick-brett/"
					class="hover:text-sky-600 size-8 md:size-[48px] p-1 flex items-center justify-center"
				>
					<LinkedinInBrands />
				</a>
			</div>
		</div>
		
		<!-- Git info at bottom of footer -->
		<div class="mt-8 pt-4 border-t border-white/10 text-xs text-white/60 text-center">
			Branch: {__GIT_BRANCH__} | Commit: {__GIT_COMMIT__} | Env: preview
		</div>
	</div>
</footer>
