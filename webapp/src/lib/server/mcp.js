import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { products } from '$lib/data/products.js';
import { getProductById, processTestPurchase, createStripeSession } from './shop.js';

export const mcpServer = new Server(
	{ name: 'fintechnick-shop', version: '1.0.0' },
	{ capabilities: { tools: {} } }
);

// Register Available Tools
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [
			{
				name: 'list_products',
				description: 'Returns the catalog of available products, categories, and prices.',
				inputSchema: { type: 'object', properties: {} }
			},
			{
				name: 'get_product',
				description: 'Returns metadata for a specific product by ID.',
				inputSchema: {
					type: 'object',
					properties: {
						productId: { type: 'string', description: 'ID of the product' }
					},
					required: ['productId']
				}
			},
			{
				name: 'purchase_product_direct',
				description: 'Completes a mock purchase directly via Stripe using test card credentials.',
				inputSchema: {
					type: 'object',
					properties: {
						productId: { type: 'string', description: 'ID of the product to purchase' },
						stripeToken: { type: 'string', description: 'Stripe token (defaults to tok_visa)' }
					},
					required: ['productId']
				}
			},
			{
				name: 'create_checkout_session',
				description: 'Generates a Stripe Checkout Session URL for visual completion.',
				inputSchema: {
					type: 'object',
					properties: {
						productId: { type: 'string', description: 'ID of the product' }
					},
					required: ['productId']
				}
			}
		]
	};
});

// Register Tool Execution Handler
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: toolArguments } = request.params;

	try {
		switch (name) {
			case 'list_products': {
				// Strip image imports from data sent to LLM to keep context token count light
				const cleanProducts = products.map(
					({ id, name: productName, description, price, currency, category }) => ({
						id,
						name: productName,
						description,
						price,
						currency,
						category
					})
				);
				return {
					content: [{ type: 'text', text: JSON.stringify(cleanProducts) }]
				};
			}
			case 'get_product': {
				const product = getProductById(toolArguments?.productId);
				if (!product) {
					return {
						isError: true,
						content: [
							{ type: 'text', text: `Product with ID "${toolArguments?.productId}" not found.` }
						]
					};
				}
				// Return clean product metadata
				const { id, name: productName, description, price, currency, category } = product;
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								id,
								name: productName,
								description,
								price,
								currency,
								category
							})
						}
					]
				};
			}
			case 'purchase_product_direct': {
				const result = await processTestPurchase(
					toolArguments?.productId,
					toolArguments?.stripeToken
				);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }]
				};
			}
			case 'create_checkout_session': {
				const origin = 'https://www.fintechnick.com';
				const result = await createStripeSession(toolArguments?.productId, origin);
				return {
					content: [{ type: 'text', text: JSON.stringify(result) }]
				};
			}
			default: {
				throw new Error(`Tool not found: ${name}`);
			}
		}
	} catch (error) {
		return {
			isError: true,
			content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }]
		};
	}
});
