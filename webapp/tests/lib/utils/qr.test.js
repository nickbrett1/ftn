import { describe, it, expect } from 'vitest';
import { generateQrMatrix } from '$lib/utils/qr.js';

/**
 * Regression tests for the hand-rolled QR generator.
 *
 * These validate the generated matrix against the QR spec independently of the
 * encoder internals: we rebuild the function-module mask, walk the standard
 * zigzag, un-mask with mask pattern 0, and verify the Reed-Solomon ECC over the
 * extracted codewords. This catches the failure modes that make real scanners
 * beep without returning data (wrong data capacities, wrong format info,
 * over-reserved modules, truncated ECC).
 */

// ECC Level L capacities per version
const VERSIONS = [
	{ ver: 1, size: 21, dataCap: 19, ecc: 7 },
	{ ver: 2, size: 25, dataCap: 34, ecc: 10 },
	{ ver: 3, size: 29, dataCap: 55, ecc: 15 },
	{ ver: 4, size: 33, dataCap: 80, ecc: 20 }
];

// Format info for ECC L / mask 0 (0x77c4, MSB first) — modules are not masked
const FORMAT_BITS = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
const FORMAT_COORDS_COPY1 = [
	[8, 0],
	[8, 1],
	[8, 2],
	[8, 3],
	[8, 4],
	[8, 5],
	[8, 7],
	[8, 8],
	[7, 8],
	[5, 8],
	[4, 8],
	[3, 8],
	[2, 8],
	[1, 8],
	[0, 8]
];
const FORMAT_COORDS_COPY2 = [
	[20, 8],
	[19, 8],
	[18, 8],
	[17, 8],
	[16, 8],
	[15, 8],
	[14, 8],
	[8, 13],
	[8, 14],
	[8, 15],
	[8, 16],
	[8, 17],
	[8, 18],
	[8, 19],
	[8, 20]
];

// Independent GF(256) Reed-Solomon (primitive poly 0x11d)
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
	let x = 1;
	for (let i = 0; i < 255; i++) {
		EXP[i] = x;
		EXP[i + 255] = x;
		LOG[x] = i;
		x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
	}
}
const gmul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function generatorPoly(degree) {
	let poly = [1];
	for (let i = 0; i < degree; i++) {
		const next = new Array(poly.length + 1).fill(0);
		for (let j = 0; j < poly.length; j++) {
			next[j] ^= poly[j];
			next[j + 1] ^= gmul(poly[j], EXP[i]);
		}
		poly = next;
	}
	return poly;
}

function rsEcc(data, degree) {
	const gen = generatorPoly(degree);
	const res = new Uint8Array(data.length + degree);
	res.set(data, 0);
	for (let i = 0; i < data.length; i++) {
		const coef = res[i];
		if (coef !== 0) {
			for (let j = 0; j < gen.length; j++) {
				res[i + j] ^= gmul(gen[j], coef);
			}
		}
	}
	return res.slice(data.length);
}

// Standard function-module mask (finder+separator, timing, format info, dark module, alignment)
function buildFunctionMask(size) {
	const func = Array.from({ length: size }, () => new Array(size).fill(false));
	const finder = (r0, c0) => {
		for (let i = -1; i <= 7; i++) {
			for (let j = -1; j <= 7; j++) {
				const r = r0 + i;
				const c = c0 + j;
				if (r >= 0 && r < size && c >= 0 && c < size) func[r][c] = true;
			}
		}
	};
	finder(0, 0);
	finder(0, size - 7);
	finder(size - 7, 0);
	for (let i = 8; i < size - 8; i++) {
		func[6][i] = true;
		func[i][6] = true;
	}
	for (let i = 0; i < 9; i++) {
		func[8][i] = true;
		func[i][8] = true;
	}
	for (let i = 0; i < 8; i++) func[8][size - 1 - i] = true;
	for (let i = 0; i < 7; i++) func[size - 1 - i][8] = true;
	func[size - 8][8] = true; // dark module
	if (size >= 25) {
		// single alignment pattern at (size-7, size-7)
		const a = size - 7;
		for (let i = -2; i <= 2; i++) {
			for (let j = -2; j <= 2; j++) {
				func[a + i][a + j] = true;
			}
		}
	}
	return func;
}

// Extract codewords in standard zigzag order, unmasked with mask pattern 0
function extractCodewords(matrix, size) {
	const func = buildFunctionMask(size);
	const cw = [];
	let col = size - 1;
	let upward = true;
	let bitIdx = 0;
	let cur = 0;
	while (col > 0) {
		if (col === 6) col--;
		const rows = upward
			? Array.from({ length: size }, (_, i) => size - 1 - i)
			: Array.from({ length: size }, (_, i) => i);
		for (const r of rows) {
			for (const c of [col, col - 1]) {
				if (!func[r][c]) {
					const mask = (r + c) % 2 === 0;
					cur = (cur << 1) | ((matrix[r][c] ? 1 : 0) ^ (mask ? 1 : 0));
					if (++bitIdx % 8 === 0) {
						cw.push(cur);
						cur = 0;
					}
				}
			}
		}
		upward = !upward;
		col -= 2;
	}
	return cw;
}

// Pick a payload that lands in the given version
const payloadForVersion = (ver) =>
	({
		1: 'TOY-001',
		2: 'TOY-FIRE-ENGINE-001',
		3: 'BABY-YODA-PLUSH-EXTRA-SOFT-EDITION-42',
		4: 'A'.repeat(60)
	})[ver];

describe('qr.js QR code generation', () => {
	it.each(VERSIONS)(
		'version $ver ($size x $size) produces a structurally valid QR with correct ECC',
		({ ver, size, dataCap, ecc }) => {
			const code = payloadForVersion(ver);
			const { matrix } = generateQrMatrix(code);

			// Dimensions
			expect(matrix).toHaveLength(size);
			for (const row of matrix) expect(row).toHaveLength(size);

			// No unplaced (null) modules — every module is a dark/light value
			for (const row of matrix) {
				for (const mod of row) expect(mod).not.toBeNull();
			}

			// Codeword stream must be exactly dataCodewords + eccCodewords
			const codewords = extractCodewords(matrix, size);
			expect(codewords).toHaveLength(dataCap + ecc);

			const data = codewords.slice(0, dataCap);
			const eccBytes = codewords.slice(dataCap);

			// First data codeword = 0100 (byte mode) + count high nibble
			expect(data[0]).toBe(0x40 | ((code.length >> 4) & 0x0f));

			// Reed-Solomon ECC over the data must match the stored ECC
			expect([...rsEcc(new Uint8Array(data), ecc)]).toEqual(eccBytes);
		}
	);

	it('places the correct format info modules (ECC L, mask 0 = 0x77c4)', () => {
		const { matrix } = generateQrMatrix('TOY-001');
		for (let i = 0; i < 15; i++) {
			const [r1, c1] = FORMAT_COORDS_COPY1[i];
			const [r2, c2] = FORMAT_COORDS_COPY2[i];
			expect(matrix[r1][c1]).toBe(FORMAT_BITS[i] === 1);
			expect(matrix[r2][c2]).toBe(FORMAT_BITS[i] === 1);
		}
	});

	it('marks the dark module at (size-8, 8)', () => {
		const { matrix, size } = generateQrMatrix('TOY-001');
		expect(matrix[size - 8][8]).toBe(true);
	});

	it('throws for payloads that exceed the largest supported version', () => {
		expect(() => generateQrMatrix('X'.repeat(79))).toThrow(/too long/);
	});
});
