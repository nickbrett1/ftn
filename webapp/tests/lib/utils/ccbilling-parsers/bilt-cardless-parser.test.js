import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BiltCardlessParser } from '../../../../src/lib/utils/ccbilling-parsers/bilt-cardless-parser.js';

describe('BiltCardlessParser', () => {
	let parser;

	beforeEach(() => {
		parser = new BiltCardlessParser();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('canParse', () => {
		it('should detect Bilt Cardless statements', () => {
			const text = 'Bilt Palladium Card Nicholas Brett Cardless Inc. Column N.A.';
			expect(parser.canParse(text)).toBe(true);
		});

		it('should detect Bilt statements with Cardless', () => {
			const text = 'BILT CARD Cardless Inc.';
			expect(parser.canParse(text)).toBe(true);
		});

		it('should detect Bilt statements with Column N.A.', () => {
			const text = 'BILT CARD issued by Column N.A.';
			expect(parser.canParse(text)).toBe(true);
		});

		it('should detect Palladium statements', () => {
			const text = 'Bilt Palladium Card';
			expect(parser.canParse(text)).toBe(true);
		});

		it('should not detect other statements', () => {
			const text = 'CHASE BANK STATEMENT';
			expect(parser.canParse(text)).toBe(false);
		});

		it('should not detect Wells Fargo Bilt statements (handled by other parser)', () => {
			const text = 'WELLS FARGO BILT CARD';
			expect(parser.canParse(text)).toBe(false);
		});
	});

	describe('extractStatementDate', () => {
		it('should extract date from "New balance as of" pattern', () => {
			const text = 'New balance as of Mar 6, 2026';
			expect(parser.extractStatementDate(text)).toBe('2026-03-06');
		});

		it('should extract date from date range pattern', () => {
			const text = 'Jan 18 – Mar 6, 2026';
			expect(parser.extractStatementDate(text)).toBe('2026-03-06');
		});
	});

	describe('extractLast4Digits', () => {
		it('should return null from footer pattern (now disabled as unreliable)', () => {
			const text = '9900000001149667 Page 1 of 17';
			expect(parser.extractLast4Digits(text)).toBeNull();
		});

		it('should extract from account number pattern', () => {
			const text = 'Account Number: 1234';
			expect(parser.extractLast4Digits(text)).toBe('1234');
		});
	});

	describe('extractCharges', () => {
		it('should extract transactions correctly with exact dates', () => {
			const text = `
Transactions
Date Description Amount
Feb 7, 2026 MTA*NYCT PAYGO 2 BROADWAY NEW YORK 10004
NY USA
$3.00
Feb 13, 2026 BALANCE TRANSFER $10,165.79
Feb 13, 2026 APC Paris 39 rue Madame Paris 75006 FRAFRA $349.43
Total new charges in this period $10,518.22
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(3);

			expect(charges[0]).toMatchObject({
				merchant: 'Mta*Nyct Paygo',
				amount: 3.0,
				date: '2026-02-07'
			});

			expect(charges[1]).toMatchObject({
				merchant: 'Balance Transfer',
				amount: 10165.79,
				date: '2026-02-13'
			});
		});

		it('should extract from payments and credits section and preserve negative amounts', () => {
			const text = `
Payments and credits
Date Description Amount
Feb 19, 2026 MERCHANDISE RETURN -$76.47
Feb 19, 2026 PAYMENT THANK YOU $1,000.00
Total payments and credits in this period -$1,076.47
			`;

			const charges = parser.extractCharges(text);
			// Should include MERCHANDISE RETURN with negative amount but skip PAYMENT
			expect(charges).toHaveLength(1);
			expect(charges[0]).toMatchObject({
				merchant: 'Merchandise Return',
				amount: -76.47,
				date: '2026-02-19'
			});
		});

		it('should extract from fees section', () => {
			const text = `
Fees
Date Description Amount
Mar 6, 2026 ANNUAL FEE $495.00
Mar 6, 2026 ANNUAL FEE $95.00
Total fees charged in this period $590.00
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(2);
			expect(charges[0]).toMatchObject({
				merchant: 'Annual Fee',
				amount: 495.0,
				date: '2026-03-06'
			});
			expect(charges[1]).toMatchObject({
				merchant: 'Annual Fee',
				amount: 95.0,
				date: '2026-03-06'
			});
		});
	});

	describe('extractCardName', () => {
		it('should extract Bilt Palladium Card name', () => {
			const text = 'Some text with Bilt Palladium Card mentioned';
			expect(parser.extractCardName(text)).toBe('Bilt Palladium Card');
		});

		it('should extract Bilt World Elite Mastercard name', () => {
			const text = 'Some text with Bilt World Elite Mastercard mentioned';
			expect(parser.extractCardName(text)).toBe('Bilt World Elite Mastercard');
		});

		it('should return null when no card name matches', () => {
			const text = 'Just some random text';
			expect(parser.extractCardName(text)).toBeNull();
		});
	});

	describe('parse', () => {
		it('should parse a full sample text with card name and fees', async () => {
			const text = `
Bilt Palladium Card
Jan 18 – Mar 6, 2026
New balance as of Mar 6, 2026
$20,505.78

Transactions
Date Description Amount
Feb 7, 2026 MTA*NYCT PAYGO 2 BROADWAY NEW YORK 10004
NY USA
$3.00
Feb 13, 2026 APC Paris 39 rue Madame Paris 75006 FRAFRA $349.43

Payments and credits
Date Description Amount
Feb 19, 2026 MERCHANDISE RETURN -$76.47

Fees
Date Description Amount
Mar 6, 2026 ANNUAL FEE $495.00

9900000001149667 Page 1 of 17
			`;

			const result = await parser.parse(text);
			expect(result.last4).toBeNull();
			expect(result.card_name).toBe('Bilt Palladium Card');
			expect(result.statement_date).toBe('2026-03-06');
			expect(result.charges).toHaveLength(4); // 2 transactions + 1 refund + 1 fee
			expect(result.charges).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ merchant: 'Annual Fee', amount: 495.0 }),
					expect.objectContaining({ merchant: 'Merchandise Return', amount: -76.47 })
				])
			);
		});
	});
});
