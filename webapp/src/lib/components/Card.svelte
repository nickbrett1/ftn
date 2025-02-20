<!-- Border wraps the inner card element -->
<!-- svelte-ignore a11y_click_events_have_key_events -->

<!-- Thanks to Yash Verma, and his blog on animating a card hover for this: 
 https://yashverma.me/blog/cards -->

<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let { children } = $props();
	let rect = null;

	function createClientRectTracker() {
		const action = (node) => {
			function update() {
				rect = node.getBoundingClientRect();
			}

			const handle = setInterval(update, 100);
			update();

			return {
				destroy() {
					clearInterval(handle);
				}
			};
		};

		return action;
	}

	const clientRectTracker = createClientRectTracker();

	let blob = $state();

	function handleMouseMove(ev) {
		blob.style.opacity = '1';

		blob.animate(
			[
				{
					transform: `translate(${ev.clientX - rect.left - rect.width / 2}px,${ev.clientY - rect.top - rect.height / 2}px)`
				}
			],
			{
				duration: 300,
				fill: 'forwards'
			}
		);
	}
</script>

<svelte:window onmousemove={handleMouseMove} />

<button
	onclick={bubble('click')}
	class={`
		bg-green-800/20
		rounded-lg
		relative
		overflow-hidden
		transition-all
		h-32 md:h-72 lg:h-96
		w-32 md:w-72 lg:w-96
	`}
>
	<div
		class={`
			cursor-pointer
			rounded-lg
			p-5
			h-full
			
			w-32 md:w-72 lg:w-96
			hover:bg-green-950/60
			overflow-hidden 
			relative
			transition-all`}
	>
		{@render children?.()}
	</div>
	<div
		class={`
			blur-2xl
			absolute
			-z-10
			top-0
			left-0
			h-32 md:h-72 lg:h-96
		w-32 md:w-72 lg:w-96
			rounded-full
			opacity-0
			bg-white/50
			transition-all
		`}
		bind:this={blob}
	></div>

	<div
		class={`
			invisible
			absolute
			-z-10
			top-0
			left-0
			h-32 md:h-72 lg:h-96
		w-32 md:w-72 lg:w-96
			rounded-full
		`}
		use:clientRectTracker
	></div>
</button>
