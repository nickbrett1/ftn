<!-- Border wraps the inner card element -->
<!-- svelte-ignore a11y_click_events_have_key_events -->

<!-- Thanks to Yash Verma, and his blog on animating a card hover for this: 
 https://yashverma.me/blog/cards -->

<script>
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let { children, onclick } = $props();
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

<div
	role="button"
	tabindex="0"
	onkeydown={() => {}}
	onkeyup={onclick}
	{onclick}
	class={`
		bg-green-800/20
		rounded-lg
		border-3
		border-green-400
		inset-shadow-neon-green
		shadow-neon-green
		relative
		transition-all
		overflow-hidden
		flex
	`}
>
	<div class="grid grid-cols-[1fr] grow">
		<div
			class={`
			row-start-1
			col-start-1
			grow
			flex
			cursor-pointer
			rounded-lg
			p-5
			hover:bg-green-950/60
			relative
			transition-all`}
		>
			{@render children?.()}
		</div>
		<div
			class={`
			row-start-1
			col-start-1
			grow
			blur-2xl
			-z-10
			top-0
			left-0
			rounded-full
			opacity-0
			bg-white/50
			transition-all
		`}
			bind:this={blob}
		></div>

		<div
			class={`
			row-start-1
			col-start-1
			grow
			invisible
			-z-10
			top-0
			left-0
			rounded-full
		`}
			use:clientRectTracker
		></div>
	</div>
</div>
