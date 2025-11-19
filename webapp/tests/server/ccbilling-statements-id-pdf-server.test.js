import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../src/routes/projects/ccbilling/statements/[id]/pdf/+server.js';
import * as db from '$lib/server/ccbilling-db.js';
import * as auth from '$lib/server/require-user.js';

vi.mock('$lib/server/ccbilling-db.js');
vi.mock('$lib/server/require-user.js');

describe('/projects/ccbilling/statements/[id]/pdf', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();
		auth.requireUser.mockResolvedValue({ id: 1 });
		mockEvent = {
			params: { id: '1' },
			platform: {
				env: {
					R2_CCBILLING: {
						get: vi.fn()
					}
				}
			}
		};
	});

	describe('GET', () => {
		it('should return a 404 if the statement is not found', async () => {
			db.getStatement.mockResolvedValue(null);
			const response = await GET(mockEvent);
			expect(response.status).toBe(404);
		});

		it('should return a 500 if the R2 bucket is not configured', async () => {
			db.getStatement.mockResolvedValue({ id: 1, r2_key: 'test.pdf' });
			mockEvent.platform.env.R2_CCBILLING = null;
			const response = await GET(mockEvent);
			expect(response.status).toBe(500);
		});

		it('should return a 404 if the PDF is not found in R2', async () => {
			db.getStatement.mockResolvedValue({ id: 1, r2_key: 'test.pdf' });
			mockEvent.platform.env.R2_CCBILLING.get.mockResolvedValue(null);
			const response = await GET(mockEvent);
			expect(response.status).toBe(404);
		});

		it('should return the PDF if found', async () => {
			db.getStatement.mockResolvedValue({ id: 1, r2_key: 'test.pdf', filename: 'test.pdf' });
			const pdfBuffer = Buffer.from('test pdf');
			mockEvent.platform.env.R2_CCBILLING.get.mockResolvedValue({
				arrayBuffer: () => Promise.resolve(pdfBuffer)
			});
			const response = await GET(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.arrayBuffer();
			expect(Buffer.from(body)).toEqual(pdfBuffer);
		});

		it('should return a 401 if the user is not authenticated', async () => {
			auth.requireUser.mockResolvedValue(new Response(null, { status: 401 }));
			const response = await GET(mockEvent);
			expect(response.status).toBe(401);
		});
	});
});
