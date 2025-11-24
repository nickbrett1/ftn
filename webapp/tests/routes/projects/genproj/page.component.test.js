
import { render, fireEvent, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Page from '../../../../src/routes/projects/genproj/+page.svelte';
import * as googleAuth from '$lib/client/google-auth';

// Mock the google-auth module
vi.mock('$lib/client/google-auth', () => ({
    initiateGoogleAuth: vi.fn(),
    isUserAuthenticated: vi.fn(() => false),
    getRedirectUri: vi.fn(() => 'http://localhost/auth')
}));

// Mock logging
vi.mock('$lib/utils/logging', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

// Mock navigation
vi.mock('$app/navigation', () => ({
    goto: vi.fn()
}));

// Mock env
vi.mock('$app/environment', () => ({
    browser: true,
    dev: true
}));

// Mock global constants used in Footer
global.__GIT_BRANCH__ = 'test-branch';
global.__GIT_COMMIT__ = 'test-commit';
global.__BUILD_TIME__ = new Date().toISOString();

describe('GenProj Page Component', () => {
    const mockCapabilities = [
        {
            id: 'core-cap',
            name: 'Core Capability',
            category: 'core',
            description: 'Core cap',
            dependencies: [],
            conflicts: [],
            requiresAuth: []
        },
        {
            id: 'test-cap',
            name: 'Test Capability',
            category: 'ci-cd',
            description: 'Test cap',
            dependencies: [],
            conflicts: [],
            requiresAuth: []
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock global fetch for capabilities loading if needed
        global.fetch = vi.fn();

        // Mock window.location
        // We need to properly mock window.location to simulate the URL
        Object.defineProperty(window, 'location', {
            value: {
                pathname: '/projects/genproj',
                origin: 'http://localhost',
                hostname: 'localhost', // Added hostname for Footer check
                href: 'http://localhost/projects/genproj',
                assign: vi.fn()
            },
            writable: true,
            configurable: true
        });

        // Mock globalThis.location as well because Footer uses globalThis
        Object.defineProperty(globalThis, 'location', {
            value: {
                pathname: '/projects/genproj',
                origin: 'http://localhost',
                hostname: 'localhost',
                href: 'http://localhost/projects/genproj',
                assign: vi.fn()
            },
            writable: true,
            configurable: true
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should pass selected options to initiateGoogleAuth when login is clicked', async () => {
        const { component } = render(Page, {
            data: {
                isAuthenticated: false,
                capabilities: mockCapabilities,
                selectedCapabilities: ['core-cap'] // Pre-select core
            }
        });

        // Verify we are in demo mode (login button visible)
        const loginButton = screen.getByRole('button', { name: /Login/i });
        expect(loginButton).toBeTruthy();

        await fireEvent.click(loginButton);

        // Check if initiateGoogleAuth was called
        expect(googleAuth.initiateGoogleAuth).toHaveBeenCalled();

        // Check the arguments
        const calledArg = googleAuth.initiateGoogleAuth.mock.calls[0][0];

        // The expected behavior (fix)
        expect(calledArg).toContain('selected=core-cap');
        expect(calledArg).toContain('/projects/genproj');
    });
});
