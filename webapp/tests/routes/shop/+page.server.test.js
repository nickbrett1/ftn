import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load, actions } from '../../../src/routes/shop/+page.server.js';
import { products } from '../../../src/lib/data/products.js';
import * as kit from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

// Mock Stripe
vi.mock('stripe', () => {
	const createMock = vi.fn();
	class StripeMock {
		constructor() {
			this.checkout = {
				sessions: {
					create: createMock
				}
			};
		}
	}
	return {
		default: StripeMock,
		__createMock: createMock
	};
});

// Mock @sveltejs/kit
vi.mock('@sveltejs/kit', () => {
	return {
		redirect: vi.fn((status, location) => {
			const e = new Error('Redirect');
			e.status = status;
			e.location = location;
			return e;
		}),
		error: vi.fn((status, message) => {
			const e = new Error(message);
			e.status = status;
			return e;
		})
	};
});

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
	env: {
		STRIPE_SECRET_KEY: 'sk_test_123'
	}
}));

describe('shop/+page.server.js', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		env.STRIPE_SECRET_KEY = 'sk_test_123';
	});

	describe('load', () => {
		it('returns the products list', async () => {
			const result = await load();
			expect(result).toEqual({ products });
		});
	});

	describe('actions.checkout', () => {
		const mockRequest = (productId) => ({
			formData: async () => {
				const map = new Map();
				if (productId) map.set('productId', productId);
				return { get: (key) => map.get(key) };
			}
		});

		const mockUrl = { origin: 'http://localhost:5173' };

		it('throws 404 error if product is not found', async () => {
			const request = mockRequest('non-existent-id');
			await expect(actions.checkout({ request, url: mockUrl })).rejects.toThrow('Product not found');
			expect(kit.error).toHaveBeenCalledWith(404, 'Product not found');
		});

		it('returns error if Stripe is not configured', async () => {
			env.STRIPE_SECRET_KEY = ''; // Disable Stripe

			const request = mockRequest(products[0].id);
			const result = await actions.checkout({ request, url: mockUrl });

			expect(result).toEqual({
				success: false,
				error: 'Stripe is not configured.'
			});
		});

		it('creates a checkout session and redirects to Stripe with product image fallback', async () => {
			const stripeMock = (await import('stripe')).__createMock;
			stripeMock.mockResolvedValue({ url: 'https://checkout.stripe.com/session_123' });

			// Use the first product
			const product = products[0];
			const request = mockRequest(product.id);

			try {
				await actions.checkout({ request, url: mockUrl });
				// Should throw a redirect error
				expect.unreachable('Should have thrown redirect');
			} catch (e) {
				if (e.message !== 'Redirect') throw e;
				expect(e.status).toBe(303);
				expect(e.location).toBe('https://checkout.stripe.com/session_123');
			}

			expect(stripeMock).toHaveBeenCalledTimes(1);
			expect(stripeMock).toHaveBeenCalledWith(
				expect.objectContaining({
					payment_method_types: ['card'],
					line_items: expect.arrayContaining([
						expect.objectContaining({
							price_data: expect.objectContaining({
								currency: product.currency,
								product_data: expect.objectContaining({
									name: product.name,
									description: product.description,
									images: expect.any(Array)
								}),
								unit_amount: product.price
							}),
							quantity: 1
						})
					]),
					mode: 'payment',
					success_url: 'http://localhost:5173/shop/success?session_id={CHECKOUT_SESSION_ID}',
					cancel_url: 'http://localhost:5173/shop/cancel'
				})
			);
		});

		it('returns error if Stripe session creation fails', async () => {
			const stripeMock = (await import('stripe')).__createMock;
			stripeMock.mockRejectedValue(new Error('Stripe API error'));
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const request = mockRequest(products[0].id);
			const result = await actions.checkout({ request, url: mockUrl });

			expect(result).toEqual({
				success: false,
				error: 'Failed to create checkout session. Please try again.'
			});

			consoleErrorSpy.mockRestore();
		});
	});
});
