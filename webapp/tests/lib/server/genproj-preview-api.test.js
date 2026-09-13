import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../src/routes/projects/genproj/api/preview/+server.js';
import { callGenproj } from '../../../src/lib/server/genproj-client.js';

vi.mock('../../../src/lib/server/genproj-client.js', () => ({
	callGenproj: vi.fn()
}));

// Preview is the one genproj endpoint that stays unauthenticated, so the route
// forwards without asking who the caller is.
describe('genproj preview api route', () => {
	const buildEvent = (body) => ({
		request: new Request('http://localhost/projects/genproj/api/preview', {
			method: 'POST',
			body: JSON.stringify(body)
		}),
		platform: { env: {} }
	});

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('forwards a valid request to genproj without requiring auth', async () => {
		const body = { name: 'preview-demo', selectedCapabilities: ['docker'] };
		callGenproj.mockResolvedValue({ status: 200, body: { files: [], summary: {} } });

		const response = await POST(buildEvent(body));

		// No options argument at all: preview does not ask for auth.
		expect(callGenproj).toHaveBeenCalledWith(expect.anything(), '/v1/preview', body);
		expect(response.status).toBe(200);
	});

	it('rejects a request with no capabilities before calling genproj', async () => {
		const response = await POST(buildEvent({ name: 'preview-demo' }));

		expect(response.status).toBe(400);
		expect(callGenproj).not.toHaveBeenCalled();
	});

	it('rejects a body that is not JSON', async () => {
		const event = {
			request: new Request('http://localhost/projects/genproj/api/preview', {
				method: 'POST',
				body: 'not json'
			}),
			platform: { env: {} }
		};

		const response = await POST(event);

		expect(response.status).toBe(400);
	});

	it('passes a genproj error through with its status', async () => {
		callGenproj.mockResolvedValue({ status: 500, body: { error: 'boom' } });

		const response = await POST(buildEvent({ name: 'x', selectedCapabilities: ['docker'] }));

		expect(response.status).toBe(500);
		expect((await response.json()).error).toBe('boom');
	});
});
