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