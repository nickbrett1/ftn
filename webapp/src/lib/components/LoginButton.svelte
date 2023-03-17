<script>
	import { createEventDispatcher } from 'svelte';

	export let label;

	const dispatch = createEventDispatcher();
	function onClick() {
		dispatch('click');
	}
</script>

<button on:click={onClick}
		type="button"
		class="flex rounded border border-blue-900 bg-blue-800 px-2 py-2 uppercase text-white hover:border-white hover:bg-blue-900"
>
	<svg
			class="align-vertical mr-3 h-5 w-5 fill-current"
			xmlns="http://www.w3.org/2000/svg"
		>
		<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
	</svg>
	<span>{label}</span>
</button>