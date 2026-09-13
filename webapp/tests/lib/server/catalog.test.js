// webapp/tests/lib/server/catalog.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
	CATALOG_ORIGIN,
	fetchCatalog,
	getCatalogCapabilities
} from '../../../src/lib/server/catalog.js';

const CATALOG = {
	count: 1,
	capabilities: [{ id: 'shell-tools' }]
};

describe('fetchCatalog', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('uses the GENPROJ service binding when present', async () => {
		const fetchBinding = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(CATALOG), {
				headers: { 'content-type': 'application/json' }
			})
		);
		const globalFetch = vi.fn();
		vi.stubGlobal('fetch', globalFetch);

		const catalog = await fetchCatalog({ env: { GENPROJ: { fetch: fetchBinding } } });

		expect(catalog).toEqual(CATALOG);
		expect(fetchBinding).toHaveBeenCalledWith('https://genproj/v1/catalog');
		expect(globalFetch).not.toHaveBeenCalled();
	});

	it('falls back to the public origin without a binding', async () => {
		const globalFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(CATALOG), {
				headers: { 'content-type': 'application/json' }
			})
		);
		vi.stubGlobal('fetch', globalFetch);

		const catalog = await fetchCatalog(undefined);

		expect(catalog).toEqual(CATALOG);
		expect(globalFetch).toHaveBeenCalledWith(`${CATALOG_ORIGIN}/v1/catalog`);
	});

	it('falls back to the public origin when the platform has no env', async () => {
		const globalFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG)));
		vi.stubGlobal('fetch', globalFetch);

		await fetchCatalog({});

		expect(globalFetch).toHaveBeenCalledWith(`${CATALOG_ORIGIN}/v1/catalog`);
	});

	it('throws when the catalog service is unhappy', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 503 })));

		await expect(fetchCatalog(undefined)).rejects.toThrow(
			'genproj catalog request failed with status 503'
		);
	});
});

describe('getCatalogCapabilities', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG))));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns just the capability list', async () => {
		await expect(getCatalogCapabilities(undefined)).resolves.toEqual(CATALOG.capabilities);
	});
});
