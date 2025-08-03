<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { initiateGoogleAuth } from '$lib/utils/google-auth.js';

	let loggedIn = $state(false);

	let { loginCallback, children } = $props();

	onMount(async () => {
		const match = document.cookie.match(/(^| )auth=([^;]+)/);
		const hasValidAuth = match !== null && match[2] !== 'deleted';
		loggedIn = hasValidAuth;
		loginCallback?.(loggedIn);
	});

	async function onClick() {
		if (loggedIn) {
			goto('/projects/ccbilling');
			return;
		}

		// Use the shared Google auth utility
		await initiateGoogleAuth('/projects/ccbilling');
	}
</script>

<button onclick={onClick}>
	{@render children?.()}
</button>
