import { GET } from '../../../../../src/routes/api/token/agent-swarm/+server.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('$env/static/private', () => ({
	AGENT_SWARM_SECRET: 'test-secret-key-1234567890'
}));

vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

import { requireUser } from '$lib/server/require-user.js';

describe('/api/token/agent-swarm GET handler', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEvent = {};
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });
	});

	it('should return 401 if user not authenticated', async () => {
		const unauthorizedResponse = new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
		requireUser.mockResolvedValue(unauthorizedResponse);

		const response = await GET(mockEvent);

		expect(requireUser).toHaveBeenCalledWith(mockEvent);
		expect(response).toBe(unauthorizedResponse);
	});

	it('should return a valid HMAC signature and future expiry timestamp when authenticated', async () => {
		// Call the GET handler
		const response = await GET(mockEvent);
		
		expect(response.status).toBe(200);
		
		const data = await response.json();
		
		// Check expiry
		expect(data).toHaveProperty('expiry');
		expect(typeof data.expiry).toBe('number');
		expect(data.expiry).toBeGreaterThan(Date.now());
		
		// Check signature
		expect(data).toHaveProperty('signature');
		expect(typeof data.signature).toBe('string');
		expect(data.signature).toHaveLength(64); // SHA-256 HMAC signature is 32 bytes (64 hex characters)
		
		// Verify signature is valid hex
		expect(data.signature).toMatch(/^[0-9a-f]{64}$/);
	});
});
