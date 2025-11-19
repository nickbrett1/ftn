import { describe, it, expect, vi } from 'vitest';
import { GET, DELETE } from '../../src/routes/projects/ccbilling/statements/[id]/+server.js';
import * as db from '$lib/server/ccbilling-db.js';
import * as auth from '$lib/server/require-user.js';

vi.mock('$lib/server/ccbilling-db.js');
vi.mock('$lib/server/require-user.js');

describe('/projects/ccbilling/statements/[id]', () => {
	const mockEvent = {
		params: { id: '1' },
		platform: {}
	};

	it('GET should return 401 if user is not authenticated', async () => {
		auth.requireUser.mockResolvedValue(new Response(null, { status: 401 }));
		const response = await GET(mockEvent);
		expect(response.status).toBe(401);
	});

	it('GET should return 400 for an invalid statement ID', async () => {
		auth.requireUser.mockResolvedValue({});
		const invalidEvent = { ...mockEvent, params: { id: 'invalid' } };
		const response = await GET(invalidEvent);
		expect(response.status).toBe(400);
	});

	it('GET should return a statement on success', async () => {
		auth.requireUser.mockResolvedValue({});
		const mockStatement = { id: 1, name: 'Test Statement' };
		db.getStatement.mockResolvedValue(mockStatement);
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body).toEqual(mockStatement);
	});

	it('GET should return 404 if statement not found', async () => {
		auth.requireUser.mockResolvedValue({});
		db.getStatement.mockResolvedValue(null);
		const response = await GET(mockEvent);
		expect(response.status).toBe(404);
	});

	it('DELETE should return 401 if user is not authenticated', async () => {
		auth.requireUser.mockResolvedValue(new Response(null, { status: 401 }));
		const response = await DELETE(mockEvent);
		expect(response.status).toBe(401);
	});

	it('DELETE should return 400 for an invalid statement ID', async () => {
		auth.requireUser.mockResolvedValue({});
		const invalidEvent = { ...mockEvent, params: { id: 'invalid' } };
		const response = await DELETE(invalidEvent);
		expect(response.status).toBe(400);
	});

	it('DELETE should delete a statement on success', async () => {
		auth.requireUser.mockResolvedValue({});
		db.getStatement.mockResolvedValue({ id: 1 });
		db.deleteStatement.mockResolvedValue({});
		const response = await DELETE(mockEvent);
		expect(response.status).toBe(200);
	});

	it('DELETE should return 404 if statement not found', async () => {
		auth.requireUser.mockResolvedValue({});
		db.getStatement.mockResolvedValue(null);
		const response = await DELETE(mockEvent);
		expect(response.status).toBe(404);
	});
});
