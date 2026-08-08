import { describe, it, expect } from 'vitest';
import jsQR from 'jsqr';
import { generateQrMatrix } from '$lib/utils/qr.js';

/**
 * Round-trip regression tests: render the generated matrix as a pixel image
 * and decode it with jsQR (a real, independent QR decoder).
 *
 * This locks in the behaviour the Tera scanners rely on: the decoded text
 * must be byte-for-byte identical to the input — including hyphens, which
 * the production barcodes (TOY-FIRE-ENGINE-001, ...) contain.
 */

// Seed/demo barcodes from the toddler-admin inventory (all hyphenated)
const HYPHENATED_BARCODES = [
	'TOY-001',
	'TOY-FIRE-ENGINE-001',
	'TOY-YELLOW-DIGGER-002',
	'TOY-WOODEN-BLOCKS-003',
	'TOY-PLUSH-BEAR-004',
	'TOY-RACE-CAR-005',
	'TOY-STACKING-RINGS-006',
	'TOY-NEW-ITEM-123',
	'FIRE-ENGINE-ABC-123-XYZ'
];

/** Render a QR matrix to an RGBA pixel buffer with the given quiet zone. */
function matrixToImage(matrix, scale = 10, quiet = 4) {
	const size = matrix.length;
	const width = (size + quiet * 2) * scale;
	const height = width;
	const data = new Uint8ClampedArray(width * height * 4);

	const setPixel = (x, y, dark) => {
		const idx = (y * width + x) * 4;
		const v = dark ? 0 : 255;
		data[idx] = v;
		data[idx + 1] = v;
		data[idx + 2] = v;
		data[idx + 3] = 255;
	};

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const my = Math.floor(y / scale) - quiet;
			const mx = Math.floor(x / scale) - quiet;
			if (my < 0 || my >= size || mx < 0 || mx >= size) {
				setPixel(x, y, false);
				continue;
			}
			setPixel(x, y, matrix[my][mx]);
		}
	}

	return { data, width, height };
}

describe('QR generator jsQR round-trip', () => {
	for (const code of HYPHENATED_BARCODES) {
		it(`decodes "${code}" byte-for-byte (hyphens preserved)`, () => {
			const { matrix } = generateQrMatrix(code);
			const img = matrixToImage(matrix, 10, 4);
			const result = jsQR(img.data, img.width, img.height);

			expect(result).not.toBeNull();
			expect(result.data).toBe(code);
		});
	}

	it('decodes with the 4-module quiet zone the QrCodeSvg component renders', () => {
		// QrCodeSvg uses padding = 4 (ISO/IEC 18004 minimum)
		const { matrix } = generateQrMatrix('TOY-FIRE-ENGINE-001');
		const img = matrixToImage(matrix, 10, 4);
		const result = jsQR(img.data, img.width, img.height);
		expect(result?.data).toBe('TOY-FIRE-ENGINE-001');
	});

	it('still decodes with a smaller quiet zone (robustness margin)', () => {
		const { matrix } = generateQrMatrix('TOY-FIRE-ENGINE-001');
		const img = matrixToImage(matrix, 10, 2);
		const result = jsQR(img.data, img.width, img.height);
		expect(result?.data).toBe('TOY-FIRE-ENGINE-001');
	});

	it('covers every supported QR version (21x21 .. 33x33)', () => {
		const cases = [
			['TOY-001', 21],
			['TOY-FIRE-ENGINE-001', 25],
			['TOY-STORAGE-CONTAINER-SET-0123456789', 29],
			['TOY-TRACTOR-EXCAVATOR-DUMPER-CRANE-COMBINED-MEGA-SET-001', 33]
		];
		for (const [code, expectedSize] of cases) {
			const { matrix, size } = generateQrMatrix(code);
			expect(size).toBe(expectedSize);
			const img = matrixToImage(matrix, 10, 4);
			const result = jsQR(img.data, img.width, img.height);
			expect(result, `expected ${code} (v${size}) to decode`).not.toBeNull();
			expect(result.data).toBe(code);
		}
	});
});
