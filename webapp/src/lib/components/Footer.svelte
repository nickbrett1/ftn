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
	import { goto } from '$app/navigation';
	import { isUserAuthenticated } from '$lib/client/google-auth.js';
	import { formatDate } from '$lib/utils/date-utils.js';
	import { browser } from '$app/environment';

	let isLoggedIn = $state(false);
	let authCheckTimeout = $state(null);

	// Check if this is a preview deployment
	const isPreview = $derived(browser && window.location.hostname.includes('preview'));

	function loginStateUpdated(loggedIn) {
		isLoggedIn = loggedIn;
	}

	// Check authentication status
	function checkAuthStatus() {
		const authStatus = isUserAuthenticated();
		isLoggedIn = authStatus;
	}

	import Login from '$lib/components/Login.svelte';

	onMount(() => {
		// Check initial auth status with a small delay to ensure cookie is set
		authCheckTimeout = setTimeout(checkAuthStatus, 100);

		// Set up periodic auth status check (every 5 seconds)
		const authCheckInterval = setInterval(checkAuthStatus, 5000);

		const deploymentsTooltips = tippy('#deployments', {
			content: 'View Deployments & Preview Environments'
		});
		const loginTooltips = tippy('#login', {
			content: 'Credit Card Billing Tool'
		});
		const genprojTooltips = tippy('#genproj', {
			content: 'Project Generation Tool'
		});

		// Clean up tooltips when component unmounts
		return () => {
			clearInterval(authCheckInterval);
			if (authCheckTimeout) {
				clearTimeout(authCheckTimeout);
				authCheckTimeout = null;
			}
			// tippy returns an array, so we need to destroy each instance
			if (Array.isArray(deploymentsTooltips)) {
				deploymentsTooltips.forEach((tooltip) => tooltip.destroy());
			} else {
				deploymentsTooltips.destroy();
			}

			if (Array.isArray(loginTooltips)) {
				loginTooltips.forEach((tooltip) => tooltip.destroy());
			} else {
				loginTooltips.destroy();
			}

			if (Array.isArray(genprojTooltips)) {
				genprojTooltips.forEach((tooltip) => tooltip.destroy());
			} else {
				genprojTooltips.destroy();
			}
		};
	});

	function handleCreditCardClick() {
		if (isLoggedIn) {
			// User is already logged in, go directly to billing page
			goto('/projects/ccbilling');
		} else {
			// User is not logged in, show login modal
		}
	}
</script>

<footer class="left-0 w-full overflow-hidden py-24">
	<div class="relative mx-auto max-w-7xl px-4 md:px-6">
		<p class="mb-2 block text-base font-bold tracking-tight text-green-400">NICK BRETT</p>

		<div
			class="flex flex-col md:flex-row border-t border-white/20 pt-8 text-sm text-white gap-6 md:gap-8 justify-between items-center"
		>
			<div class="flex gap-2">
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
				{#if isLoggedIn}
					<!-- User is logged in, show clickable icon that goes directly to billing -->
					<button
						id="login"
						onclick={handleCreditCardClick}
						class="hover:text-green-400 cursor-pointer text-green-400 text-2xl size-8 md:size-[48px] flex items-center justify-center"
						title="Credit Card Billing Tool"
						ariaLabel="Credit Card Billing Tool"
						focusable="true"
					/>
				{:else}
					<!-- User is not logged in, show login modal -->
					<Login loginCallback={loginStateUpdated}>
						<button
							id="login"
							class="hover:text-green-400 cursor-pointer size-8 md:size-[48px]"
							ariaLabel="Credit Card Billing Tool"
							focusable="true"
						/>
					</Login>
				{/if}

				<!-- Project Generation Tool icon -->
				<button
					id="genproj"
					onclick={() => {
						goto('/projects/genproj');
					}}
					class="hover:text-green-400 cursor-pointer text-green-400 text-2xl size-8 md:size-[48px] flex items-center justify-center"
					title="Project Generation Tool"
				>
					🛠️
				</button>
			</div>

			<div class="flex gap-4">
				<a
					href="mailto:nick@fintechnick.com"
					class="hover:text-green-400 size-8 md:size-[48px] p-1 flex items-center justify-center"
				>
					<EnvelopeRegular ariaLabel="Email" focusable="true" />
				</a>
				<a
					href="https://github.com/nickbrett1/ftn"
					class="hover:text-green-400 size-8 md:size-[48px] p-1 flex items-center justify-center"
				>
					<GithubBrands ariaLabel="GitHub" focusable="true" />
				</a>
				<a
					href="https://www.linkedin.com/in/nick-brett/"
					class="hover:text-sky-600 size-8 md:size-[48px] p-1 flex items-center justify-center"
				>
					<LinkedinInBrands ariaLabel="LinkedIn" focusable="true" />
				</a>
			</div>
		</div>

		<!-- Git info at bottom of footer -->
		<div class="mt-8 pt-4 border-t border-white/10 text-xs text-white/60 text-center">
			Branch: {__GIT_BRANCH__} | Commit: {__GIT_COMMIT__} | Env: {isPreview
				? 'preview'
				: 'production'}
		</div>

		<!-- Build time info -->
		<div class="mt-2 text-xs text-white/40 text-center">
			Built: {formatDate(__BUILD_TIME__, { includeTime: true, includeTimezone: true })}
		</div>
	</div>
</footer>
