<script>
	import { createPopover, melt } from '@melt-ui/svelte';
	import { fade, slide } from 'svelte/transition';
	import MobileNavigationItem from '$lib/components/MobileNavigationItem.svelte';

	const {
		elements: { trigger, content, arrow, close, overlay },
		states: { open }
	} = createPopover({
		// Allow page scrolling when popover links are clicked
		preventScroll: false,
		forceVisible: true
	});

	function hide() {
		open.set(false);
	}

	let { active, items = [], class: classes = '' } = $props();
</script>

<button
	type="button"
	class="group
		flex
		items-center rounded-full mr-4 bg-green-400/30 text-white px-4 py-2 text-sm font-medium backdrop-blur-md {classes}"
	use:melt={$trigger}
>
	menu
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		class="ml-2 h-auto w-4"
		aria-hidden="true"
	>
		<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
	</svg>

	<span class="sr-only">Open Navigation Menu</span>
</button>

{#if $open}
	<div
		use:melt={$overlay}
		transition:fade={{ duration: 300 }}
		class="fixed inset-0 z-50 bg-base-800/40 backdrop-blur-sm transition-all duration-300"
	></div>

	<div use:melt={$content}>
		<div use:melt={$arrow}></div>
		<div
			transition:slide={{ duration: 300 }}
			class="fixed inset-x-4 bottom-8 z-50 origin-top rounded-3xl bg-green-400/30 text-white p-8 ring-1 backdrop-blur-md"
		>
			<div class="flex flex-row-reverse items-center justify-between">
				<button aria-label="Close menu" class="-m-1 p-1 focus:outline-none" use:melt={$close}>
					<svg viewBox="0 0 24 24" aria-hidden="true" class="h-6 w-6 text-base-500">
						<path d="m17.25 6.75-10.5 10.5M6.75 6.75l10.5 10.5" fill="none" stroke="currentColor" />
					</svg>
				</button>
				<h2 class="font-semibold">menu</h2>
			</div>
			<nav class="mt-6">
				<ul class="-my-2 divide-y divide-white/10">
					{#each items as item (item)}
						<MobileNavigationItem current={item} {active} {hide} />
					{/each}
				</ul>
			</nav>
		</div>
	</div>
{/if}
