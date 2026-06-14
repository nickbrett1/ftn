import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { products } from '$lib/data/products.js';

/**
 * Helper to initialize Stripe client
 * @returns {Stripe}
 */
function getStripeClient() {
	const stripeSecretKey = env.STRIPE_SECRET_KEY;
	if (!stripeSecretKey) {
		throw new Error('STRIPE_SECRET_KEY is not configured.');
	}
	return new Stripe(stripeSecretKey);
}

/**
 * Retrieve a product by ID
 * @param {string} productId
 * @returns {Object|undefined}
 */
export function getProductById(productId) {
	return products.find((p) => p.id === productId) || undefined;
}

/**
 * Processes a Stripe payment directly using a test payment method token
 * @param {string} productId
 * @param {string} stripeToken
 * @returns {Promise<{ success: boolean, orderId: string, chargeId: string }>}
 */
export async function processTestPurchase(productId, stripeToken = 'tok_visa') {
	const product = getProductById(productId);
	if (!product) {
		throw new Error('Product not found');
	}

	const stripe = getStripeClient();
	const paymentMethod = stripeToken.startsWith('tok_') ? 'pm_card_visa' : stripeToken;

	// Create a PaymentIntent to complete payment programmatically
	const paymentIntent = await stripe.paymentIntents.create({
		amount: product.price,
		currency: product.currency,
		payment_method: paymentMethod,
		confirm: true,
		payment_method_types: ['card'],
		description: `Direct Agent Purchase: ${product.name}`,
		metadata: {
			productId: product.id,
			agentPurchase: 'true'
		}
	});

	return {
		success: paymentIntent.status === 'succeeded',
		orderId: `ord_${paymentIntent.id.slice(3, 12)}`,
		chargeId: typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : ''
	};
}

/**
 * Creates a Stripe Checkout Session
 * @param {string} productId
 * @param {string} originUrl
 * @returns {Promise<{ success: boolean, checkoutUrl: string, sessionId: string }>}
 */
export async function createStripeSession(productId, originUrl) {
	const product = getProductById(productId);
	if (!product) {
		throw new Error('Product not found');
	}

	const stripe = getStripeClient();

	const imageSource = typeof product.image === 'object' ? product.image.img?.src : product.image;
	const imageUrl = imageSource ? new URL(imageSource, originUrl).href : undefined;

	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		line_items: [
			{
				price_data: {
					currency: product.currency,
					product_data: {
						name: product.name,
						description: product.description,
						images: imageUrl ? [imageUrl] : []
					},
					unit_amount: product.price
				},
				quantity: 1
			}
		],
		mode: 'payment',
		success_url: `${originUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${originUrl}/shop/cancel`
	});

	return {
		success: true,
		checkoutUrl: session.url || '',
		sessionId: session.id
	};
}
