<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { initiateGoogleAuth } from '$lib/client/google-auth.js';

	let { children } = $props();

	async function onClick() {
		if ($page.data.user) {
			goto(window.location.pathname);
			return;
		}

		await initiateGoogleAuth(window.location.pathname, goto);
	}
</script>

<button onclick={onClick}>
	{@render children?.()}
</button>
