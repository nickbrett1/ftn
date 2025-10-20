import { describe, it, expect } from 'vitest';
import { normalizeMerchant } from '../src/lib/utils/merchant-normalizer.js';

describe('Merchant Normalizer', () => {
	describe('Bluemercury normalization', () => {
		it('should normalize Bluemercury with store number', () => {
			const result = normalizeMerchant('BLUEMERCURY #172109 NEW YORK NY');
			expect(result.merchant_normalized).toBe('BLUEMERCURY');
			expect(result.merchant_details).toBe('BLUEMERCURY');
		});

		it('should normalize Bluemercury without store number', () => {
			const result = normalizeMerchant('BLUEMERCURY NEW YORK NY');
			expect(result.merchant_normalized).toBe('BLUEMERCURY');
			expect(result.merchant_details).toBe('BLUEMERCURY');
		});

		it('should normalize Bluemercury with different store number', () => {
			const result = normalizeMerchant('BLUEMERCURY #123456 NEW YORK NY');
			expect(result.merchant_normalized).toBe('BLUEMERCURY');
			expect(result.merchant_details).toBe('BLUEMERCURY');
		});

		it('should normalize Bluemercury with just state code', () => {
			const result = normalizeMerchant('BLUEMERCURY #172109 NY');
			expect(result.merchant_normalized).toBe('BLUEMERCURY');
			expect(result.merchant_details).toBe('BLUEMERCURY');
		});
	});

	describe('Caviar normalization', () => {
		it('should normalize Caviar with restaurant name', () => {
			const result = normalizeMerchant('CAVIAR - SUSHI PLACE');
			expect(result.merchant_normalized).toBe('CAVIAR');
			expect(result.merchant_details).toBe('SUSHI PLACE');
		});

		it('should normalize Caviar with asterisk separator', () => {
			const result = normalizeMerchant('CAVIAR * PIZZA SHOP');
			expect(result.merchant_normalized).toBe('CAVIAR');
			expect(result.merchant_details).toBe('PIZZA SHOP');
		});
	});

	describe('MaidMarines normalization', () => {
		it('should normalize MaidMarines with store number', () => {
			const result = normalizeMerchant('MAIDMARINES #1862550 MAIDMARINES.C NY');
			expect(result.merchant_normalized).toBe('MAIDMARINES');
			expect(result.merchant_details).toBe('');
		});
	});

	describe('Jacadi normalization', () => {
		it('should normalize Jacadi with store number', () => {
			const result = normalizeMerchant('JACADI #1710 NEW YORK NY');
			expect(result.merchant_normalized).toBe('JACADI');
			expect(result.merchant_details).toBe('JACADI');
		});
	});

	describe('British Airways normalization', () => {
		it('should normalize British Airways with transaction code', () => {
			const result = normalizeMerchant('BRITISH AWYS1252218268543 WWW.BRITISHAI');
			expect(result.merchant_normalized).toBe('BRITISH AIRWAYS');
			expect(result.merchant_details).toBe('BRITISH AWYS1252218268543 WWW.BRITISHAI');
		});

		it('should normalize British Airways with different transaction code', () => {
			const result = normalizeMerchant('BRITISH AWYS1252218268544 WWW.BRITISHAI');
			expect(result.merchant_normalized).toBe('BRITISH AIRWAYS');
			expect(result.merchant_details).toBe('BRITISH AWYS1252218268544 WWW.BRITISHAI');
		});

		it('should normalize British Airways with different case', () => {
			const result = normalizeMerchant('british awys1252218268543 www.britishai');
			expect(result.merchant_normalized).toBe('BRITISH AIRWAYS');
			expect(result.merchant_details).toBe('british awys1252218268543 www.britishai');
		});

		it('should normalize British Airways with mixed case', () => {
			const result = normalizeMerchant('British Awys1252218268543 Www.Britishai');
			expect(result.merchant_normalized).toBe('BRITISH AIRWAYS');
			expect(result.merchant_details).toBe('British Awys1252218268543 Www.Britishai');
		});

		it('should normalize British Airways with just BRITISH', () => {
			const result = normalizeMerchant('BRITISH AIRWAYS');
			expect(result.merchant_normalized).toBe('BRITISH AIRWAYS');
			expect(result.merchant_details).toBe('BRITISH AIRWAYS');
		});
	});

	describe('PlayStation Network normalization', () => {
		it('should normalize PlayStation Network with transaction code', () => {
			const result = normalizeMerchant('PlayStation Network 12345-67890');
			expect(result.merchant_normalized).toBe('PLAYSTATION NETWORK');
			expect(result.merchant_details).toBe('');
		});

		it('should normalize PlayStation Network with different case', () => {
			const result = normalizeMerchant('playstation network 98765-43210');
			expect(result.merchant_normalized).toBe('PLAYSTATION NETWORK');
			expect(result.merchant_details).toBe('');
		});

		it('should normalize PlayStation Network with mixed case', () => {
			const result = normalizeMerchant('Playstation Network 11111-22222');
			expect(result.merchant_normalized).toBe('PLAYSTATION NETWORK');
			expect(result.merchant_details).toBe('');
		});

		it('should normalize PlayStation Network with alphanumeric code', () => {
			const result = normalizeMerchant('PLAYSTATION NETWORK ABC123-DEF456');
			expect(result.merchant_normalized).toBe('PLAYSTATION NETWORK');
			expect(result.merchant_details).toBe('');
		});

		it('should normalize PlayStation Network with just numbers', () => {
			const result = normalizeMerchant('PlayStation Network 123456789');
			expect(result.merchant_normalized).toBe('PLAYSTATION NETWORK');
			expect(result.merchant_details).toBe('');
		});
	});

	describe('Flight transaction normalization', () => {
		it('should normalize specific airline names', () => {
			const result = normalizeMerchant('UNITED AIRLINES 123.45');
			expect(result.merchant_normalized).toBe('UNITED');
			expect(result.merchant_details).toBe('UNITED AIRLINES 123.45');
		});

		it('should normalize unknown airline to UNKNOWN AIRLINE', () => {
			const result = normalizeMerchant('SOME AIRLINE COMPANY');
			expect(result.merchant_normalized).toBe('UNKNOWN AIRLINE');
			expect(result.merchant_details).toBe('SOME AIRLINE COMPANY');
		});

		it('should normalize flight transaction with airport codes', () => {
			const result = normalizeMerchant('FLIGHT JFK LAX');
			expect(result.merchant_normalized).toBe('UNKNOWN AIRLINE');
			expect(result.merchant_details).toBe('JFK-LAX');
		});

		it('should normalize travel-related transaction', () => {
			const result = normalizeMerchant('TRAVEL AGENCY BOOKING');
			expect(result.merchant_normalized).toBe('UNKNOWN AIRLINE');
			expect(result.merchant_details).toBe('TRAVEL AGENCY BOOKING');
		});
	});

	describe('DIG INN normalization', () => {
		it('should normalize DIG INN with 67th street address', () => {
			const result = normalizeMerchant('TST* DIG INN- 100 W 67TH NEW YORK');
			expect(result.merchant_normalized).toBe('DIG INN');
			expect(result.merchant_details).toBe('DIG INN');
		});

		it('should normalize DIG INN with 67 street address (no TH)', () => {
			const result = normalizeMerchant('TST* DIG INN- 100 W 67 NEW YORK');
			expect(result.merchant_normalized).toBe('DIG INN');
			expect(result.merchant_details).toBe('DIG INN');
		});

		it('should normalize DIG INN with different case', () => {
			const result = normalizeMerchant('tst* dig inn- 100 w 67th new york');
			expect(result.merchant_normalized).toBe('DIG INN');
			expect(result.merchant_details).toBe('DIG INN');
		});

		it('should normalize DIG INN with asterisk separator', () => {
			const result = normalizeMerchant('TST* DIG INN* 100 W 67TH NEW YORK');
			expect(result.merchant_normalized).toBe('DIG INN');
			expect(result.merchant_details).toBe('DIG INN');
		});

		it('should normalize DIG INN with other address details', () => {
			const result = normalizeMerchant('TST* DIG INN- 123 MAIN ST NEW YORK');
			expect(result.merchant_normalized).toBe('DIG INN');
			expect(result.merchant_details).toBe('DIG INN');
		});
	});

	describe('Generic merchant normalization', () => {
		it('should handle null input', () => {
			const result = normalizeMerchant(null);
			expect(result.merchant_normalized).toBe('UNKNOWN');
			expect(result.merchant_details).toBe('');
		});

		it('should handle empty string', () => {
			const result = normalizeMerchant('');
			expect(result.merchant_normalized).toBe('UNKNOWN');
			expect(result.merchant_details).toBe('');
		});

		it('should normalize generic merchant with LLC suffix', () => {
			const result = normalizeMerchant('THE COFFEE SHOP LLC NY');
			expect(result.merchant_normalized).toBe('COFFEE SHOP');
			expect(result.merchant_details).toBe('');
		});
	});
});