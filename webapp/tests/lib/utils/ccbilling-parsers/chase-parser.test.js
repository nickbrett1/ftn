import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChaseParser } from '../../../../src/lib/utils/ccbilling-parsers/chase-parser.js';
import { ParsingUtils as ParsingUtilities } from '../../../../src/lib/utils/parsing-utils.js';

describe('ChaseParser', () => {
	let parser;

	beforeEach(() => {
		parser = new ChaseParser();
	});

	describe('canParse', () => {
		it('should identify valid Chase statement', () => {
			const text = 'CHASE ACCOUNT SUMMARY\nAccount Number: XXXX XXXX XXXX 1234';
			expect(parser.canParse(text)).toBe(true);
		});

		it('should reject invalid statement', () => {
			const text = 'WELLS FARGO ACCOUNT SUMMARY';
			expect(parser.canParse(text)).toBe(false);
		});

		it('should identify statement from URL', () => {
			const text = 'www.chase.com\nAccount Number: 1234';
			expect(parser.canParse(text)).toBe(true);
		});
	});

	describe('extractLast4Digits', () => {
		it('should extract last 4 digits from Account Number pattern', () => {
			const text = 'Account Number: 1234 5678 9012 3456';
			expect(parser.extractLast4Digits(text)).toBe('3456');
		});

		it('should extract last 4 digits from Account Number XXXX XXXX XXXX 1234 pattern', () => {
			const text = 'Account Number: XXXX XXXX XXXX 1234';
			expect(parser.extractLast4Digits(text)).toBe('1234');
		});

		it('should extract last 4 digits from Account Number pattern single', () => {
			const text = 'Account Number: 1234';
			expect(parser.extractLast4Digits(text)).toBe('1234');
		});

		it('should extract last 4 digits from ending in pattern', () => {
			const text = 'Account ending in 1234';
			expect(parser.extractLast4Digits(text)).toBe('1234');
		});

		it('should extract last 4 digits from Card Number pattern', () => {
			const text = 'Card Number: 5678';
			expect(parser.extractLast4Digits(text)).toBe('5678');
		});

		it('should extract last 4 digits from masked pattern', () => {
			const text = 'XXXX XXXX XXXX 9012';
			expect(parser.extractLast4Digits(text)).toBe('9012');
		});

		it('should extract last 4 digits from asterisk pattern', () => {
			const text = '**** 9012';
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

		it('should extract date from statement closing date pattern', () => {
			const text = 'Statement Closing Date 04/15/24';
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
				merchant: 'Amazon.Com',
				amount: 123.45,
				date: `${currentYear}-01-15`,
				allocated_to: null,
				is_foreign_currency: false,
				foreign_currency_amount: null,
				foreign_currency_type: null,
				flight_details: null,
				full_statement_text: '01/15 AMAZON.COM 123.45'
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
			expect(charges[0].merchant).toBe('Amazon.Com');
			expect(charges[0].amount).toBe(123.45);
			expect(charges[1].merchant).toBe('Walmart');
			expect(charges[1].amount).toBe(67.89);
			expect(charges[2].merchant).toBe('Target');
			expect(charges[2].amount).toBe(45.67);

			// Should NOT include any of the point redemption amounts
			const pointRedemptionAmounts = [15.67, 5.4, 12.43];
			for (const amount of pointRedemptionAmounts) {
				expect(charges.some((c) => c.amount === amount)).toBe(false);
			}
		});

		it('should handle ACCOUNT ACTIVITY (CONTINUED) section boundary correctly', () => {
			const text = `
				01/15 AMAZON.COM 123.45
				SHOP WITH POINTS ACTIVITY
				Date of
				Transaction Merchant Name or Transaction Description $ Amount Rewards
				07/11 AMAZON.COM AMZN.COM/BILLWA 2.15 215
				ACCOUNT ACTIVITY (CONTINUED)
				01/16 WALMART 67.89
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(2);

			// Should include the charges before and after the SHOP WITH POINTS section
			expect(charges[0].merchant).toBe('Amazon.Com');
			expect(charges[0].amount).toBe(123.45);
			expect(charges[1].merchant).toBe('Walmart');
			expect(charges[1].amount).toBe(67.89);

			// Should NOT include the point redemption amount (2.15)
			expect(charges.some((c) => c.amount === 2.15)).toBe(false);
		});

		it('should handle dates with year correctly if present', () => {
			const text = `
				01/15/24 AMAZON.COM 123.45
			`;

			const charges = parser.extractCharges(text);
			expect(charges).toHaveLength(1);
			expect(charges[0].date).toBe('2024-01-15');
		});
	});

	describe('isLikelyForeignTransaction', () => {
		it('should identify foreign currency indicators', () => {
			expect(parser.isLikelyForeignTransaction('DSB DANISH KRONE')).toBe(true);
			expect(parser.isLikelyForeignTransaction('EURO TRANSACTION')).toBe(true);
			expect(parser.isLikelyForeignTransaction('POUND STERLING')).toBe(true);
			expect(parser.isLikelyForeignTransaction('PESO')).toBe(true);
			expect(parser.isLikelyForeignTransaction('DOLLAR')).toBe(true);
		});

		it('should not identify regular transactions as foreign', () => {
			expect(parser.isLikelyForeignTransaction('AMAZON.COM')).toBe(false);
			expect(parser.isLikelyForeignTransaction('WALMART')).toBe(false);
		});
	});

	describe('isFlightTransaction', () => {
		it('should identify flight transaction indicators', () => {
			expect(parser.isFlightTransaction('UNITED AIRLINES')).toBe(true);
			expect(parser.isFlightTransaction('BRITISH AIRWAYS')).toBe(true);
			expect(parser.isFlightTransaction('Some AIRPORT shop')).toBe(true);
			expect(parser.isFlightTransaction('Expedia FLIGHT')).toBe(true);
			expect(parser.isFlightTransaction('TICKET')).toBe(true);
		});

		it('should not identify regular transactions as flights', () => {
			expect(parser.isFlightTransaction('AMAZON.COM')).toBe(false);
			expect(parser.isFlightTransaction('WALMART')).toBe(false);
		});
	});

	describe('extractFlightDetails', () => {
		it('should extract flight details', () => {
			const lines = [
				'01/15 UNITED AIRLINES 123.45',
				'123456 123456 X SFO JFK',
				'01/16 WALMART 67.89'
			];
			const result = parser.extractFlightDetails(lines, 0);
			expect(result).not.toBeNull();
			expect(result.departure_airport).toBe('SFO');
			expect(result.arrival_airport).toBe('JFK');
			expect(result.airline).toBe('UNITED');
		});

		it('should handle simple airport code patterns', () => {
			const lines = ['01/15 UNITED AIRLINES 123.45', 'SFO JFK', '01/16 WALMART 67.89'];
			const result = parser.extractFlightDetails(lines, 0);
			expect(result).not.toBeNull();
			expect(result.departure_airport).toBe('SFO');
			expect(result.arrival_airport).toBe('JFK');
		});

		it('should return null if no flight details found', () => {
			const lines = ['01/15 AIRPORT SHOP 123.45', 'Some other text', '01/16 WALMART 67.89'];
			const result = parser.extractFlightDetails(lines, 0);
			expect(result).toBeNull();
		});

		it('should return null if no flight details found entirely', () => {
			const lines = ['01/15 SOME SHOP 123.45', 'Some other text', '01/16 WALMART 67.89'];
			const result = parser.extractFlightDetails(lines, 0);
			expect(result).toBeNull();
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

	describe('isLikelyShopWithPointsTransaction', () => {
		it('should identify AMZN.COM/BILLWA pattern as points transaction', () => {
			expect(
				parser.isLikelyShopWithPointsTransaction(
					'AMAZON.COM',
					'2.15',
					'AMAZON.COM AMZN.COM/BILLWA 2.15 215'
				)
			).toBe(true);
		});

		it('should identify large Amazon amounts as potential points transactions', () => {
			expect(
				parser.isLikelyShopWithPointsTransaction('AMAZON.COM', '1500.00', 'AMAZON.COM 1500.00')
			).toBe(true);
		});

		it('should not identify regular Amazon transactions as points transactions', () => {
			expect(
				parser.isLikelyShopWithPointsTransaction(
					'AMAZON.COM',
					'23.75',
					'AMAZON.COM*NR0ZC4090 Amzn.com/bill WA 23.75'
				)
			).toBe(false);
		});

		it('should identify point keywords', () => {
			expect(
				parser.isLikelyShopWithPointsTransaction('AMAZON.COM', '23.75', 'AMAZON.COM rewards 23.75')
			).toBe(true);
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

		it('should handle valid transaction but no amount', () => {
			const line = '01/15 REFUND XXX';
			const result = parser.parseTransactionLine(line);
			expect(result).toBeNull();
		});

		it('should handle currency line matches correctly', () => {
			expect(parser.safeMatchCurrencyLine('SHOP WITH POINTS ACTIVITY')).toBe(false);
			expect(parser.safeMatchCurrencyLine('A')).toBe(false);
			expect(parser.safeMatchCurrencyLine('DANISH KRONE')).toBe(true);
		});

		it('should extract exchange rates', () => {
			const res = parser.safeMatchExchangeRate('15.50 X 6.45');
			expect(res.amount1).toBe(15.5);
			expect(res.amount2).toBe(6.45);

			expect(parser.safeMatchExchangeRate('INVALID X TEXT')).toBeNull();
			expect(parser.safeMatchExchangeRate('15.50 X ')).toBeNull();
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
				card_name: null,
				statement_date: '2024-02-15',
				charges: expect.arrayContaining([
					expect.objectContaining({
						merchant: 'Amazon.Com',
						amount: 123.45,
						date: `${currentYear}-01-15`
					}),
					expect.objectContaining({
						merchant: 'Walmart',
						amount: 67.89,
						date: `${currentYear}-01-16`
					})
				])
			});
		});

		it('should throw error for invalid statement', async () => {
			const text = 'CHASE ACCOUNT SUMMARY';
			await expect(parser.parse(text)).rejects.toThrow(
				'Failed to parse required fields from Chase statement'
			);
		});
	});

	describe('inherited methods', () => {
		it('should use ParsingUtils.parseDate', () => {
			const spy = vi.spyOn(ParsingUtilities, 'parseDate');
			parser.parseDate('01/15');
			expect(spy).toHaveBeenCalledWith('01/15', {});
			spy.mockRestore();
		});

		it('should use ParsingUtils.parseAmount', () => {
			const spy = vi.spyOn(ParsingUtilities, 'parseAmount');
			parser.parseAmount('$123.45');
			expect(spy).toHaveBeenCalledWith('$123.45', {});
			spy.mockRestore();
		});

		it('should use ParsingUtils.validateParsedData', () => {
			const spy = vi.spyOn(ParsingUtilities, 'validateParsedData');
			const data = { last4: '1234', statement_date: '2024-01-15', charges: [] };
			parser.validateParsedData(data);
			expect(spy).toHaveBeenCalledWith(data, ['last4', 'statement_date', 'charges'], {});
			spy.mockRestore();
		});
	});
});
