import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env
vi.mock('$env/dynamic/private', () => ({
	env: {
		STRIPE_SECRET_KEY: 'test_key'
	}
}));

// Mock products
vi.mock('$lib/data/products.js', () => ({
	products: [
		{
			id: 'prod_1',
			name: 'Test Product',
			description: 'A test product',
			price: 1000,
			currency: 'usd',
			category: 'test',
			image: 'test.jpg'
		},
        {
			id: 'prod_2',
			name: 'Object Image Product',
			description: 'A test product with object image',
			price: 1000,
			currency: 'usd',
			category: 'test',
			image: { img: { src: 'test_obj.jpg' } }
		}
	]
}));

const mockCreatePaymentIntent = vi.fn();
const mockCreateCheckoutSession = vi.fn();

// Mock Stripe
vi.mock('stripe', () => {
    const StripeMock = class {
        constructor() {
            this.paymentIntents = {
                create: mockCreatePaymentIntent
            };
            this.checkout = {
                sessions: {
                    create: mockCreateCheckoutSession
                }
            };
        }
    };
	return {
		default: StripeMock
	};
});

import { getProductById, processTestPurchase, createStripeSession } from '../../../src/lib/server/shop.js';

describe('shop service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

	describe('getProductById', () => {
        it('returns product if found', () => {
            const product = getProductById('prod_1');
            expect(product).toBeDefined();
            expect(product.id).toBe('prod_1');
        });

        it('returns undefined if not found', () => {
            const product = getProductById('unknown');
            expect(product).toBeUndefined();
        });
    });

    describe('processTestPurchase', () => {
        it('throws if product not found', async () => {
            await expect(processTestPurchase('unknown')).rejects.toThrow('Product not found');
        });

        it('processes payment intent successfully with defaults', async () => {
            mockCreatePaymentIntent.mockResolvedValue({
                status: 'succeeded',
                id: 'pi_1234567890',
                latest_charge: 'ch_123'
            });

            const result = await processTestPurchase('prod_1');
            expect(result.success).toBe(true);
            expect(result.orderId).toBe('ord_123456789');
            expect(result.chargeId).toBe('ch_123');

            expect(mockCreatePaymentIntent).toHaveBeenCalledWith(expect.objectContaining({
                payment_method: 'pm_card_visa'
            }));
        });

        it('processes payment intent successfully with custom token', async () => {
            mockCreatePaymentIntent.mockResolvedValue({
                status: 'succeeded',
                id: 'pi_1234567890',
                latest_charge: null
            });

            const result = await processTestPurchase('prod_1', 'pm_custom');
            expect(result.success).toBe(true);
            expect(result.chargeId).toBe('');

            expect(mockCreatePaymentIntent).toHaveBeenCalledWith(expect.objectContaining({
                payment_method: 'pm_custom'
            }));
        });
    });

    describe('createStripeSession', () => {
        it('throws if product not found', async () => {
            await expect(createStripeSession('unknown', 'http://localhost')).rejects.toThrow('Product not found');
        });

        it('creates checkout session successfully with string image', async () => {
            mockCreateCheckoutSession.mockResolvedValue({
                url: 'http://stripe.com/checkout',
                id: 'cs_123'
            });

            const result = await createStripeSession('prod_1', 'http://localhost');
            expect(result.success).toBe(true);
            expect(result.checkoutUrl).toBe('http://stripe.com/checkout');
            expect(result.sessionId).toBe('cs_123');

            expect(mockCreateCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
                line_items: expect.arrayContaining([
                    expect.objectContaining({
                        price_data: expect.objectContaining({
                            product_data: expect.objectContaining({
                                images: ['http://localhost/test.jpg']
                            })
                        })
                    })
                ])
            }));
        });

        it('creates checkout session successfully with object image', async () => {
            mockCreateCheckoutSession.mockResolvedValue({
                url: 'http://stripe.com/checkout',
                id: 'cs_123'
            });

            const result = await createStripeSession('prod_2', 'http://localhost');
            expect(result.success).toBe(true);

            expect(mockCreateCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
                line_items: expect.arrayContaining([
                    expect.objectContaining({
                        price_data: expect.objectContaining({
                            product_data: expect.objectContaining({
                                images: ['http://localhost/test_obj.jpg']
                            })
                        })
                    })
                ])
            }));
        });

        it('handles missing session URL', async () => {
            mockCreateCheckoutSession.mockResolvedValue({
                url: null,
                id: 'cs_123'
            });

            const result = await createStripeSession('prod_1', 'http://localhost');
            expect(result.success).toBe(true);
            expect(result.checkoutUrl).toBe('');
        });
    });
});
