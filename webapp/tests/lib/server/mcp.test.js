import { describe, it, expect, vi, beforeEach } from 'vitest';

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
		}
	]
}));

// Mock shop.js
vi.mock('../../../src/lib/server/shop.js', () => ({
	getProductById: vi.fn((id) => {
		if (id === 'prod_1') {
			return {
				id: 'prod_1',
				name: 'Test Product',
				description: 'A test product',
				price: 1000,
				currency: 'usd',
				category: 'test',
				image: 'test.jpg'
			};
		}
		return undefined;
	}),
	processTestPurchase: vi.fn(async (productId, stripeToken) => {
		if (productId === 'error_prod') throw new Error('Purchase failed');
		return { success: true, orderId: 'ord_123', chargeId: 'ch_123' };
	}),
	createStripeSession: vi.fn(async (productId, origin) => {
		return { success: true, checkoutUrl: 'http://test.com/checkout', sessionId: 'cs_123' };
	})
}));

import { mcpServer } from '../../../src/lib/server/mcp.js';
import * as shop from '../../../src/lib/server/shop.js';

describe('mcpServer', () => {
    let listToolsHandler;
    let callToolHandler;

    beforeEach(() => {
        // Find registered handlers. In the SDK, they are stored on the server object.
        const handlers = (mcpServer)._requestHandlers;
        for (const [key, value] of handlers.entries()) {
             if (key === 'tools/list') listToolsHandler = value;
             if (key === 'tools/call') callToolHandler = value;
        }
    });

	it('should list tools', async () => {
        expect(listToolsHandler).toBeDefined();

        const result = await listToolsHandler({ method: 'tools/list', jsonrpc: '2.0', id: 1 });
        expect(result.tools).toBeInstanceOf(Array);
        expect(result.tools.length).toBe(4);
        expect(result.tools[0].name).toBe('list_products');
	});

	it('should call list_products tool', async () => {
        expect(callToolHandler).toBeDefined();

        const result = await callToolHandler({ method: 'tools/call', jsonrpc: '2.0', id: 2, params: { name: 'list_products', arguments: {} } });
        expect(result.content[0].type).toBe('text');

        const cleanProducts = JSON.parse(result.content[0].text);
        expect(cleanProducts.length).toBe(1);
        expect(cleanProducts[0].id).toBe('prod_1');
        expect(cleanProducts[0].image).toBeUndefined();
	});

	it('should call get_product tool for existing product', async () => {
        const result = await callToolHandler({ method: 'tools/call', jsonrpc: '2.0', id: 3, params: { name: 'get_product', arguments: { productId: 'prod_1' } } });
        expect(result.content[0].type).toBe('text');

        const product = JSON.parse(result.content[0].text);
        expect(product.id).toBe('prod_1');
        expect(product.image).toBeUndefined();
	});

	it('should return error for get_product tool for missing product', async () => {
        const result = await callToolHandler({ method: 'tools/call', jsonrpc: '2.0', id: 4, params: { name: 'get_product', arguments: { productId: 'unknown_prod' } } });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('not found');
	});

	it('should call purchase_product_direct tool', async () => {
        const result = await callToolHandler({ method: 'tools/call', jsonrpc: '2.0', id: 5, params: { name: 'purchase_product_direct', arguments: { productId: 'prod_1', stripeToken: 'tok_visa' } } });
        const data = JSON.parse(result.content[0].text);
        expect(data.success).toBe(true);
        expect(shop.processTestPurchase).toHaveBeenCalledWith('prod_1', 'tok_visa');
	});

	it('should call create_checkout_session tool', async () => {
        const result = await callToolHandler({ method: 'tools/call', jsonrpc: '2.0', id: 6, params: { name: 'create_checkout_session', arguments: { productId: 'prod_1' } } });
        const data = JSON.parse(result.content[0].text);
        expect(data.success).toBe(true);
        expect(shop.createStripeSession).toHaveBeenCalledWith('prod_1', 'https://www.fintechnick.com');
	});

	it('should return error for unknown tool', async () => {
        const result = await callToolHandler({ method: 'tools/call', jsonrpc: '2.0', id: 7, params: { name: 'unknown_tool', arguments: {} } });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Tool not found');
	});

	it('should return error when tool throws', async () => {
        const result = await callToolHandler({ method: 'tools/call', jsonrpc: '2.0', id: 8, params: { name: 'purchase_product_direct', arguments: { productId: 'error_prod' } } });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Purchase failed');
	});
});