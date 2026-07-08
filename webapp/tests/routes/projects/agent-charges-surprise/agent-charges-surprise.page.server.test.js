import { describe, it, expect } from 'vitest';
import { load } from '../../../../src/routes/projects/agent-charges-surprise/+page.server.js';

describe('/projects/agent-charges-surprise/+page.server.js', () => {
	it('returns an empty object', async () => {
		const result = await load();
		expect(result).toEqual({});
	});
});
