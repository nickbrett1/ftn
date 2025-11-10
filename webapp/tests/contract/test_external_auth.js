// webapp/tests/contract/test_external_auth.js

import { test, expect } from '@playwright/test';

test.describe('External Service Auth Endpoints Contract', () => {
    const services = ['circleci', 'doppler', 'sonarcloud'];

    for (const serviceName of services) {
        test(`GET /api/projects/genproj/api/auth/${serviceName} should redirect to ${serviceName} OAuth`, async ({ request }) => {
            const response = await request.get(`/api/projects/genproj/api/auth/${serviceName}`, {
                maxRedirects: 0 // Do not follow redirects
            });

            expect(response.status()).toBe(302); // Expect a redirect status
            const location = response.headers().location;

            // Basic check for common OAuth parameters
            expect(location).toContain('client_id=');
            expect(location).toContain('redirect_uri=');
            expect(location).toContain('response_type=code');
            expect(location).toContain('scope=');
        });

        test(`GET /api/projects/genproj/api/auth/${serviceName}/callback should handle OAuth callback`, async ({ request }) => {
            const dummyCode = `dummy_${serviceName}_code`;
            const response = await request.get(`/api/projects/genproj/api/auth/${serviceName}/callback?code=${dummyCode}`, {
                maxRedirects: 0 // Do not follow redirects
            });

            // Expect a redirect to the genproj page or a success page
            expect(response.status()).toBe(302);
            const location = response.headers().location;
            expect(location).toMatch(/\/projects\/genproj|\/auth\/success/);
        });

        test(`GET /api/projects/genproj/api/auth/${serviceName}/callback should handle OAuth errors`, async ({ request }) => {
            const errorResponse = await request.get(`/api/projects/genproj/api/auth/${serviceName}/callback?error=access_denied`, {
                maxRedirects: 0 // Do not follow redirects
            });

            // Expect a redirect to an error page or the genproj page with an error message
            expect(errorResponse.status()).toBe(302);
            const location = errorResponse.headers().location;
            expect(location).toMatch(/\/auth\/error|\/projects\/genproj\?error=access_denied/);
        });
    }
});