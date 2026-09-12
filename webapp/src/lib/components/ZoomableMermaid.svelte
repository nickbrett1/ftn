<script>
	import { onMount } from 'svelte';

	/**
	 * Makes Mermaid diagrams (rendered to inline `<svg>` by `rehype-mermaid`) click-to-zoom.
	 *
	 * Drop `<ZoomableMermaid />` once into an article and it wires up every diagram on the
	 * page. Clicking a diagram opens it in a native `<dialog>` lightbox scaled to the
	 * viewport; clicking it again toggles to a larger (scrollable) size. Clicking the
	 * backdrop, pressing Escape, or the close button dismisses it.
	 */
	const SELECTOR = '.mermaid-container svg, svg[id^="mermaid-"]';

	let dialogEl = $state(undefined);
	let diagramHtml = $state('');
	let zoomed = $state(false);

	function open(svg) {
		if (!dialogEl) return;
		const clone = svg.cloneNode(true);
		// The clone carries an inline `max-width` that would cap the lightbox size.
		clone.style.maxWidth = 'none';
		clone.removeAttribute('height');
		diagramHtml = clone.outerHTML;
		zoomed = false;
		if (typeof dialogEl.showModal === 'function') {
			dialogEl.showModal();
		} else {
			dialogEl.setAttribute('open', '');
		}
	}

	function close() {
		if (dialogEl) {
			if (typeof dialogEl.close === 'function') {
				dialogEl.close();
			} else {
				dialogEl.removeAttribute('open');
			}
		}
		zoomed = false;
		diagramHtml = '';
	}

	function handleDialogClick(event) {
		if (event.target === dialogEl) close();
	}

	function toggleZoom() {
		zoomed = !zoomed;
	}

	onMount(() => {
		const diagrams = Array.from(document.querySelectorAll(SELECTOR));
		const cleanups = diagrams.map((svg) => {
			const onClick = () => open(svg);
			const onKeydown = (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					open(svg);
				}
			};
			svg.style.cursor = 'zoom-in';
			svg.setAttribute('tabindex', '0');
			svg.setAttribute('role', 'button');
			svg.setAttribute('aria-label', 'Zoom in on diagram');
			svg.addEventListener('click', onClick);
			svg.addEventListener('keydown', onKeydown);
			return () => {
				svg.removeEventListener('click', onClick);
				svg.removeEventListener('keydown', onKeydown);
			};
		});
		return () => cleanups.forEach((cleanup) => cleanup());
	});
</script>

<dialog
	bind:this={dialogEl}
	class="diagram-dialog not-prose"
	class:zoomed
	onclick={handleDialogClick}
	onclose={close}
>
	<button type="button" class="diagram-close" onclick={close} aria-label="Close diagram">✕</button>
	<button
		type="button"
		class="diagram-stage"
		onclick={toggleZoom}
		aria-label={zoomed ? 'Zoom out' : 'Zoom in further'}
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted, self-authored Mermaid SVG markup -->
		<div class="diagram-holder">{@html diagramHtml}</div>
	</button>
</dialog>

<style>
	.diagram-dialog {
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

	.diagram-dialog[open] {
		display: flex;
	}

	.diagram-dialog::backdrop {
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(2px);
	}

	.diagram-close {
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

	.diagram-close:hover {
		background: rgba(63, 63, 70, 0.95);
	}

	.diagram-stage {
		display: block;
		margin: auto;
		padding: 0;
		border: 0;
		background: none;
		line-height: 0;
		cursor: zoom-in;
	}

	.diagram-dialog.zoomed .diagram-stage {
		cursor: zoom-out;
	}

	.diagram-holder :global(svg) {
		display: block;
		width: 95vw;
		max-width: none;
		max-height: 92vh;
		height: auto;
	}

	.diagram-dialog.zoomed .diagram-holder :global(svg) {
		width: 190vw;
		max-height: none;
	}
</style>
