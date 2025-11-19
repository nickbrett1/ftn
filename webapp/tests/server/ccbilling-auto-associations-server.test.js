import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT, DELETE } from '../../src/routes/projects/ccbilling/auto-associations/+server.js';
import * as db from '$lib/server/ccbilling-db.js';
import * as auth from '$lib/server/require-user.js';

vi.mock('$lib/server/ccbilling-db.js');
vi.mock('$lib/server/require-user.js');

describe('/projects/ccbilling/auto-associations', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();
		auth.requireUser.mockResolvedValue({ id: 1 });
		mockEvent = {
			request: {
				json: vi.fn()
			}
		};
	});

	describe('PUT', () => {
		it('should return a 400 if no merchant or newBudgetName is provided', async () => {
			mockEvent.request.json.mockResolvedValue({});
			const response = await PUT(mockEvent);
			expect(response.status).toBe(400);
		});

		it('should return a 404 if the budget is not found', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: 'test', newBudgetName: 'test' });
			db.listBudgets.mockResolvedValue([]);
			const response = await PUT(mockEvent);
			expect(response.status).toBe(404);
		});

		it('should update the auto-association on success', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: 'test', newBudgetName: 'test' });
			db.listBudgets.mockResolvedValue([{ id: 1, name: 'test' }]);
			db.getBudgetByMerchant.mockResolvedValue(null);
			const response = await PUT(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.success).toBe(true);
		});
	});

	describe('DELETE', () => {
		it('should return a 400 if no merchant is provided', async () => {
			mockEvent.request.json.mockResolvedValue({});
			const response = await DELETE(mockEvent);
			expect(response.status).toBe(400);
		});

		it('should return a 404 if no auto-association is found', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: 'test' });
			db.getBudgetByMerchant.mockResolvedValue(null);
			const response = await DELETE(mockEvent);
			expect(response.status).toBe(404);
		});

		it('should delete the auto-association on success', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: 'test' });
			db.getBudgetByMerchant.mockResolvedValue({ id: 1 });
			const response = await DELETE(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.success).toBe(true);
		});
	});
});
