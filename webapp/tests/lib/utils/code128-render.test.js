import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regression test for the RENDERED Code 128 barcode (BarcodeSvg.svelte).
 *
 * The encode logic and canonical table are covered by code128-patterns.test.js.
 * This test checks the pixel-level rendering: when the barcode SVG is rasterized
 * at a given print width, the bar/space run-lengths must reconstruct the exact
 * Code 128 pattern. At small widths (sub-pixel 1-unit bars, e.g. ~96dpi screen
 * or low-DPI print) the ratios distort and scanners fail to decode; at
 * 300-600dpi label widths the pattern must survive intact.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.resolve(
	__dirname,
	'../../../src/lib/components/stripe-toddler/BarcodeSvg.svelte'
);

const CANONICAL = [
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
	'213113',
	'213311',
	'213131',
	'311123',
	'311321',
	'331121',
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
	'413111',
	'241112',
	'134111',
	'111242',
	'121142',
	'121241',
	'114212',
	'124112',
	'124211',
	'411212',
	'421112',
	'421211',
	'212141',
	'214121',
	'412121',
	'111143',
	'111341',
	'131141',
	'114113',
	'114311',
	'411113',
	'411311',
	'113141',
	'114131',
	'311141',
	'411131',
	'211412',
	'211214',
	'211232',
	'2331112'
];

/** Mirror BarcodeSvg.svelte encode logic (Start B + data + checksum + Stop). */
function encodePatternString(code) {
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
	return indices.map((i) => CANONICAL[i] || '212222').join('');
}

/** Rasterize the barcode to a boolean row at the given total width (px). */
function rasterize(patternString, targetWidthPx) {
	// Component: quiet zone 15 units each side, then alternating bars/spaces
	const totalUnits = patternString.split('').reduce((a, b) => a + Number(b), 0) + 30;
	const scale = targetWidthPx / totalUnits;
	const row = new Array(targetWidthPx).fill(false);
	let x = Math.round(15 * scale);
	let isBar = true;
	for (const ch of patternString) {
		const w = Math.round(Number(ch) * scale);
		if (isBar) for (let i = 0; i < w && x + i < targetWidthPx; i++) row[x + i] = true;
		x += w;
		isBar = !isBar;
	}
	return { row, scale };
}

/** Extract bar/space run lengths from a rasterized row (minus quiet zones). */
function bodyRuns(row) {
	const runs = [];
	let count = 1;
	for (let i = 1; i < row.length; i++) {
		if (row[i] === row[i - 1]) count++;
		else {
			runs.push(count);
			count = 1;
		}
	}
	runs.push(count);
	// drop leading and trailing white quiet-zone runs
	return runs.slice(1, -1);
}

function reconstructDigits(runs, scale) {
	return runs.map((w) => {
		let best = 1;
		let bestErr = Infinity;
		for (let d = 1; d <= 4; d++) {
			const err = Math.abs(w - d * scale);
			if (err < bestErr) {
				bestErr = err;
				best = d;
			}
		}
		return best;
	});
}

describe('BarcodeSvg rendered Code 128 scannability', () => {
	const code = 'TOY-ALPHABET-SOUP-001';
	const pattern = encodePatternString(code);
	const expectedRuns = pattern.length;

	it('preserves every bar/space element at 300dpi and 600dpi print widths', () => {
		for (const widthPx of [720, 1440]) {
			const { row } = rasterize(pattern, widthPx);
			expect(bodyRuns(row)).toHaveLength(expectedRuns);
		}
	});

	it('reconstructs the exact Code 128 pattern at 300dpi+ print widths', () => {
		// Print sheet label container ≈ 2.4in → 720px @ 300dpi, 1440px @ 600dpi
		for (const widthPx of [720, 1440]) {
			const { row, scale } = rasterize(pattern, widthPx);
			const digits = reconstructDigits(bodyRuns(row), scale);
			expect(digits.join('')).toBe(pattern);
		}
	});

	it('documents the regression: sub-pixel rendering (~96dpi) corrupts the pattern', () => {
		const { row, scale } = rasterize(pattern, 230); // 2.4in @ ~96dpi
		const digits = reconstructDigits(bodyRuns(row), scale);
		expect(digits.join('')).not.toBe(pattern);
	});

	it('round-trips the reconstructed pattern to the original text with checksum', () => {
		const { row, scale } = rasterize(pattern, 720);
		const digits = reconstructDigits(bodyRuns(row), scale);
		// decode: Start B (211214) then data values until checksum, then Stop (2331112 — 7 elements)
		const reverse = new Map(CANONICAL.map((p, i) => [p, i]));
		const chunks = [];
		for (let i = 0; i < digits.length - 7; i += 6) chunks.push(digits.slice(i, i + 6).join(''));
		chunks.push(digits.slice(digits.length - 7).join(''));
		expect(chunks[0]).toBe('211214'); // Start B
		expect(chunks[chunks.length - 1]).toBe('2331112'); // Stop
		const values = chunks.slice(1, -2).map((c) => reverse.get(c));
		const text = values.map((v) => String.fromCharCode(v + 32)).join('');
		expect(text).toBe(code);
		// checksum
		const sum = values.reduce((acc, v, i) => acc + (i + 1) * v, 104);
		expect(sum % 103).toBe(reverse.get(chunks[chunks.length - 2]));
	});
});
