import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regression test for the Code 128 pattern table in BarcodeSvg.svelte.
 *
 * The table was shipped with 52 wrong entries: values 51-102 came from a
 * corrupted source, and the Start codes at 103-105 were invalid (e.g. Start B
 * was '311421' — width sum 12 instead of 11). A conformant scanner cannot
 * decode barcodes rendered with those patterns (characters map to the wrong
 * values, checksums fail). The canonical table below is the ISO/IEC 15417
 * pattern set, cross-checked against two independent implementations
 * (bwip-js and jsbarcode).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.resolve(
	__dirname,
	'../../../src/lib/components/stripe-toddler/BarcodeSvg.svelte'
);

// ISO/IEC 15417 Code 128 symbol table (index = symbol value; 103-106 = Start A/B/C, Stop)
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

function extractPatternTable() {
	const source = fs.readFileSync(componentPath, 'utf8');
	const match = source.match(/const CODE128_PATTERNS = \[([\s\S]*?)\];/);
	expect(match, 'CODE128_PATTERNS table not found in BarcodeSvg.svelte').not.toBeNull();
	return match[1].match(/'(\d+)'/g).map((s) => s.replace(/'/g, ''));
}

const PATTERNS = extractPatternTable();

describe('Code 128 pattern table (BarcodeSvg.svelte)', () => {
	it('matches the ISO/IEC 15417 symbol table exactly (all 107 entries)', () => {
		expect(PATTERNS).toHaveLength(107);
		expect(PATTERNS).toEqual(CANONICAL);
	});

	it('every data pattern (0-105) has total width 11 and Stop (106) has width 13', () => {
		for (let i = 0; i < 106; i++) {
			const sum = PATTERNS[i].split('').reduce((a, b) => a + Number(b), 0);
			expect(sum, `pattern[${i}] = ${PATTERNS[i]} must total 11`).toBe(11);
		}
		const stopSum = PATTERNS[106].split('').reduce((a, b) => a + Number(b), 0);
		expect(stopSum).toBe(13);
	});

	it('only uses bar/space widths 1-4', () => {
		for (const p of PATTERNS) {
			expect(p).toMatch(/^[1-4]+$/);
		}
	});

	it('contains 107 unique patterns (Code 128 symbols are distinct)', () => {
		expect(new Set(PATTERNS).size).toBe(107);
	});

	it('encodes the hyphen (ASCII 45 -> value 13) with the standard pattern', () => {
		expect(PATTERNS[13]).toBe('122132');
	});

	it('round-trips a hyphenated barcode through the component encode logic', () => {
		// Mirror the component's encoding (Start B + data + checksum + Stop),
		// then decode with the canonical table and verify byte-for-byte.
		const code = 'TOY-FIRE-ENGINE-001';
		let checksum = 104; // Start B
		const indices = [104];
		for (let i = 0; i < code.length; i++) {
			const c = code.charCodeAt(i) - 32;
			const idx = c >= 0 && c <= 95 ? c : 0;
			indices.push(idx);
			checksum += (i + 1) * idx;
		}
		indices.push(checksum % 103);
		indices.push(106); // Stop

		const patternString = indices.map((i) => PATTERNS[i]).join('|');

		// Decode: Start B, then values until checksum, then Stop
		const reverse = new Map(PATTERNS.map((p, i) => [p, i]));
		const parts = patternString.split('|');
		expect(parts[0]).toBe('211214'); // Start B
		const values = parts.slice(1, -2).map((p) => reverse.get(p));
		expect(values.some((v) => v === undefined)).toBe(false);
		const decoded = values.map((v) => String.fromCharCode(v + 32)).join('');
		expect(decoded).toBe(code);

		// Verify checksum
		const calc = values.reduce((acc, v, i) => acc + (i + 1) * v, 104);
		const checksumVal = reverse.get(parts[parts.length - 2]);
		expect(calc % 103).toBe(checksumVal);
	});
});
