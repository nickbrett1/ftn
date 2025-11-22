<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { initiateGoogleAuth } from '$lib/client/google-auth.js';

	let { children, loginCallback, redirectOnSuccess = globalThis.location.pathname } = $props(); // Added loginCallback prop and redirectOnSuccess prop

	async function onClick() {
		if ($page.data.user) {
			goto(redirectOnSuccess); // Use redirectOnSuccess here
			return;
		}

		try {
			await initiateGoogleAuth(redirectOnSuccess); // Use redirectOnSuccess here
			if (loginCallback) {
				loginCallback(true); // Notify parent of successful login initiation
			}
		} catch (error) {
			console.error('Login initiation failed:', error);
			if (loginCallback) {
				loginCallback(false); // Notify parent of failed login initiation
			}
			// Optionally, show an error message to the user
		}
	}
</script>

<button onclick={onClick}>
	{@render children?.()}
</button>
