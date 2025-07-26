<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import './button.css';

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [primary] - Is this the principal call to action on the page?
	 * @property {string} [backgroundColor]
	 * @property {'small' | 'medium' | 'large'} [size]
	 * @property {string} label
	 */

	/** @type {Props} */
	let { primary = false, backgroundColor = undefined, size = 'medium', label } = $props();

	let mode = $derived(primary ? 'storybook-button--primary' : 'storybook-button--secondary');

	let style = $derived(backgroundColor ? `background-color: ${backgroundColor}` : '');
</script>

<button
	type="button"
	class={['storybook-button', `storybook-button--${size}`, mode].join(' ')}
	{style}
	onclick={bubble('click')}
>
	{label}
</button>
