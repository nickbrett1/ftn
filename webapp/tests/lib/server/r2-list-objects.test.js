import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('r2 list objects route', () => {
	let listMock;

    beforeEach(() => {
        vi.resetModules();
        listMock = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

	const loadModule = () =>
		import('../../../src/routes/api/r2/list-objects/+server.js');

	const buildEvent = (params, env) => ({
		request: {
			url: `https://app.test/api/r2/list-objects?${new URLSearchParams(params).toString()}`
		},
		platform: {
			env: env || {
				R2_CCBILLING: { list: listMock },
				R2_WDI: { list: listMock },
				R2_GENPROJ_TEMPLATES: { list: listMock }
			}
		}
	});

	describe('GET', () => {
		it('lists objects from ccbilling bucket', async () => {
			const { GET } = await loadModule();
			const uploadedDate = new Date();
			listMock.mockResolvedValue({
				objects: [
					{ key: 'file1.pdf', size: 100, etag: 'etag1', uploaded: uploadedDate }
				],
				truncated: false,
				cursor: null
			});

			const event = buildEvent({ bucket: 'ccbilling' });
			const response = await GET(event);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.bucket).toBe('ccbilling');
			expect(body.objects[0]).toEqual({
				key: 'file1.pdf',
				size: 100,
				etag: 'etag1',
				lastModified: uploadedDate.toISOString()
			});
		});

		it('lists objects from wdi bucket', async () => {
			const { GET } = await loadModule();
			listMock.mockResolvedValue({ objects: [], truncated: false });

			const event = buildEvent({ bucket: 'wdi' });
			const response = await GET(event);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.bucket).toBe('wdi');
		});

        it('lists objects from genproj-templates bucket', async () => {
			const { GET } = await loadModule();
			listMock.mockResolvedValue({ objects: [], truncated: false });

			const event = buildEvent({ bucket: 'genproj-templates' });
			const response = await GET(event);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.bucket).toBe('genproj-templates');
		});

		it('handles query parameters (prefix, limit)', async () => {
			const { GET } = await loadModule();
			listMock.mockResolvedValue({ objects: [], truncated: false });

			const event = buildEvent({ bucket: 'ccbilling', prefix: 'foo', limit: '50' });
			await GET(event);

			expect(listMock).toHaveBeenCalledWith({
				limit: 50,
				prefix: 'foo'
			});
		});

        it('caps limit at 1000', async () => {
			const { GET } = await loadModule();
			listMock.mockResolvedValue({ objects: [], truncated: false });

			const event = buildEvent({ bucket: 'ccbilling', limit: '2000' });
			await GET(event);

			expect(listMock).toHaveBeenCalledWith({
				limit: 1000
			});
		});

		it('returns 400 if bucket parameter is missing', async () => {
			const { GET } = await loadModule();
			const event = buildEvent({});
			const response = await GET(event);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toBe('bucket parameter is required');
		});

		it('returns 400 for unknown bucket', async () => {
			const { GET } = await loadModule();
			const event = buildEvent({ bucket: 'unknown' });
			const response = await GET(event);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.error).toContain('Unknown bucket');
		});

		it('returns 500 if bucket binding is not available', async () => {
			const { GET } = await loadModule();
			const event = buildEvent({ bucket: 'ccbilling' }, { R2_CCBILLING: null }); // Binding missing
			const response = await GET(event);

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toContain('R2 bucket binding not available');
		});

		it('returns 500 if R2 list fails', async () => {
			const { GET } = await loadModule();
			listMock.mockRejectedValue(new Error('R2 Error'));
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const event = buildEvent({ bucket: 'ccbilling' });
			const response = await GET(event);

			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBeDefined();
			consoleSpy.mockRestore();
		});
	});

	describe('OPTIONS', () => {
		it('returns correct CORS headers', async () => {
			const { OPTIONS } = await loadModule();
			const response = await OPTIONS();

			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
		});
	});
});