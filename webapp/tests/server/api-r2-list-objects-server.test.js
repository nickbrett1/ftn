import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, OPTIONS } from '../../src/routes/api/r2/list-objects/+server.js';

describe('/api/r2/list-objects', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEvent = {
			platform: {
				env: {
					R2_CCBILLING: {
						list: vi.fn()
					}
				}
			},
			request: {
				url: 'http://localhost:5173/api/r2/list-objects?bucket=ccbilling'
			}
		};
	});

	describe('GET', () => {
		it('should return a 400 if no bucket is provided', async () => {
			mockEvent.request.url = 'http://localhost:5173/api/r2/list-objects';
			const response = await GET(mockEvent);
			expect(response.status).toBe(400);
		});

		it('should return a 400 if the bucket is unknown', async () => {
			mockEvent.request.url = 'http://localhost:5173/api/r2/list-objects?bucket=unknown';
			const response = await GET(mockEvent);
			expect(response.status).toBe(400);
		});

		it('should return a 500 if the R2 bucket is not configured', async () => {
			mockEvent.platform.env.R2_CCBILLING = null;
			const response = await GET(mockEvent);
			expect(response.status).toBe(500);
		});

		it('should return the list of objects on success', async () => {
			mockEvent.platform.env.R2_CCBILLING.list.mockResolvedValue({
				objects: [{ key: 'test.pdf', size: 1, etag: '1', uploaded: new Date() }]
			});
			const response = await GET(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.objects.length).toBe(1);
		});

		it('should return a 500 if the R2 call fails', async () => {
			mockEvent.platform.env.R2_CCBILLING.list.mockRejectedValue(new Error('R2 Error'));
			const response = await GET(mockEvent);
			expect(response.status).toBe(500);
		});
	});

	describe('OPTIONS', () => {
		it('should return a 200 response', async () => {
			const response = await OPTIONS();
			expect(response.status).toBe(200);
		});
	});
});
