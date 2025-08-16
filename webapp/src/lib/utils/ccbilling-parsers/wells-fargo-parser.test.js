import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WellsFargoParser } from './wells-fargo-parser.js';
import { ParsingUtils } from '../parsing-utils.js';

describe('WellsFargoParser', () => {
	let parser;

	beforeEach(() => {
		parser = new WellsFargoParser();
	});

	describe('constructor', () => {
		it('should initialize with correct provider name', () => {
			expect(parser.providerName).toBe('Wells Fargo');
		});
	});

	describe('canParse', () => {
		it('should detect Wells Fargo statements', () => {
			const wellsFargoText = 'WELLS FARGO BANK Account Number Ending in 1234';
			expect(parser.canParse(wellsFargoText)).toBe(true);
		});

		it('should detect Wells Fargo Online statements', () => {
			const wellsFargoText = 'Wells Fargo Online®: wellsfargo.com';
			expect(parser.canParse(wellsFargoText)).toBe(true);
		});

		it('should detect Bilt statements', () => {
			const biltText = 'BILT REWARDS MASTERCARD Billing Cycle';
			expect(parser.canParse(biltText)).toBe(true);
		});

		it('should detect BiltProtect statements', () => {
			const biltText = 'BiltProtect Summary BPS*BILT REWARDS';
			expect(parser.canParse(biltText)).toBe(true);
		});

		it('should detect Wells Fargo with Account Number Ending pattern', () => {
			const text = 'Account Number Ending in 5678 Billing Cycle';
			expect(parser.canParse(text)).toBe(true);
		});

		it('should detect statements with Billing Cycle pattern', () => {
			const text = 'Billing Cycle 06/14/2025 to 07/15/2025';
			expect(parser.canParse(text)).toBe(true);
		});

		it('should not detect non-Wells Fargo statements', () => {
			const nonWellsFargoText = 'CHASE ACCOUNT SUMMARY JPMORGAN CHASE';
			expect(parser.canParse(nonWellsFargoText)).toBe(false);
		});

		it('should not detect statements with just Cash Advance', () => {
			const text = 'Cash Advance Limit $4,000.00 AMEX STATEMENT';
			expect(parser.canParse(text)).toBe(false);
		});

		it('should be case insensitive', () => {
			const text = 'wells fargo account number ending in 1234';
			expect(parser.canParse(text)).toBe(true);
		});

		it('should handle null input', () => {
			expect(parser.canParse(null)).toBe(false);
		});
	});

	describe('extractLast4Digits', () => {
		it('should extract last 4 digits from "Account Number Ending in" pattern', () => {
			const text = 'Account Number Ending in 1234';
			expect(parser.extractLast4Digits(text)).toBe('1234');
		});

		it('should extract last 4 digits from alternative pattern', () => {
			const text = 'Account Number Ending in XXXX where XXXX is 5678';
			expect(parser.extractLast4Digits(text)).toBe('5678');
		});

		it('should extract last 4 digits from "Ending in" pattern', () => {
			const text = 'Credit Card Ending in 9012';
			expect(parser.extractLast4Digits(text)).toBe('9012');
		});

		it('should return null when no pattern matches', () => {
			const text = 'Some other text without account number';
			expect(parser.extractLast4Digits(text)).toBeNull();
		});
	});

	describe('extractStatementDate', () => {
		it('should extract closing date from billing cycle pattern', () => {
			const text = 'Billing Cycle 01/15/2024 to 02/15/2024';
			expect(parser.extractStatementDate(text)).toBe('2024-02-15');
		});

		it('should extract date from statement period pattern', () => {
			const text = 'Statement Period 12/16/2023 to 01/16/2024';
			expect(parser.extractStatementDate(text)).toBe('2024-01-16');
		});

		it('should extract date from statement date pattern', () => {
			const text = 'Statement Date 03/15/2024';
			expect(parser.extractStatementDate(text)).toBe('2024-03-15');
		});

		it('should return null when no date pattern matches', () => {
			const text = 'Some text without date information';
			expect(parser.extractStatementDate(text)).toBeNull();
		});
	});

	describe('parseWellsFargoDate', () => {
		it('should parse MM/DD/YYYY format correctly', () => {
			expect(parser.parseWellsFargoDate('01/15/2024')).toBe('2024-01-15');
			expect(parser.parseWellsFargoDate('12/31/2023')).toBe('2023-12-31');
		});

		it('should handle single digit months and days', () => {
			expect(parser.parseWellsFargoDate('1/5/2024')).toBe('2024-01-05');
			expect(parser.parseWellsFargoDate('9/25/2024')).toBe('2024-09-25');
		});

		it('should return null for invalid dates', () => {
			expect(parser.parseWellsFargoDate('13/32/2024')).toBeNull();
			expect(parser.parseWellsFargoDate('invalid')).toBeNull();
			expect(parser.parseWellsFargoDate('')).toBeNull();
		});
	});

	describe('parseWellsFargoTransactionDate', () => {
		it('should parse MM/YY format correctly with statement year', () => {
			expect(parser.parseWellsFargoTransactionDate('01/24', 2024)).toBe('2024-01-15');
			expect(parser.parseWellsFargoTransactionDate('12/23', 2024)).toBe('2023-12-15');
		});

		it('should handle year boundary correctly', () => {
			// Transaction in December of previous year when statement is in January
			expect(parser.parseWellsFargoTransactionDate('12/23', 2024)).toBe('2023-12-15');
			// Transaction in January when statement is in previous year (edge case)
			expect(parser.parseWellsFargoTransactionDate('01/25', 2024)).toBe('2025-01-15');
		});

		it('should return null for invalid dates', () => {
			expect(parser.parseWellsFargoTransactionDate('13/24', 2024)).toBeNull();
			expect(parser.parseWellsFargoTransactionDate('invalid', 2024)).toBeNull();
			expect(parser.parseWellsFargoTransactionDate('', 2024)).toBeNull();
		});
	});

	describe('parseWellsFargoTransaction', () => {
		it('should parse transaction with amount', () => {
			const line = 'AMAZON.COM AMZN.COM/BILL WA $123.45';
			const result = parser.parseWellsFargoTransaction(line);
			expect(result).toEqual({
				description: 'AMAZON.COM AMZN.COM/BILL WA',
				amount: 123.45
			});
		});

		it('should parse transaction with negative amount', () => {
			const line = 'REFUND FOR PURCHASE $-50.00';
			const result = parser.parseWellsFargoTransaction(line);
			expect(result).toEqual({
				description: 'REFUND FOR PURCHASE',
				amount: -50.0
			});
		});

		it('should parse transaction with comma in amount', () => {
			const line = 'EXPENSIVE ITEM STORE $1,234.56';
			const result = parser.parseWellsFargoTransaction(line);
			expect(result).toEqual({
				description: 'EXPENSIVE ITEM STORE',
				amount: 1234.56
			});
		});

		it('should return null when no amount pattern matches', () => {
			const line = 'INVALID LINE WITHOUT AMOUNT';
			expect(parser.parseWellsFargoTransaction(line)).toBeNull();
		});

		it('should return null when description is too short', () => {
			const line = 'A $10.00';
			expect(parser.parseWellsFargoTransaction(line)).toBeNull();
		});
	});

	describe('extractCharges', () => {
		it('should extract basic charges', () => {
			const text = `
				Statement Date 02/15/2024
				Transaction Summary
				Trans Date Post Date Reference Number Description of Transaction or Credit Amount
				01/15 01/15 860001800 5543286595Z9WS512 AMAZON.COM AMZN.COM/BILL WA $123.45
				01/16 01/16 860001800 5543286595Z9WS513 WALMART STORE #1234 TX $67.89
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(2);
			expect(charges[0]).toEqual({
				merchant: 'AMAZON.COM AMZN.COM/BILL WA',
				amount: 123.45,
				date: '2024-01-15',
				allocated_to: null,
				is_foreign_currency: false,
				foreign_currency_amount: null,
				foreign_currency_type: null,
				full_statement_text: '01/15 01/15 860001800 5543286595Z9WS512 AMAZON.COM AMZN.COM/BILL WA $123.45'
			});
		});

		it('should skip payment transactions', () => {
			const text = `
				Statement Date 02/15/2024
				Transaction Summary
				Trans Date Post Date Reference Number Description of Transaction or Credit Amount
				01/15 01/15 860001800 5543286595Z9WS512 AMAZON.COM AMZN.COM/BILL WA $123.45
				01/16 01/16 000000141 8574110560XSLP754 ONLINE ACH PAYMENT THANK YOU $100.00-
				01/17 01/17 860001800 5543286595Z9WS513 WALMART STORE #1234 TX $67.89
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(2);
			expect(charges.every((c) => !c.merchant.toLowerCase().includes('payment'))).toBe(true);
		});

		it('should handle foreign currency transactions', () => {
			const text = `
				Statement Date 02/15/2024
				Transaction Summary
				Trans Date Post Date Reference Number Description of Transaction or Credit Amount
				01/20 01/20 030001100 05309415BP97Q8D6Z FOREIGN MERCHANT LONDON UK $100.00
				- 01/20 DK KRONE
				- 01/20 650.75 X 0.154
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(1);
			expect(charges[0].is_foreign_currency).toBe(true);
			expect(charges[0].foreign_currency_amount).toBe(650.75);
			expect(charges[0].foreign_currency_type).toBe('DK KRONE');
		});

		it('should handle transactions without statement date', () => {
			const text = `
				Transaction Summary
				Trans Date Post Date Reference Number Description of Transaction or Credit Amount
				01/15 01/15 860001800 5543286595Z9WS512 AMAZON.COM AMZN.COM/BILL WA $123.45
				02/16 02/16 860001800 5543286595Z9WS513 WALMART STORE #1234 TX $67.89
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(2);
			// Should use current year when no statement date is found
			const currentYear = new Date().getFullYear();
			expect(charges[0].date).toBe(`${currentYear}-01-15`);
		});
	});

	describe('isCurrencyLine', () => {
		it('should identify currency lines', () => {
			expect(parser.isCurrencyLine('DK KRONE')).toBe(true);
			expect(parser.isCurrencyLine('EURO')).toBe(true);
			expect(parser.isCurrencyLine('POUND STERLING')).toBe(true);
			expect(parser.isCurrencyLine('JAPANESE YEN')).toBe(true);
		});

		it('should not identify non-currency lines', () => {
			expect(parser.isCurrencyLine('AMAZON.COM')).toBe(false);
			expect(parser.isCurrencyLine('WALMART STORE')).toBe(false);
			expect(parser.isCurrencyLine('123.45')).toBe(false);
			expect(parser.isCurrencyLine('STORE #1234')).toBe(false);
		});

		it('should handle edge cases', () => {
			expect(parser.isCurrencyLine('')).toBe(false);
			expect(parser.isCurrencyLine('A')).toBe(false); // Too short
			expect(parser.isCurrencyLine('VERY LONG CURRENCY NAME THAT EXCEEDS LIMITS')).toBe(false); // Too long
		});
	});

	describe('parseExchangeRate', () => {
		it('should parse exchange rate pattern', () => {
			const line = '650.75 X 0.154';
			const result = parser.parseExchangeRate(line);
			expect(result).toEqual({
				foreignAmount: 650.75,
				exchangeRate: 0.154
			});
		});

		it('should parse exchange rate with spaces', () => {
			const line = '1234.56 X 1.25';
			const result = parser.parseExchangeRate(line);
			expect(result).toEqual({
				foreignAmount: 1234.56,
				exchangeRate: 1.25
			});
		});

		it('should return null for invalid patterns', () => {
			expect(parser.parseExchangeRate('INVALID PATTERN')).toBeNull();
			expect(parser.parseExchangeRate('123.45')).toBeNull();
			expect(parser.parseExchangeRate('123.45 X invalid')).toBeNull();
		});
	});

	describe('isPaymentToCard', () => {
		it('should identify payment transactions', () => {
			expect(parser.isPaymentToCard('ONLINE ACH PAYMENT THANK YOU')).toBe(true);
			expect(parser.isPaymentToCard('PAYMENT THANK YOU')).toBe(true);
			expect(parser.isPaymentToCard('ONLINE PAYMENT')).toBe(true);
			expect(parser.isPaymentToCard('PAYMENT RECEIVED')).toBe(true);
			expect(parser.isPaymentToCard('AUTOPAY PAYMENT')).toBe(true);
		});

		it('should not identify regular transactions as payments', () => {
			expect(parser.isPaymentToCard('AMAZON.COM')).toBe(false);
			expect(parser.isPaymentToCard('WALMART')).toBe(false);
			expect(parser.isPaymentToCard('PAYMENT PROCESSOR MERCHANT')).toBe(false);
		});

		it('should be case insensitive', () => {
			expect(parser.isPaymentToCard('online ach payment thank you')).toBe(true);
			expect(parser.isPaymentToCard('PAYMENT THANK YOU')).toBe(true);
		});
	});

	describe('parse', () => {
		it('should parse complete Wells Fargo statement', async () => {
			const text = `
				WELLS FARGO BANK BILT REWARDS MASTERCARD
				Account Number Ending in 1234
				Billing Cycle 01/15/2024 to 02/15/2024
				
				Transaction Summary
				Trans Date Post Date Reference Number Description of Transaction or Credit Amount
				01/15 01/15 860001800 5543286595Z9WS512 AMAZON.COM AMZN.COM/BILL WA $123.45
				01/16 01/16 860001800 5543286595Z9WS513 WALMART STORE #1234 TX $67.89
				02/17 02/17 860001800 5543286595Z9WS514 STARBUCKS STORE #567 $5.50
			`;

			const result = await parser.parse(text);
			expect(result).toEqual({
				last4: '1234',
				statement_date: '2024-02-15',
				charges: expect.arrayContaining([
					expect.objectContaining({
						merchant: 'AMAZON.COM AMZN.COM/BILL WA',
						amount: 123.45,
						date: '2024-01-15'
					}),
					expect.objectContaining({
						merchant: 'WALMART STORE #1234 TX',
						amount: 67.89,
						date: '2024-01-16'
					}),
					expect.objectContaining({
						merchant: 'STARBUCKS STORE #567',
						amount: 5.5,
						date: '2024-02-17'
					})
				])
			});
		});

		it('should parse statement with foreign currency transactions', async () => {
			const text = `
				WELLS FARGO BANK BILT REWARDS MASTERCARD
				Account Number Ending in 5678
				Billing Cycle 01/15/2024 to 02/15/2024
				
				Transaction Summary
				Trans Date Post Date Reference Number Description of Transaction or Credit Amount
				01/20 01/20 030001100 05309415BP97Q8D6Z FOREIGN MERCHANT LONDON UK $100.00
				- 01/20 DK KRONE
				- 01/20 650.75 X 0.154
				01/21 01/21 860001800 5543286595Z9WS515 DOMESTIC MERCHANT USA $50.00
			`;

			const result = await parser.parse(text);
			expect(result.charges).toHaveLength(2);
			expect(result.charges[0].is_foreign_currency).toBe(true);
			expect(result.charges[0].foreign_currency_amount).toBe(650.75);
			expect(result.charges[0].foreign_currency_type).toBe('DK KRONE');
			expect(result.charges[1].is_foreign_currency).toBe(false);
		});

		it('should throw error for invalid statement', async () => {
			const text = 'INVALID STATEMENT WITHOUT REQUIRED FIELDS';
			await expect(parser.parse(text)).rejects.toThrow(
				'Failed to parse required fields from Wells Fargo statement'
			);
		});

		it('should throw error when missing last4', async () => {
			const text = `
				WELLS FARGO BANK
				Billing Cycle 01/15/2024 to 02/15/2024
				1/24 AMAZON.COM $123.45
			`;
			await expect(parser.parse(text)).rejects.toThrow(
				'Failed to parse required fields from Wells Fargo statement'
			);
		});

		it('should throw error when missing statement date', async () => {
			const text = `
				WELLS FARGO BANK
				Account Number Ending in 1234
				1/24 AMAZON.COM $123.45
			`;
			await expect(parser.parse(text)).rejects.toThrow(
				'Failed to parse required fields from Wells Fargo statement'
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

		it('should use ParsingUtils.cleanMerchantName', () => {
			const spy = vi.spyOn(ParsingUtils, 'cleanMerchantName');
			parser.cleanMerchantName('AMAZON.COM  EXTRA SPACES');
			expect(spy).toHaveBeenCalledWith('AMAZON.COM  EXTRA SPACES', {});
			spy.mockRestore();
		});
	});
});
