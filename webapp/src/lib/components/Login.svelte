<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { children } = $props();

	async function onClick() {
		if ($page.data.user) {
			goto(window.location.pathname);
			return;
		}

		goto('/auth');
	}
</script>

<button onclick={onClick}>
	{@render children?.()}
</button>
