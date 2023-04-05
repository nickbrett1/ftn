<script>
	import { createEventDispatcher } from 'svelte';

	export let label;

	let clazz;
	export { clazz as class };

	const dispatch = createEventDispatcher();
	function onClick() {
		dispatch('click');
	}
</script>

<button on:click={onClick}
		type="button"
		class="${clazz}">
	<span>{label}</span>
</button>