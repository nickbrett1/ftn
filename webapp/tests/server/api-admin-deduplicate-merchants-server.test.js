import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../../src/routes/api/admin/deduplicate-merchants/+server.js';
import * as auth from '$lib/server/require-user.js';

vi.mock('$lib/server/require-user.js');

describe('/api/admin/deduplicate-merchants', () => {
	let mockEvent;
	let mockDb;

	beforeEach(() => {
		vi.clearAllMocks();

		auth.requireUser.mockResolvedValue({ id: 1 });

		mockDb = {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			all: vi.fn().mockResolvedValue({ results: [] }),
			first: vi.fn().mockResolvedValue({ count: 0 }),
			run: vi.fn().mockResolvedValue({ changes: 1 })
		};

		mockEvent = {
			platform: {
				env: {
					CCBILLING_DB: mockDb
				}
			},
			request: {
				json: vi.fn().mockResolvedValue({}) // Default to empty object for dry run
			}
		};
	});

	describe('POST', () => {
		it('should return 401 if user is not authenticated', async () => {
			const unauthResponse = new Response(null, { status: 401 });
			auth.requireUser.mockResolvedValue(unauthResponse);
			const response = await POST(mockEvent);
			expect(response.status).toBe(401);
		});

		it('should return a 500 if the database is not available', async () => {
			mockEvent.platform.env.CCBILLING_DB = null;
			const response = await POST(mockEvent);
			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe('Database not available');
		});

		it('should return a dry run response by default when no duplicates are found', async () => {
			const response = await POST(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.dryRun).toBe(true);
			expect(body.duplicatesFound).toBe(0);
		});

		it('should return a dry run response with found duplicates', async () => {
			const mockDuplicates = [
				{
					canonical_form: 'AMAZON',
					variants: 'AMAZON,Amazon',
					variant_count: 2
				}
			];
			mockDb.prepare.mockImplementation((sql) => ({
				...mockDb,
				all: vi.fn().mockResolvedValue({ results: sql.includes('GROUP BY') ? mockDuplicates : [] }),
				first: vi.fn().mockResolvedValue({ count: 5 }) // Mock counts for variants
			}));

			const response = await POST(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.dryRun).toBe(true);
			expect(body.duplicatesFound).toBe(1);
			expect(body.duplicates[0].canonical).toBe('AMAZON');
		});

		it('should perform deduplication when dryRun is false', async () => {
			mockEvent.request.json.mockResolvedValue({ dryRun: false });
			const mockDuplicates = [
				{
					canonical_form: 'AMAZON',
					variants: 'AMAZON,amazon',
					variant_count: 2
				}
			];

			mockDb.prepare.mockImplementation((sql) => ({
				...mockDb,
				all: vi.fn().mockResolvedValue({ results: sql.includes('GROUP BY') ? mockDuplicates : [] }),
				first: vi.fn().mockResolvedValue({ count: 1 })
			}));

			const response = await POST(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.dryRun).toBe(false);
			expect(body.duplicatesProcessed).toBe(1);
			expect(body.paymentsUpdated).toBeGreaterThanOrEqual(1);
		});

		it('should return 500 on general failure', async () => {
			mockDb.prepare.mockImplementation(() => {
				throw new Error('DB Error');
			});
			const response = await POST(mockEvent);
			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe('Failed to deduplicate merchants');
		});
	});

	describe('GET', () => {
		it('should return 401 if user is not authenticated', async () => {
			const unauthResponse = new Response(null, { status: 401 });
			auth.requireUser.mockResolvedValue(unauthResponse);
			const response = await GET(mockEvent);
			expect(response.status).toBe(401);
		});

		it('should return a 500 if the database is not available', async () => {
			mockEvent.platform.env.CCBILLING_DB = null;
			const response = await GET(mockEvent);
			expect(response.status).toBe(500);
		});

		it('should return the status on success with no duplicates', async () => {
			const response = await GET(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.duplicatesFound).toBe(0);
		});

		it('should return the status with found duplicates', async () => {
			const mockDuplicates = [
				{
					canonical_form: 'AMAZON',
					variants: 'AMAZON,Amazon',
					variant_count: 2
				}
			];
			mockDb.prepare.mockImplementation((sql) => ({
				...mockDb,
				all: vi.fn().mockResolvedValue({ results: sql.includes('GROUP BY') ? mockDuplicates : [] }),
				first: vi.fn().mockResolvedValue({ count: 5 })
			}));

			const response = await GET(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.duplicatesFound).toBe(1);
			expect(body.totalPaymentsAffected).toBe(10);
		});

		it('should return 500 on failure', async () => {
			mockDb.prepare.mockImplementation(() => {
				throw new Error('DB Error');
			});
			const response = await GET(mockEvent);
			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe('Failed to get deduplication status');
		});
	});
});
