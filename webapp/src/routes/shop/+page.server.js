// webapp/src/routes/shop/+page.server.js
import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { products } from '$lib/data/products.js';
import { createStripeSession } from '$lib/server/shop.js';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	return {
		products
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	checkout: async ({ request, url }) => {
		const formData = await request.formData();
		const productId = formData.get('productId');

		if (typeof productId !== 'string') {
			throw error(400, 'Invalid product ID');
		}

		if (!products.some((p) => p.id === productId)) {
			throw error(404, 'Product not found');
		}

		const stripeSecretKey = env.STRIPE_SECRET_KEY;
		if (!stripeSecretKey) {
			return {
				success: false,
				error: 'Stripe is not configured.'
			};
		}

		let sessionResult;
		try {
			sessionResult = await createStripeSession(productId, url.origin);
		} catch (error_) {
			console.error('Checkout error:', error_);
			return {
				success: false,
				error: 'Failed to create checkout session. Please try again.'
			};
		}

		// Redirect to Stripe Checkout
		throw redirect(303, sessionResult.checkoutUrl);
	}
};
