<script>
	import Img from '@zerodevx/svelte-img';

	/**
	 * Click-to-zoom image.
	 *
	 * Renders the responsive `svelte-img` picture inline, and opens the full-resolution
	 * image in a native `<dialog>` lightbox when clicked. Inside the lightbox, clicking
	 * the image toggles between "fit to screen" and "actual size" (scrollable), and
	 * clicking the backdrop / pressing Escape closes it.
	 */
	let { src, alt = '', class: className = '' } = $props();

	let dialogEl = $state(undefined);
	let zoomed = $state(false);

	function open() {
		if (!dialogEl) return;
		if (typeof dialogEl.showModal === 'function') {
			dialogEl.showModal();
		} else {
			dialogEl.setAttribute('open', '');
		}
	}

	function close() {
		if (!dialogEl) return;
		if (typeof dialogEl.close === 'function') {
			dialogEl.close();
		} else {
			dialogEl.removeAttribute('open');
		}
		zoomed = false;
	}

	function handleDialogClick(event) {
		// A click landing directly on the dialog (not its children) is a backdrop click.
		if (event.target === dialogEl) close();
	}

	function toggleZoom() {
		zoomed = !zoomed;
	}
</script>

<button type="button" class="zoom-trigger not-prose" onclick={open} aria-label="Zoom in: {alt}">
	<Img {src} {alt} class={className} />
</button>

<dialog
	bind:this={dialogEl}
	class="zoom-dialog not-prose"
	class:zoomed
	onclick={handleDialogClick}
	onclose={() => (zoomed = false)}
>
	<button type="button" class="zoom-close" onclick={close} aria-label="Close zoomed image">✕</button
	>
	<button
		type="button"
		class="zoom-stage"
		onclick={toggleZoom}
		aria-label={zoomed ? 'Zoom out' : 'Zoom in further'}
	>
		<img src={src?.img?.src} {alt} class="zoom-img" loading="lazy" decoding="async" />
	</button>
</dialog>

<style>
	.zoom-trigger {
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: none;
		cursor: zoom-in;
	}

	.zoom-trigger :global(img) {
		display: block;
	}

	.zoom-trigger:hover :global(img) {
		opacity: 0.92;
	}

	.zoom-dialog {
		width: 100vw;
		height: 100vh;
		max-width: 100vw;
		max-height: 100vh;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		overflow: auto;
	}

	.zoom-dialog[open] {
		display: flex;
	}

	.zoom-dialog::backdrop {
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(2px);
	}

	.zoom-close {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 9999px;
		background: rgba(24, 24, 27, 0.8);
		color: #fff;
		font-size: 1.125rem;
		line-height: 1;
		cursor: pointer;
	}

	.zoom-close:hover {
		background: rgba(63, 63, 70, 0.95);
	}

	.zoom-stage {
		display: block;
		margin: auto;
		padding: 0;
		border: 0;
		background: none;
		line-height: 0;
		cursor: zoom-in;
	}

	.zoom-dialog.zoomed .zoom-stage {
		cursor: zoom-out;
	}

	.zoom-img {
		display: block;
		width: auto;
		height: auto;
		max-width: 95vw;
		max-height: 92vh;
		border-radius: 0.5rem;
	}

	.zoom-dialog.zoomed .zoom-img {
		max-width: none;
		max-height: none;
		border-radius: 0;
	}
</style>
