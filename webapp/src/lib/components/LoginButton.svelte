<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();

	let { label, class: clazz } = $props();
	
</script>

<button onclick={bubble('click')} type="button" class="${clazz}">
	<span>{label}</span>
</button>
