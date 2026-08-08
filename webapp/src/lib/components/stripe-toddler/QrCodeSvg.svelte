<script>
	import { generateQrMatrix } from '$lib/utils/qr.js';

	/**
	 * @typedef {Object} Props
	 * @property {string} code - Barcode string e.g. "TOY-FIRE-ENGINE-001"
	 * @property {number} [size] - Height/width of the QR code in px (default 48)
	 * @property {boolean} [showText] - Whether to show text label below (default false)
	 * @property {string} [class] - Extra CSS classes
	 */

	let {
		code = 'TOY-FIRE-ENGINE-001',
		size = 48,
		showText = false,
		class: className = ''
	} = $props();

	const qr = $derived.by(() => {
		const { matrix, size: gridCount } = generateQrMatrix(code);
		const padding = 3; // Quiet zone modules
		const totalSize = gridCount + padding * 2;

		const modules = [];
		for (let r = 0; r < gridCount; r++) {
			for (let c = 0; c < gridCount; c++) {
				if (matrix[r][c]) {
					modules.push({ x: c + padding, y: r + padding });
				}
			}
		}

		return { totalSize, modules };
	});
</script>

<div
	class="inline-flex flex-col items-center bg-white p-1 rounded-sm shadow-sm border border-gray-200 {className}"
>
	<svg
		viewBox="0 0 {qr.totalSize} {qr.totalSize}"
		width={size}
		height={size}
		class="block"
		xmlns="http://www.w3.org/2000/svg"
		shape-rendering="crispEdges"
	>
		<!-- Quiet zone background -->
		<rect x="0" y="0" width={qr.totalSize} height={qr.totalSize} fill="#ffffff" />

		<!-- Dark Modules -->
		{#each qr.modules as mod}
			<rect x={mod.x} y={mod.y} width="1" height="1" fill="#000000" />
		{/each}
	</svg>

	{#if showText}
		<span class="text-[9px] font-mono font-bold tracking-tight text-gray-800 mt-0.5">
			{code}
		</span>
	{/if}
</div>
