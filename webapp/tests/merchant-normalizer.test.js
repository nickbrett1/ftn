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