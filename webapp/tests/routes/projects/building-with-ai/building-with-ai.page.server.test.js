import { describe, it, expect } from 'vitest';
import { load } from '../../../../src/routes/projects/building-with-ai/+page.server.js';

describe('/projects/building-with-ai/+page.server.js', () => {
	it('returns an empty object', async () => {
		const result = await load();
		expect(result).toEqual({});
	});
});
