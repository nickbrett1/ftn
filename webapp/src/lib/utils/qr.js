/**
 * Compact, zero-dependency QR Code Matrix Generator (Byte Mode, EC Level L)
 */

// Reed-Solomon Galois Field GF(256) tables with primitive polynomial 0x11d
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGF() {
	let x = 1;
	for (let i = 0; i < 255; i++) {
		GF256_EXP[i] = x;
		GF256_EXP[i + 255] = x;
		GF256_LOG[x] = i;
		x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
	}
})();

function gfMul(x, y) {
	if (x === 0 || y === 0) return 0;
	return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function rsPolyMul(p1, p2) {
	const result = new Uint8Array(p1.length + p2.length - 1);
	for (let i = 0; i < p1.length; i++) {
		for (let j = 0; j < p2.length; j++) {
			result[i + j] ^= gfMul(p1[i], p2[j]);
		}
	}
	return result;
}

function getGeneratorPoly(degree) {
	let poly = new Uint8Array([1]);
	for (let i = 0; i < degree; i++) {
		poly = rsPolyMul(poly, new Uint8Array([1, GF256_EXP[i]]));
	}
	return poly;
}

function calculateEcc(data, numEccBytes) {
	const gen = getGeneratorPoly(numEccBytes);
	const res = new Uint8Array(data.length + numEccBytes);
	res.set(data, 0);

	for (let i = 0; i < data.length; i++) {
		const coef = res[i];
		if (coef !== 0) {
			for (let j = 0; j < gen.length; j++) {
				res[i + j] ^= gfMul(gen[j], coef);
			}
		}
	}
	return res.slice(data.length);
}

// QR Code Versions specs: [version, size, dataCapacity, eccBytes]
const QR_VERSIONS = [
	{ ver: 1, size: 21, dataCap: 17, ecc: 7 },
	{ ver: 2, size: 25, dataCap: 32, ecc: 10 },
	{ ver: 3, size: 29, dataCap: 53, ecc: 15 },
	{ ver: 4, size: 33, dataCap: 78, ecc: 20 }
];

/**
 * Encodes text into a boolean 2D matrix representing QR code dark modules.
 * @param {string} text
 * @returns {{ matrix: boolean[][], size: number }}
 */
export function generateQrMatrix(text) {
	const encoder = new TextEncoder();
	const utf8Bytes = encoder.encode(text || 'TOY-001');

	// Pick smallest matching QR version
	let spec = QR_VERSIONS[0];
	for (const v of QR_VERSIONS) {
		if (utf8Bytes.length + 3 <= v.dataCap) {
			spec = v;
			break;
		}
		spec = v;
	}

	const { size, dataCap, ecc } = spec;

	// Bit buffer
	const bits = [];
	function pushBits(val, len) {
		for (let i = len - 1; i >= 0; i--) {
			bits.push((val >> i) & 1);
		}
	}

	// Byte Mode indicator (0x4)
	pushBits(0x4, 4);
	// Character count (8 bits)
	pushBits(utf8Bytes.length, 8);
	// Payload
	for (let i = 0; i < utf8Bytes.length; i++) {
		pushBits(utf8Bytes[i], 8);
	}
	// Terminator bits (4 zeros)
	pushBits(0, 4);

	// Pad to full byte boundary
	while (bits.length % 8 !== 0) {
		bits.push(0);
	}

	// Pad bytes (0xEC, 0x11) up to dataCap
	const padPattern = [0xec, 0x11];
	let padIdx = 0;
	while (bits.length / 8 < dataCap) {
		pushBits(padPattern[padIdx % 2], 8);
		padIdx++;
	}

	// Convert bits to data byte array
	const dataBytes = new Uint8Array(dataCap);
	for (let i = 0; i < dataCap; i++) {
		let b = 0;
		for (let j = 0; j < 8; j++) {
			b = (b << 1) | bits[i * 8 + j];
		}
		dataBytes[i] = b;
	}

	// Calculate Reed-Solomon ECC
	const eccBytes = calculateEcc(dataBytes, ecc);

	// Final stream
	const codewords = new Uint8Array(dataCap + ecc);
	codewords.set(dataBytes, 0);
	codewords.set(eccBytes, dataCap);

	// Build matrix
	const matrix = Array.from({ length: size }, () => new Array(size).fill(null));

	// Helper to place finder pattern
	function placeFinder(r, c) {
		for (let i = -1; i <= 7; i++) {
			for (let j = -1; j <= 7; j++) {
				const nr = r + i;
				const nc = c + j;
				if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
					const isBlack =
						i >= 0 &&
						i <= 6 &&
						j >= 0 &&
						j <= 6 &&
						(i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
					matrix[nr][nc] = isBlack;
				}
			}
		}
	}

	placeFinder(0, 0);
	placeFinder(0, size - 7);
	placeFinder(size - 7, 0);

	// Timing patterns
	for (let i = 8; i < size - 8; i++) {
		if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
		if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
	}

	// Alignment pattern for Version 2+
	if (spec.ver >= 2) {
		const alignPos = size - 7;
		for (let i = -2; i <= 2; i++) {
			for (let j = -2; j <= 2; j++) {
				const r = alignPos + i;
				const c = alignPos + j;
				if (matrix[r][c] === null) {
					matrix[r][c] = Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0);
				}
			}
		}
	}

	// Format info area reservation
	for (let i = 0; i < 9; i++) {
		if (matrix[8][i] === null) matrix[8][i] = false;
		if (matrix[i][8] === null) matrix[i][8] = false;
		if (matrix[8][size - 1 - i] === null) matrix[8][size - 1 - i] = false;
		if (matrix[size - 1 - i][8] === null) matrix[size - 1 - i][8] = false;
	}
	matrix[size - 8][8] = true;

	// Place codewords in zigzag
	let bitIdx = 0;
	const totalBits = codewords.length * 8;

	let col = size - 1;
	let upward = true;

	while (col > 0) {
		if (col === 6) col--; // Skip vertical timing column

		const rows = upward
			? Array.from({ length: size }, (_, i) => size - 1 - i)
			: Array.from({ length: size }, (_, i) => i);

		for (const r of rows) {
			for (const c of [col, col - 1]) {
				if (matrix[r][c] === null) {
					let bit = false;
					if (bitIdx < totalBits) {
						const bytePos = Math.floor(bitIdx / 8);
						const bitPos = 7 - (bitIdx % 8);
						bit = ((codewords[bytePos] >> bitPos) & 1) === 1;
						bitIdx++;
					}
					// Data masking (Pattern 0: (r + c) % 2 === 0)
					const mask = (r + c) % 2 === 0;
					matrix[r][c] = bit ^ mask;
				}
			}
		}
		upward = !upward;
		col -= 2;
	}

	// Standard Format Info bits for Mask 0, ECC L (0x77c4 pattern)
	const formatBits = [1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
	const fCoords1 = [
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
	const fCoords2 = [
		[size - 1, 8],
		[size - 2, 8],
		[size - 3, 8],
		[size - 4, 8],
		[size - 5, 8],
		[size - 6, 8],
		[size - 7, 8],
		[8, size - 8],
		[8, size - 7],
		[8, size - 6],
		[8, size - 5],
		[8, size - 4],
		[8, size - 3],
		[8, size - 2],
		[8, size - 1]
	];

	for (let i = 0; i < 15; i++) {
		const val = formatBits[i] === 1;
		const [r1, c1] = fCoords1[i];
		matrix[r1][c1] = val;
		const [r2, c2] = fCoords2[i];
		matrix[r2][c2] = val;
	}

	return { matrix, size };
}
