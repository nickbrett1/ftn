import { describe, it, expect } from 'vitest';
import { products } from '../../../src/lib/data/products.js';

describe('products.js', () => {
	it('exports a products array', () => {
		expect(Array.isArray(products)).toBe(true);
		expect(products.length).toBeGreaterThan(0);
	});

	it('contains products with required fields', () => {
		for (const product of products) {
			expect(product).toHaveProperty('id');
			expect(typeof product.id).toBe('string');

			expect(product).toHaveProperty('name');
			expect(typeof product.name).toBe('string');

			expect(product).toHaveProperty('description');
			expect(typeof product.description).toBe('string');

			expect(product).toHaveProperty('price');
			expect(typeof product.price).toBe('number');

			expect(product).toHaveProperty('currency');
			expect(typeof product.currency).toBe('string');

			expect(product).toHaveProperty('category');
			expect(typeof product.category).toBe('string');

			expect(product).toHaveProperty('image');
		}
	});

	it('checks a specific product details', () => {
		const bearKit = products.find(p => p.id === 'bear-kit');
		expect(bearKit).toBeDefined();
		expect(bearKit.name).toBe('Bear Market Survival Kit');
		expect(bearKit.price).toBe(4999);
		expect(bearKit.currency).toBe('usd');
		expect(bearKit.category).toBe('Finance');
	});
});
