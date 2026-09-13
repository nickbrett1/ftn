// webapp/tests/lib/server/capabilities-api.test.js
import { describe, it, expect, vi } from 'vitest';

import { GET } from '../../../src/routes/api/projects/genproj/capabilities/+server.js';
import { getCatalogCapabilities } from '$lib/server/catalog.js';

vi.mock('$lib/server/catalog.js', () => ({
	getCatalogCapabilities: vi.fn()
}));

describe('capabilities api', () => {
	it('serves the catalog from the genproj service', async () => {
		const capabilities = [{ id: 'shell-tools', name: 'Shell & Terminal' }];
		getCatalogCapabilities.mockResolvedValue(capabilities);
		const platform = { env: { GENPROJ: {} } };

		const response = await GET({ platform });

		expect(getCatalogCapabilities).toHaveBeenCalledWith(platform);
		expect(await response.json()).toEqual(capabilities);
	});
});
