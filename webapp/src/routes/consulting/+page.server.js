// webapp/src/routes/consulting/+page.server.js
import { redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	// Check if user is authenticated
	if (!locals.user) {
		throw redirect(
			302,
			'/notauthorised?message=' +
				encodeURIComponent('Please sign in to access consulting services.')
		);
	}

	return {
		user: locals.user
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	checkout: async ({ url, locals }) => {
		// Verify authentication again in the action
		if (!locals.user) {
			throw redirect(302, '/notauthorised');
		}

		const stripeSecretKey = env.STRIPE_SECRET_KEY;
		if (!stripeSecretKey) {
			return {
				success: false,
				error: 'Stripe is not configured. Please contact support.'
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
							currency: 'usd',
							product_data: {
								name: 'Consulting Service',
								description: 'One hour of specialized consulting services.'
							},
							unit_amount: 10000 // $100.00
						},
						quantity: 1
					}
				],
				mode: 'payment',
				success_url: `${url.origin}/consulting/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${url.origin}/consulting/cancel`,
				customer_email: locals.user.email
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
