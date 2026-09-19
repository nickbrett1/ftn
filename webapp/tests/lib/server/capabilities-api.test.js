// webapp/tests/lib/server/capabilities-api.test.js
import { describe, it, expect, vi } from 'vitest';

import { GET } from '../../../src/routes/api/projects/genproj/capabilities/+server.js';
import { fetchCatalog } from '$lib/server/catalog.js';

vi.mock('$lib/server/catalog.js', () => ({
	fetchCatalog: vi.fn()
}));

describe('capabilities api', () => {
	it('serves the catalog from the genproj service', async () => {
		const capabilities = [{ id: 'shell-tools', name: 'Shell & Terminal' }];
		const categories = [{ id: 'core', label: 'Core Capabilities (Always Included)', order: 10 }];
		fetchCatalog.mockResolvedValue({ capabilities, categories });
		const platform = { env: { GENPROJ: {} } };

		const response = await GET({ platform });

		expect(fetchCatalog).toHaveBeenCalledWith(platform);
		expect(await response.json()).toEqual({ capabilities, categories });
	});

	it('falls back to empty lists when the catalog has no categories', async () => {
		// An older genproj deploy serves capabilities only. The page must still
		// render, so the sections default to empty rather than blowing up.
		fetchCatalog.mockResolvedValue({ capabilities: [{ id: 'shell-tools' }] });

		const response = await GET({ platform: undefined });

		expect(await response.json()).toEqual({
			capabilities: [{ id: 'shell-tools' }],
			categories: []
		});
	});
});
