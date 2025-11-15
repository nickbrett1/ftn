<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	function handleLogin() {
		dispatch('login');
	}
</script>

<div data-testid="mock-login">
	<button on:click={handleLogin}>Login</button>
</div>
