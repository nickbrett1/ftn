import { describe, it, expect } from 'vitest';
import {
	extractAmazonOrderId,
	extractAmazonOrderIdFromMultiLine,
	generateAmazonOrderUrl,
	getAmazonOrderInfo,
	enrichAmazonCharges
} from '$lib/server/amazon-orders-service.js';

describe('amazon-orders-service', () => {
	describe('extractAmazonOrderId', () => {
		it('should extract standard Amazon order ID', () => {
			expect(extractAmazonOrderId('AMAZON MKTPLACE PMTS 123-1234567-1234567')).toBe(
				'123-1234567-1234567'
			);
		});

		it('should extract D01 format order ID', () => {
			expect(extractAmazonOrderId('AMAZON DIGITAL D01-1234567-1234567')).toBe(
				'D01-1234567-1234567'
			);
		});

		it('should extract compact order ID', () => {
			expect(extractAmazonOrderId('AMAZON 1234567890123456')).toBe('1234567890123456');
		});

		it('should return null if not Amazon', () => {
			expect(extractAmazonOrderId('NETFLIX')).toBeNull();
		});

		it('should return null if no order ID found', () => {
			expect(extractAmazonOrderId('AMAZON PRIME')).toBeNull();
		});
	});

	describe('extractAmazonOrderIdFromMultiLine', () => {
		it('should extract order ID from multi-line text', () => {
			const text = `
				AMAZON MKTPLACE PMTS
				123-1234567-1234567
				WA
			`;
			expect(extractAmazonOrderIdFromMultiLine(text)).toBe('123-1234567-1234567');
		});

		it('should return null if not Amazon', () => {
			const text = `
				NETFLIX
				123456
			`;
			expect(extractAmazonOrderIdFromMultiLine(text)).toBeNull();
		});
	});

	describe('generateAmazonOrderUrl', () => {
		it('should generate correct URL', () => {
			expect(generateAmazonOrderUrl('123-456')).toBe(
				'https://www.amazon.com/gp/your-account/order-details?orderID=123-456'
			);
		});

		it('should return null if no order ID', () => {
			expect(generateAmazonOrderUrl(null)).toBeNull();
		});
	});

	describe('getAmazonOrderInfo', () => {
		it('should return order info object', () => {
			const info = getAmazonOrderInfo('123-456');
			expect(info).toEqual({
				order_id: '123-456',
				order_url: 'https://www.amazon.com/gp/your-account/order-details?orderID=123-456',
				message: expect.any(String),
				timestamp: expect.any(String)
			});
		});

		it('should return null if no order ID', () => {
			expect(getAmazonOrderInfo(null)).toBeNull();
		});
	});

	describe('enrichAmazonCharges', () => {
		it('should enrich charges with Amazon order info', () => {
			const charges = [{ merchant: 'AMAZON 123-1234567-1234567' }, { merchant: 'NETFLIX' }];
			const enriched = enrichAmazonCharges(charges);
			expect(enriched[0].amazon_order).toBeDefined();
			expect(enriched[0].amazon_order.order_id).toBe('123-1234567-1234567');
			expect(enriched[1].amazon_order).toBeUndefined();
		});
	});
});
