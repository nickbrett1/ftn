import { describe, it, expect } from 'vitest';
import { load } from '../../../../src/routes/projects/speckit-dev/+page.server.js';

describe('/projects/speckit-dev/+page.server.js', () => {
	it('returns an empty object', async () => {
		const result = await load();
		expect(result).toEqual({});
	});
});