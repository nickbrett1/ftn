import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChaseParser } from './chase-parser.js';
import { ParsingUtils } from '../parsing-utils.js';

describe('ChaseParser', () => {
	let parser;

	beforeEach(() => {
		parser = new ChaseParser();
	});

	describe('constructor', () => {
		it('should initialize with correct provider name', () => {
			expect(parser.providerName).toBe('Chase');
		});
	});

	describe('canParse', () => {
		it('should detect Chase statements with JPMORGAN CHASE', () => {
			const chaseText = 'CHASE ACCOUNT SUMMARY JPMORGAN CHASE';
			expect(parser.canParse(chaseText)).toBe(true);
		});

		it('should detect Chase statements with CHASE BANK', () => {
			const chaseText = 'ACCOUNT ACTIVITY CHASE BANK';
			expect(parser.canParse(chaseText)).toBe(true);
		});

		it('should detect Chase statements with standalone CHASE word', () => {
			const chaseText = 'ACCOUNT ACTIVITY CHASE CREDIT CARD';
			expect(parser.canParse(chaseText)).toBe(true);
		});

		it('should not detect non-Chase statements', () => {
			const nonChaseText = 'AMEX STATEMENT SUMMARY';
			expect(parser.canParse(nonChaseText)).toBe(false);
		});

		it('should not detect Wells Fargo statements', () => {
			const wellsFargoText = 'WELLS FARGO ONLINE Cash Advance Limit';
			expect(parser.canParse(wellsFargoText)).toBe(false);
		});

		it('should not detect statements with CHASE in "Cash Advance"', () => {
			const textWithCashAdvance = 'Cash Advance Limit $4,000.00 Wells Fargo';
			expect(parser.canParse(textWithCashAdvance)).toBe(false);
		});

		it('should be case insensitive for valid Chase identifiers', () => {
			const chaseText = 'jpmorgan chase account summary';
			expect(parser.canParse(chaseText)).toBe(true);
		});

		it('should handle null input', () => {
			expect(parser.canParse(null)).toBe(false);
		});
	});

	describe('extractLast4Digits', () => {
		it('should extract last 4 digits from account number pattern', () => {
			const text = 'Account Number: XXXX XXXX XXXX 1234';
			expect(parser.extractLast4Digits(text)).toBe('1234');
		});

		it('should extract last 4 digits from alternative pattern', () => {
			const text = 'Account Number: 5678';
			expect(parser.extractLast4Digits(text)).toBe('5678');
		});

		it('should extract last 4 digits from masked pattern', () => {
			const text = 'XXXX XXXX XXXX 9012';
			expect(parser.extractLast4Digits(text)).toBe('9012');
		});

		it('should return null when no pattern matches', () => {
			const text = 'Some other text without account number';
			expect(parser.extractLast4Digits(text)).toBeNull();
		});
	});

	describe('extractStatementDate', () => {
		it('should extract closing date from opening/closing pattern', () => {
			const text = 'Opening/Closing Date 01/15/24 - 02/15/24';
			expect(parser.extractStatementDate(text)).toBe('2024-02-15');
		});

		it('should extract date from closing date pattern', () => {
			const text = 'Closing Date 03/15/24';
			expect(parser.extractStatementDate(text)).toBe('2024-03-15');
		});

		it('should extract date from statement date pattern', () => {
			const text = 'Statement Date 04/15/24';
			expect(parser.extractStatementDate(text)).toBe('2024-04-15');
		});

		it('should return null when no date pattern matches', () => {
			const text = 'Some text without date information';
			expect(parser.extractStatementDate(text)).toBeNull();
		});
	});

	describe('parseChaseDate', () => {
		it('should parse MM/DD/YY format correctly', () => {
			expect(parser.parseChaseDate('01/15/24')).toBe('2024-01-15');
			expect(parser.parseChaseDate('12/31/23')).toBe('2023-12-31');
		});

		it('should handle 2-digit years correctly', () => {
			expect(parser.parseChaseDate('01/15/50')).toBe('1950-01-15');
			expect(parser.parseChaseDate('01/15/49')).toBe('2049-01-15');
		});

		it('should return null for invalid dates', () => {
			expect(parser.parseChaseDate('13/32/24')).toBeNull();
			expect(parser.parseChaseDate('invalid')).toBeNull();
			expect(parser.parseChaseDate('')).toBeNull();
		});
	});

	describe('extractCharges', () => {
		it('should extract basic charges', () => {
			const text = `
				01/15 AMAZON.COM 123.45
				01/16 WALMART 67.89
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(2);
			const currentYear = new Date().getFullYear();
			expect(charges[0]).toEqual({
				merchant: 'AMAZON.COM',
				amount: 123.45,
				date: `${currentYear}-01-15`,
				allocated_to: null,
				is_foreign_currency: false,
				foreign_currency_amount: null,
				foreign_currency_type: null,
				flight_details: null
			});
		});

		it('should skip payment transactions', () => {
			const text = `
				01/15 AMAZON.COM 123.45
				01/16 PAYMENT THANK YOU -100.00
				01/17 WALMART 67.89
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(2);
			expect(charges.every((c) => !c.merchant.toLowerCase().includes('payment'))).toBe(true);
		});

		it('should handle foreign currency transactions', () => {
			const text = `
				01/15 DSB DANISH KRONE 100.00
				DANISH KRONE
				15.50 X 6.45
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(1);
			expect(charges[0].is_foreign_currency).toBe(true);
			expect(charges[0].foreign_currency_amount).toBe(15.5);
			expect(charges[0].foreign_currency_type).toBe('DANISH KRONE');
		});

		it('should filter out invalid transactions', () => {
			const text = `
				01/15 AMAZON.COM 123.45
				01/16 A 1.00
				01/17 WALMART 67.89
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(2);
			expect(charges.every((c) => c.merchant.length >= 2)).toBe(true);
		});

		it('should skip SHOP WITH POINTS ACTIVITY section', () => {
			const text = `
				01/15 AMAZON.COM 123.45
				01/16 WALMART 67.89
				SHOP WITH POINTS ACTIVITY
				Date of
				Transaction Merchant Name or Transaction Description $ Amount Rewards
				05/26 AMAZON.COM AMZN.COM/BILLWA 15.67 1,567
				05/26 AMAZON.COM AMZN.COM/BILLWA 5.40 540
				05/27 AMAZON.COM AMZN.COM/BILLWA 12.43 1,243
				ACCOUNT ACTIVITY
				01/17 TARGET 45.67
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(3);
			
			// Should include the charges before and after the SHOP WITH POINTS section
			expect(charges[0].merchant).toBe('AMAZON.COM');
			expect(charges[0].amount).toBe(123.45);
			expect(charges[1].merchant).toBe('WALMART');
			expect(charges[1].amount).toBe(67.89);
			expect(charges[2].merchant).toBe('TARGET');
			expect(charges[2].amount).toBe(45.67);
			
			// Should NOT include any of the point redemption amounts
			const pointRedemptionAmounts = [15.67, 5.40, 12.43];
			pointRedemptionAmounts.forEach(amount => {
				expect(charges.some(c => c.amount === amount)).toBe(false);
			});
		});
	});

	describe('isLikelyForeignTransaction', () => {
		it('should identify foreign currency indicators', () => {
			expect(parser.isLikelyForeignTransaction('DSB DANISH KRONE')).toBe(true);
			expect(parser.isLikelyForeignTransaction('EURO TRANSACTION')).toBe(true);
			expect(parser.isLikelyForeignTransaction('POUND STERLING')).toBe(true);
		});

		it('should not identify regular transactions as foreign', () => {
			expect(parser.isLikelyForeignTransaction('AMAZON.COM')).toBe(false);
			expect(parser.isLikelyForeignTransaction('WALMART')).toBe(false);
		});
	});

	describe('isPaymentToCard', () => {
		it('should identify payment transactions', () => {
			expect(parser.isPaymentToCard('PAYMENT THANK YOU')).toBe(true);
			expect(parser.isPaymentToCard('ONLINE PAYMENT')).toBe(true);
			expect(parser.isPaymentToCard('PAYMENT RECEIVED')).toBe(true);
		});

		it('should not identify regular transactions as payments', () => {
			expect(parser.isPaymentToCard('AMAZON.COM')).toBe(false);
			expect(parser.isPaymentToCard('WALMART')).toBe(false);
		});
	});

	describe('parseTransactionLine', () => {
		it('should parse valid transaction line', () => {
			const line = '01/15 AMAZON.COM 123.45';
			const result = parser.parseTransactionLine(line);
			const currentYear = new Date().getFullYear();
			expect(result).toEqual({
				merchant: 'AMAZON.COM',
				amount: 123.45,
				date: `${currentYear}-01-15`,
				allocated_to: null
			});
		});

		it('should return null for invalid transaction line', () => {
			const line = 'INVALID TRANSACTION LINE';
			expect(parser.parseTransactionLine(line)).toBeNull();
		});

		it('should handle negative amounts', () => {
			const line = '01/15 REFUND -50.00';
			const result = parser.parseTransactionLine(line);
			expect(result.amount).toBe(-50);
		});
	});

	describe('parse', () => {
		it('should parse complete Chase statement', async () => {
			const text = `
				CHASE ACCOUNT SUMMARY
				Account Number: XXXX XXXX XXXX 1234
				Opening/Closing Date 01/15/24 - 02/15/24
				01/15 AMAZON.COM 123.45
				01/16 WALMART 67.89
			`;

			const result = await parser.parse(text);
			const currentYear = new Date().getFullYear();
			expect(result).toEqual({
				last4: '1234',
				statement_date: '2024-02-15',
				charges: expect.arrayContaining([
					expect.objectContaining({
						merchant: 'AMAZON.COM',
						amount: 123.45,
						date: `${currentYear}-01-15`
					}),
					expect.objectContaining({
						merchant: 'WALMART',
						amount: 67.89,
						date: `${currentYear}-01-16`
					})
				])
			});
		});

		it('should throw error for invalid statement', async () => {
			const text = 'INVALID STATEMENT WITHOUT REQUIRED FIELDS';
			await expect(parser.parse(text)).rejects.toThrow(
				'Failed to parse required fields from Chase statement'
			);
		});
	});

	describe('inherited methods', () => {
		it('should use ParsingUtils.parseDate', () => {
			const spy = vi.spyOn(ParsingUtils, 'parseDate');
			parser.parseDate('01/15');
			expect(spy).toHaveBeenCalledWith('01/15', {});
			spy.mockRestore();
		});

		it('should use ParsingUtils.parseAmount', () => {
			const spy = vi.spyOn(ParsingUtils, 'parseAmount');
			parser.parseAmount('$123.45');
			expect(spy).toHaveBeenCalledWith('$123.45', {});
			spy.mockRestore();
		});

		it('should use ParsingUtils.validateParsedData', () => {
			const spy = vi.spyOn(ParsingUtils, 'validateParsedData');
			const data = { last4: '1234', statement_date: '2024-01-15', charges: [] };
			parser.validateParsedData(data);
			expect(spy).toHaveBeenCalledWith(data, ['last4', 'statement_date', 'charges'], {});
			spy.mockRestore();
		});
	});
});
