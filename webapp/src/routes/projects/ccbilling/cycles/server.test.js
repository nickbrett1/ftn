import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from './+server.js';
import { createAuthTest, setupAuthMock, AUTH_MOCK } from '../test-utils.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	listBillingCycles: vi.fn(),
	createBillingCycle: vi.fn(),
	deleteBillingCycle: vi.fn()
}));

vi.mock('$lib/server/require-user.js', AUTH_MOCK['$lib/server/require-user.js']);

// Import the mocked functions
import { listBillingCycles, createBillingCycle, deleteBillingCycle } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/cycles API', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			request: {
				json: vi.fn()
			}
		};

		// Mock requireUser to return success by default
		setupAuthMock(requireUser);
	});

	describe('GET endpoint', () => {
		it('should return list of billing cycles', async () => {
			const mockCycles = [
				{ id: 1, start_date: '2024-01-01', end_date: '2024-01-31', closed: 0 },
				{ id: 2, start_date: '2024-02-01', end_date: '2024-02-29', closed: 1 }
			];
			listBillingCycles.mockResolvedValue(mockCycles);

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listBillingCycles).toHaveBeenCalledWith(mockEvent);
			expect(result).toEqual(mockCycles);
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});

		it('should redirect if user not authenticated', createAuthTest(GET, requireUser, () => mockEvent, [listBillingCycles]));

		it('should handle database errors', async () => {
			listBillingCycles.mockRejectedValue(new Error('Database error'));

			await expect(GET(mockEvent)).rejects.toThrow('Database error');
		});
	});

	describe('POST endpoint', () => {
		beforeEach(() => {
			mockEvent.request.json.mockResolvedValue({
				start_date: '2024-01-01',
				end_date: '2024-01-31'
			});
		});

		it('should create a new billing cycle', async () => {
			createBillingCycle.mockResolvedValue({});

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(createBillingCycle).toHaveBeenCalledWith(mockEvent, '2024-01-01', '2024-01-31');
			expect(result.success).toBe(true);
		});

		it('should return 400 for missing start_date', async () => {
			mockEvent.request.json.mockResolvedValue({
				end_date: '2024-01-31'
				// Missing start_date
			});

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(response.status).toBe(400);
			expect(result.error).toBe('Missing start_date or end_date');
			expect(createBillingCycle).not.toHaveBeenCalled();
		});

		it('should return 400 for missing end_date', async () => {
			mockEvent.request.json.mockResolvedValue({
				start_date: '2024-01-01'
				// Missing end_date
			});

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(response.status).toBe(400);
			expect(result.error).toBe('Missing start_date or end_date');
			expect(createBillingCycle).not.toHaveBeenCalled();
		});

		it('should return 400 for missing both dates', async () => {
			mockEvent.request.json.mockResolvedValue({});

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(response.status).toBe(400);
			expect(result.error).toBe('Missing start_date or end_date');
			expect(createBillingCycle).not.toHaveBeenCalled();
		});

		it('should redirect if user not authenticated', createAuthTest(POST, requireUser, () => mockEvent, [createBillingCycle]));

		it('should handle database errors', async () => {
			createBillingCycle.mockRejectedValue(new Error('Database error'));

			await expect(POST(mockEvent)).rejects.toThrow('Database error');
		});

		it('should handle invalid JSON', async () => {
			mockEvent.request.json.mockRejectedValue(new Error('Invalid JSON'));

			await expect(POST(mockEvent)).rejects.toThrow('Invalid JSON');
		});
	});

	describe('DELETE endpoint', () => {
		beforeEach(() => {
			mockEvent.request.json.mockResolvedValue({
				id: 1
			});
		});

		it('should delete a billing cycle', async () => {
			deleteBillingCycle.mockResolvedValue({});

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(deleteBillingCycle).toHaveBeenCalledWith(mockEvent, 1);
			expect(result.success).toBe(true);
		});

		it('should return 400 for missing id', async () => {
			mockEvent.request.json.mockResolvedValue({});

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(response.status).toBe(400);
			expect(result.error).toBe('Missing id');
			expect(deleteBillingCycle).not.toHaveBeenCalled();
		});

		it('should handle string id', async () => {
			mockEvent.request.json.mockResolvedValue({
				id: '42'
			});
			deleteBillingCycle.mockResolvedValue({});

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(deleteBillingCycle).toHaveBeenCalledWith(mockEvent, '42');
			expect(result.success).toBe(true);
		});

		it('should redirect if user not authenticated', createAuthTest(DELETE, requireUser, () => mockEvent, [deleteBillingCycle]));

		it('should handle database errors', async () => {
			deleteBillingCycle.mockRejectedValue(new Error('Database error'));

			await expect(DELETE(mockEvent)).rejects.toThrow('Database error');
		});

		it('should handle invalid JSON', async () => {
			mockEvent.request.json.mockRejectedValue(new Error('Invalid JSON'));

			await expect(DELETE(mockEvent)).rejects.toThrow('Invalid JSON');
		});
	});
});