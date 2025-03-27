<script>
	import '../app.css';
	import { onMount } from 'svelte';
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let { children } = $props();

	onMount(async () => {});
</script>

<svelte:head>
	<meta name="theme-color" content="black" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
</svelte:head>

{@render children?.()}
