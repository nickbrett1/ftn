// webapp/tests/contract/test_capabilities_api.js

import { test, expect } from '@playwright/test';

// Define the expected structure of a capability object
const EXPECTED_CAPABILITY_STRUCTURE = {
    id: expect.any(String),
    name: expect.any(String),
    description: expect.any(String),
    dependencies: expect.any(Array),
    category: expect.any(String)
};

test.describe('Capabilities API Contract', () => {
    test('GET /api/projects/genproj/api/capabilities should return a list of capabilities with the expected structure', async ({ request }) => {
        const response = await request.get('/api/projects/genproj/api/capabilities');
        expect(response.ok()).toBeTruthy();

        const capabilities = await response.json();
        expect(Array.isArray(capabilities)).toBeTruthy();
        expect(capabilities.length).toBeGreaterThan(0); // Expect at least one capability

        // Validate the structure of each capability
        capabilities.forEach(capability => {
            expect(capability).toMatchObject(EXPECTED_CAPABILITY_STRUCTURE);
        });
    });

    test('Capabilities should have non-empty id, name, description, and category', async ({ request }) => {
        const response = await request.get('/api/projects/genproj/api/capabilities');
        expect(response.ok()).toBeTruthy();

        const capabilities = await response.json();
        capabilities.forEach(capability => {
            expect(capability.id).not.toBe('');
            expect(capability.name).not.toBe('');
            expect(capability.description).not.toBe('');
            expect(capability.category).not.toBe('');
        });
    });

    test('Capabilities should have unique IDs', async ({ request }) => {
        const response = await request.get('/api/projects/genproj/api/capabilities');
        expect(response.ok()).toBeTruthy();

        const capabilities = await response.json();
        const ids = capabilities.map(c => c.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
    });
});