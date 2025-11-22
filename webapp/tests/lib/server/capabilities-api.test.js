import { describe, it, expect, vi } from 'vitest';
import { GET } from '../../../src/routes/api/projects/genproj/capabilities/+server.js';

vi.mock('$lib/config/capabilities', () => ({
	capabilities: { cap1: { name: 'Capability 1' } }
}));

describe('capabilities api', () => {
	it('GET returns capabilities json', async () => {
		const response = await GET();
		const data = await response.json();
		expect(data).toEqual({ cap1: { name: 'Capability 1' } });
	});
});