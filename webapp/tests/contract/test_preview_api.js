// webapp/tests/contract/test_preview_api.js

import { test, expect } from '@playwright/test';

test.describe('Preview API Contract', () => {
    test('POST /api/projects/genproj/api/preview should return a project preview', async ({ request }) => {
        const response = await request.post('/api/projects/genproj/api/preview', {
            data: {
                projectName: 'my-test-project',
                selectedCapabilities: ['devcontainer-node'],
                configuration: {
                    'devcontainer-node': {
                        nodeVersion: '18'
                    }
                }
            }
        });
        expect(response.ok()).toBeTruthy();

        const preview = await response.json();
        expect(preview).toHaveProperty('files');
        expect(Array.isArray(preview.files)).toBeTruthy();
        expect(preview.files.length).toBeGreaterThan(0);

        // Expect at least one file to be a Dockerfile for devcontainer-node
        const dockerfile = preview.files.find(f => f.filePath === '.devcontainer/Dockerfile');
        expect(dockerfile).toBeDefined();
        expect(dockerfile.content).toContain('FROM mcr.microsoft.com/devcontainers/javascript:18');
    });

    test('POST /api/projects/genproj/api/preview should reject invalid configuration', async ({ request }) => {
        const response = await request.post('/api/projects/genproj/api/preview', {
            data: {
                projectName: '', // Invalid project name
                selectedCapabilities: ['devcontainer-node'],
                configuration: {}
            }
        });
        expect(response.status()).toBe(400); // Bad Request
        const error = await response.json();
        expect(error).toHaveProperty('message');
        expect(error.message).toContain('Validation failed');
    });
});