<script>
	export let label;

	let clazz;
	export { clazz as class };
</script>

<button on:click type="button" class="${clazz}">
	<span>{label}</span>
</button>
