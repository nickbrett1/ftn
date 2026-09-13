import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../../../../src/routes/projects/genproj/api/generate/+server.js';
import { callGenproj } from '../../../../../../src/lib/server/genproj-client.js';

vi.mock('../../../../../../src/lib/server/genproj-client.js', () => ({
	callGenproj: vi.fn()
}));

// The route only forwards; everything about how the work is done now lives in
// genproj, and how the user is identified lives in genproj-client.
describe('POST /projects/genproj/api/generate', () => {
	const event = (body) => ({
		request: new Request('http://localhost/projects/genproj/api/generate', {
			method: 'POST',
			body: JSON.stringify(body)
		}),
		platform: { env: {} }
	});

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('rejects a request with no project name', async () => {
		const response = await POST(event({ selectedCapabilities: ['docker'] }));

		expect(response.status).toBe(400);
		expect(callGenproj).not.toHaveBeenCalled();
	});

	it('rejects a request with no capabilities', async () => {
		const response = await POST(event({ name: 'demo' }));

		expect(response.status).toBe(400);
		expect(callGenproj).not.toHaveBeenCalled();
	});

	it('forwards the body with auth required', async () => {
		// `auth: true` is what makes genproj-client present the system
		// credential; without it the call would be rejected by genproj.
		const body = { name: 'demo', selectedCapabilities: ['docker'] };
		callGenproj.mockResolvedValue({ status: 200, body: { repositoryUrl: 'https://x' } });

		const response = await POST(event(body));

		expect(callGenproj).toHaveBeenCalledWith(expect.anything(), '/v1/generate', body, {
			auth: true
		});
		expect(response.status).toBe(200);
	});

	it('passes genproj status and body through unchanged', async () => {
		callGenproj.mockResolvedValue({ status: 401, body: { message: 'Unauthorized' } });

		const response = await POST(event({ name: 'demo', selectedCapabilities: ['docker'] }));

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ message: 'Unauthorized' });
	});

	it('returns 500 when the call itself throws', async () => {
		callGenproj.mockRejectedValue(new Error('binding unavailable'));

		const response = await POST(event({ name: 'demo', selectedCapabilities: ['docker'] }));
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.message).toBe('binding unavailable');
	});
});
