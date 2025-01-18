<!-- Border wraps the inner card element -->
<!-- svelte-ignore a11y-click-events-have-key-events -->

<!-- Thanks to Yash Verma, and his blog on animating a card hover for this: 
 https://yashverma.me/blog/cards -->

<script>
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

	let blob;

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

<svelte:window on:mousemove={handleMouseMove} />

<button
	on:click
	class={`
		bg-green-800/20
		p-1
		rounded-lg
		relative
		overflow-hidden
		transition-all
	`}
>
	<div
		class={`
			cursor-pointer
			rounded-lg
			p-5
			w-52
			h-40
			bg-gray-900
			hover:bg-gray-900/60
			overflow-hidden 
			relative
			transition-all`}
	>
		<slot />
	</div>
	<div
		class={`
			blur-2xl
			absolute
			-z-10
			top-0
			left-0
			w-64
			h-64
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
			w-64
			h-64
			rounded-full
		`}
		use:clientRectTracker
	></div>
</button>
