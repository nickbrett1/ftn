// webapp/src/routes/shop/+page.server.js
import { redirect, error } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { products } from '$lib/data/products.js';

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

		const product = products.find((p) => p.id === productId);

		if (!product) {
			throw error(404, 'Product not found');
		}

		const stripeSecretKey = env.STRIPE_SECRET_KEY;
		if (!stripeSecretKey) {
			return {
				success: false,
				error: 'Stripe is not configured.'
			};
		}

		const stripe = new Stripe(stripeSecretKey);

		let session;
		try {
			// Create a Stripe Checkout Session
			session = await stripe.checkout.sessions.create({
				payment_method_types: ['card'],
				line_items: [
					{
						price_data: {
							currency: product.currency,
							product_data: {
								name: product.name,
								description: product.description,
                                images: [product.image]
							},
							unit_amount: product.price
						},
						quantity: 1
					}
				],
				mode: 'payment',
				success_url: `${url.origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${url.origin}/shop/cancel`,
			});
		} catch (err) {
			console.error('Stripe error:', err);
			return {
				success: false,
				error: 'Failed to create checkout session. Please try again.'
			};
		}

		// Redirect to Stripe Checkout
		throw redirect(303, session.url);
	}
};
