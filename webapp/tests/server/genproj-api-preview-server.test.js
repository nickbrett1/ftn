import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/routes/projects/genproj/api/preview/+server.js';
import * as previewGenerator from '$lib/server/preview-generator.js';
import * as auth from '$lib/server/require-user.js';

vi.mock('$lib/server/preview-generator.js');
vi.mock('$lib/server/require-user.js');

describe('/projects/genproj/api/preview', () => {
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

	describe('POST', () => {
		it('should return a 400 if no project name is provided', async () => {
			mockEvent.request.json.mockResolvedValue({});
			const response = await POST(mockEvent);
			expect(response.status).toBe(400);
		});

		it('should return a 500 if the preview generation fails', async () => {
			mockEvent.request.json.mockResolvedValue({
				projectName: 'test',
				selectedCapabilities: ['devcontainer-node']
			});
			previewGenerator.generatePreview.mockRejectedValue(new Error('Preview Error'));
			const response = await POST(mockEvent);
			expect(response.status).toBe(500);
		});

		it('should return a 200 on success', async () => {
			mockEvent.request.json.mockResolvedValue({
				projectName: 'test',
				selectedCapabilities: ['devcontainer-node']
			});
			previewGenerator.generatePreview.mockResolvedValue({ success: true });
			const response = await POST(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.success).toBe(true);
		});
	});
});
