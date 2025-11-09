<script>
	/* eslint-disable sonarjs/no-commented-code */
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
</svelte:head>

{@render children?.()}
