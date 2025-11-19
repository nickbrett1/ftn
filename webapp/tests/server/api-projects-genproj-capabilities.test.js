import { describe, it, expect, vi } from 'vitest';
import { GET } from '../../src/routes/api/projects/genproj/capabilities/+server.js';
import * as capabilities from '$lib/config/capabilities';

describe('/api/projects/genproj/capabilities', () => {
	it('should return the capabilities object', async () => {
		const response = await GET();
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body).toEqual(capabilities.capabilities);
	});
});
