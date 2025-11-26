import { redirect } from '@sveltejs/kit';
import { beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/require-user');

describe('/projects/genproj/generate load function', async () => {
	const { load } = await import('/src/routes/projects/genproj/generate/+page.server.js');

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should redirect if github access token is missing', async () => {
		const mockEvent = {
			url: new URL('http://localhost/projects/genproj/generate'),
			cookies: { get: vi.fn().mockReturnValue(undefined) },
			fetch: vi.fn()
		};
		try {
			await load(mockEvent);
			expect.fail('Should have thrown');
		} catch (e) {
			expect(e.status).toBe(302);
			expect(e.location).toBe('/projects/genproj?error=not_authenticated');
		}
	});

	it('should return an error if the preview fetch fails', async () => {
		const mockEvent = {
			url: new URL('http://localhost/projects/genproj/generate'),
			cookies: { get: vi.fn().mockReturnValue('dummy-token') },
			fetch: vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ message: 'API error' }) })
		};

		const result = await load(mockEvent);
		expect(result.error).toBe('API error');
	});

	it('should return a generic error if the preview fetch fails without a message', async () => {
		const mockEvent = {
			url: new URL('http://localhost/projects/genproj/generate'),
			cookies: { get: vi.fn().mockReturnValue('dummy-token') },
			fetch: vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
		};

		const result = await load(mockEvent);
		expect(result.error).toBe('Failed to generate preview');
	});

	it('should return a fallback error if the preview fetch throws', async () => {
		const mockEvent = {
			url: new URL('http://localhost/projects/genproj/generate'),
			cookies: { get: vi.fn().mockReturnValue('dummy-token') },
			fetch: vi.fn().mockRejectedValue(new Error('Network error'))
		};

		const result = await load(mockEvent);
		expect(result.error).toBe('Failed to fetch preview');
	});

	it('should return project data on success', async () => {
		const projectName = 'test-project';
		const repositoryUrl = 'https://github.com/user/repo';
		const selected = 'capability-a,capability-b';
		const mockPreview = { files: [], externalServices: [] };
		const mockEvent = {
			url: new URL(
				`http://localhost/projects/genproj/generate?projectName=${projectName}&selected=${selected}&repositoryUrl=${repositoryUrl}`
			),
			cookies: { get: vi.fn().mockReturnValue('dummy-token') },
			fetch: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockPreview) })
		};

		const result = await load(mockEvent);
		expect(result).toEqual({
			projectName,
			repositoryUrl,
			selected,
			previewData: mockPreview
		});
	});
});
