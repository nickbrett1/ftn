<script>
	import {
		GithubBrands,
		LinkedinInBrands,
		EnvelopeRegular,
		UserSecretSolid
	} from 'svelte-awesome-icons';

	import tippy from 'tippy.js';
	import 'tippy.js/dist/tippy.css';
	import { onMount } from 'svelte';

	onMount(() => {
		tippy('#login', {
			content: 'Administrator Login'
		});
	});

	let isLoggedIn = $state(false);
	function loginStateUpdated(loggedIn) {
		isLoggedIn = loggedIn;
	}

	import Login from '$lib/components/Login.svelte';
</script>

<footer class="left-0 w-full overflow-hidden py-24">
	<div class="relative mx-auto max-w-7xl px-4 md:px-6">
		<p class="mb-2 block text-base font-bold tracking-tight text-green-400">NICK BRETT</p>
		<ul class="flex border-t border-white/20 pt-8 text-sm text-white sm:gap-32">
			<li class="flex">
				<Login loginCallback={loginStateUpdated}>
					{#if !isLoggedIn}
						<UserSecretSolid id="login" class="hover:text-red-600 cursor-pointer" />
					{/if}
				</Login>
			</li>

			<li class="flex-1 block"></li>

			<li class="flex">
				<a
					href="mailto:nick@fintechnick.com"
					class="hover:text-green-400 -mt-1 size-[48px] p-1 flex items-center justify-center"
				>
					<EnvelopeRegular /></a
				>
				<a
					href="https://github.com/nickbrett1/ftn"
					class=" -mt-1 size-[48px] p-1 flex items-center justify-center"
				>
					<GithubBrands />
				</a>

				<a
					href="https://www.linkedin.com/in/nick-brett/"
					class="hover:text-sky-600 -mt-1 size-[48px] p-1 flex items-center justify-center"
				>
					<LinkedinInBrands />
				</a>
			</li>
		</ul>
	</div>
</footer>
