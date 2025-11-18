import { describe, it, expect } from 'vitest';

describe('/projects/3d/+page.js', () => {
	it('exports ssr and csr flags', async () => {
		const { ssr, csr } = await import('./+page.js');
		expect(ssr).toBe(false);
		expect(csr).toBe(true);
	});
});
