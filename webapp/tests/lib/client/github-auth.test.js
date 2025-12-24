import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initiateGitHubAuth } from '../../../src/lib/client/github-auth.js';

vi.mock('$lib/utils/logging.js', () => ({
    logger: {
        error: vi.fn()
    }
}));

describe('initiateGitHubAuth', () => {
    let originalLocation;
    let locationMock;

    beforeEach(() => {
        // Mock window.location
        originalLocation = globalThis.location;
        locationMock = {
            href: '',
            origin: 'http://localhost'
        };
        // Use Object.defineProperty to make location writable
        Object.defineProperty(globalThis, 'location', {
            value: locationMock,
            writable: true
        });
    });

    afterEach(() => {
        Object.defineProperty(globalThis, 'location', {
            value: originalLocation,
            writable: true
        });
        vi.restoreAllMocks();
    });

    it('navigates to base auth URL when no current href provided', async () => {
        await initiateGitHubAuth();
        expect(globalThis.location.href).toBe('/projects/genproj/api/auth/github');
    });

    it('preserves query parameters from current href', async () => {
        const currentHref = 'http://localhost/page?selected=a,b&projectName=test&repositoryUrl=http://repo.com';
        await initiateGitHubAuth(currentHref);

        const url = new URL(globalThis.location.href, 'http://localhost');
        expect(url.pathname).toBe('/projects/genproj/api/auth/github');
        expect(url.searchParams.get('selected')).toBe('a,b');
        expect(url.searchParams.get('projectName')).toBe('test');
        expect(url.searchParams.get('repositoryUrl')).toBe('http://repo.com');
    });

    it('ignores other query parameters', async () => {
        const currentHref = 'http://localhost/page?other=param&selected=cap';
        await initiateGitHubAuth(currentHref);

        const url = new URL(globalThis.location.href, 'http://localhost');
        expect(url.searchParams.get('selected')).toBe('cap');
        expect(url.searchParams.has('other')).toBe(false);
    });

    it('handles invalid URL in currentHref gracefully', async () => {
        // new URL('invalid') throws
        await expect(initiateGitHubAuth('invalid-url')).rejects.toThrow();
        // Check logger called
        const { logger } = await import('../../../src/lib/utils/logging.js');
        expect(logger.error).toHaveBeenCalled();
    });
});
