<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { initiateGoogleAuth, isUserAuthenticated } from '$lib/client/google-auth.js';

	let loggedIn = $state(false);

	let { loginCallback, children } = $props();

	// Check authentication status
	function checkAuthStatus() {
		const wasLoggedIn = loggedIn;
		loggedIn = isUserAuthenticated();
		
		// Only call callback if state actually changed
		if (wasLoggedIn !== loggedIn) {
			loginCallback?.(loggedIn);
		}
	}

	onMount(async () => {
		// Check initial auth status only
		checkAuthStatus();
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
