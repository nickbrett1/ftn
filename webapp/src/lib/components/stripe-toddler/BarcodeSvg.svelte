<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} code - Barcode string e.g. "TOY-FIRE-ENGINE-001"
	 * @property {number} [height] - Height of the barcode in px (default 50)
	 * @property {boolean} [showText] - Whether to show text label below (default true)
	 * @property {string} [class] - Extra CSS classes
	 */

	let {
		code = 'TOY-FIRE-ENGINE-001',
		height = 50,
		showText = true,
		class: className = ''
	} = $props();

	const CODE128_PATTERNS = [
		'212222',
		'222122',
		'222221',
		'121223',
		'121322',
		'131222',
		'122213',
		'122312',
		'132212',
		'221213',
		'221312',
		'231212',
		'112232',
		'122132',
		'122231',
		'113222',
		'123122',
		'123221',
		'223211',
		'221132',
		'221231',
		'213212',
		'223112',
		'312131',
		'311222',
		'321122',
		'321221',
		'312212',
		'322112',
		'322211',
		'212123',
		'212321',
		'232121',
		'111323',
		'131123',
		'131321',
		'112313',
		'132113',
		'132311',
		'211313',
		'231113',
		'231311',
		'112133',
		'112331',
		'132131',
		'113123',
		'113321',
		'133121',
		'313121',
		'211331',
		'231131',
		'312113',
		'312311',
		'332111',
		'314111',
		'221411',
		'431111',
		'111224',
		'111422',
		'121124',
		'121421',
		'141122',
		'141221',
		'112214',
		'112412',
		'122114',
		'122411',
		'142112',
		'142211',
		'241211',
		'221114',
		'411211',
		'421111',
		'211142',
		'214112',
		'411122',
		'211412',
		'211214',
		'211241',
		'214121',
		'411141',
		'411411',
		'412114',
		'412411',
		'421114',
		'421411',
		'211124',
		'211421',
		'214111',
		'241112',
		'134111',
		'111243',
		'113011',
		'411123',
		'412311',
		'211133',
		'211331',
		'311132',
		'311331',
		'113132',
		'113331',
		'311141',
		'314111',
		'311124',
		'311421',
		'314112',
		'2331112'
	];

	const bars = $derived.by(() => {
		const str = code || 'TOY-001';
		let checksum = 104; // Start B
		const indices = [104];

		for (let i = 0; i < str.length; i++) {
			const c = str.charCodeAt(i) - 32;
			const idx = c >= 0 && c <= 95 ? c : 0;
			indices.push(idx);
			checksum += (i + 1) * idx;
		}

		indices.push(checksum % 103);
		indices.push(106); // Stop

		const patternString = indices.map((i) => CODE128_PATTERNS[i] || '212222').join('');

		const result = [];
		let currentX = 15; // Quiet zone
		let isBar = true;

		for (let i = 0; i < patternString.length; i++) {
			const width = parseInt(patternString[i], 10) || 1;
			if (isBar) {
				result.push({ x: currentX, width });
			}
			currentX += width;
			isBar = !isBar;
		}

		return {
			rects: result,
			totalWidth: currentX + 15 // Right quiet zone
		};
	});
</script>

<div class="inline-block bg-white p-1 rounded-sm shadow-sm border border-gray-200 {className}">
	<svg
		viewBox="0 0 {bars.totalWidth} {height + (showText ? 18 : 0)}"
		class="w-full h-auto max-h-full block"
		xmlns="http://www.w3.org/2000/svg"
	>
		<!-- Quiet zone background -->
		<rect
			x="0"
			y="0"
			width={bars.totalWidth}
			height={height + (showText ? 18 : 0)}
			fill="#ffffff"
		/>

		<!-- Bars -->
		{#each bars.rects as rect}
			<rect x={rect.x} y="4" width={rect.width} height={height - 8} fill="#000000" />
		{/each}

		<!-- Label text -->
		{#if showText}
			<text
				x={bars.totalWidth / 2}
				y={height + 10}
				text-anchor="middle"
				font-family="monospace, sans-serif"
				font-size="11"
				font-weight="bold"
				fill="#000000"
			>
				{code}
			</text>
		{/if}
	</svg>
</div>
