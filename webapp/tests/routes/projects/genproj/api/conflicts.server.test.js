import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../../../src/routes/projects/genproj/api/conflicts/+server.js';
import { callGenproj } from '../../../../../src/lib/server/genproj-client.js';

vi.mock('../../../../../src/lib/server/genproj-client.js', () => ({
	callGenproj: vi.fn()
}));

describe('POST /projects/genproj/api/conflicts', () => {
	const event = (body) => ({
		request: new Request('http://localhost/projects/genproj/api/conflicts', {
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

	it('forwards the body with auth required', async () => {
		const body = { name: 'demo', selectedCapabilities: ['docker'] };
		callGenproj.mockResolvedValue({ status: 200, body: { conflicts: [] } });

		const response = await POST(event(body));

		expect(callGenproj).toHaveBeenCalledWith(expect.anything(), '/v1/conflicts', body, {
			auth: true
		});
		expect(await response.json()).toEqual({ conflicts: [] });
	});

	it('passes a conflict result through unchanged', async () => {
		callGenproj.mockResolvedValue({
			status: 200,
			body: { conflicts: [{ path: 'README.md', reason: 'exists' }] }
		});

		const response = await POST(event({ name: 'demo', selectedCapabilities: ['docker'] }));

		expect(response.status).toBe(200);
		expect((await response.json()).conflicts).toHaveLength(1);
	});

	it('returns 500 when the call itself throws', async () => {
		callGenproj.mockRejectedValue(new Error('binding unavailable'));

		const response = await POST(event({ name: 'demo', selectedCapabilities: ['docker'] }));

		expect(response.status).toBe(500);
	});
});
