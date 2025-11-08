import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock nanoid
vi.mock('nanoid', () => ({
        nanoid: vi.fn(() => 'mock-state-id')
}));

describe('Google Auth Utils', () => {
        let initiateGoogleAuth;
        let getRedirectUri;
        let isUserAuthenticated;

        beforeEach(async () => {
                vi.clearAllMocks();
                // Reset document.cookie
                Object.defineProperty(document, 'cookie', {
                        writable: true,
                        value: ''
                });
                // Default mock for window.google to simulate GIS loaded
                window.google = {
                        accounts: {
                                id: {
                                        initialize: vi.fn(),
                                        renderButton: vi.fn(),
                                        prompt: vi.fn()
                                },
                                oauth2: {
                                        initCodeClient: vi.fn(() => ({
                                                requestCode: vi.fn()
                                        }))
                                }
                        }
                };

                // Dynamically import the module under test after mocks are set up
                ({ initiateGoogleAuth, getRedirectUri, isUserAuthenticated } = await import('./google-auth.js'));
        });

        afterEach(() => {
                // Clear all mocks and timers to prevent leaks
                vi.clearAllMocks();
                vi.clearAllTimers();
                vi.restoreAllMocks();
        });

        describe('getRedirectUri', () => {
                it('should return development URI in development environment', () => {
                        const originalEnv = process.env.NODE_ENV;
                        process.env.NODE_ENV = 'development';

                        const uri = getRedirectUri();
                        expect(uri).toBe('http://127.0.0.1:5173/auth');

                        process.env.NODE_ENV = originalEnv;
                });

                it('should return production URI in production environment', () => {
                        const originalEnv = process.env.NODE_ENV;
                        process.env.NODE_ENV = 'production';

                        // Mock browser environment for production test
                        const originalLocation = window.location;
                        Object.defineProperty(window, 'location', {
                                writable: true,
                                configurable: true,
                                value: {
                                        origin: 'https://fintechnick.com'
                                }
                        });

                        const uri = getRedirectUri();
                        expect(uri).toBe('https://fintechnick.com/auth');

                        // Clean up
                        Object.defineProperty(window, 'location', {
                                writable: true,
                                configurable: true,
                                value: originalLocation
                        });
                        process.env.NODE_ENV = originalEnv;
                });

                it('should return preview URI for preview deployments', () => {
                        const originalEnv = process.env.NODE_ENV;
                        process.env.NODE_ENV = 'production';

                        // Mock browser environment for preview deployment
                        const originalLocation = window.location;
                        Object.defineProperty(window, 'location', {
                                writable: true,
                                configurable: true,
                                value: {
                                        origin: 'https://ftn-preview.nick-brett1.workers.dev'
                                }
                        });

                        const uri = getRedirectUri();
                        expect(uri).toBe('https://ftn-preview.nick-brett1.workers.dev/auth');

                        // Clean up
                        Object.defineProperty(window, 'location', {
                                writable: true,
                                configurable: true,
                                value: originalLocation
                        });
                        process.env.NODE_ENV = originalEnv;
                });
        });

        describe('isUserAuthenticated', () => {
                it('should return true when auth cookie is present and valid', () => {
                        Object.defineProperty(document, 'cookie', {
                                writable: true,
                                value: 'auth=some-valid-token'
                        });

                        expect(isUserAuthenticated()).toBe(true);
                });

                it('should return false when auth cookie is deleted', () => {
                        Object.defineProperty(document, 'cookie', {
                                writable: true,
                                value: 'auth=deleted'
                        });

                        expect(isUserAuthenticated()).toBe(false);
                });

                it('should return false when no auth cookie is present', () => {
                        Object.defineProperty(document, 'cookie', {
                                writable: true,
                                value: ''
                        });

                        expect(isUserAuthenticated()).toBe(false);
                });

                it('should return false when auth cookie is malformed', () => {
                        Object.defineProperty(document, 'cookie', {
                                writable: true,
                                value: 'invalid-cookie-format'
                        });

                        expect(isUserAuthenticated()).toBe(false);
                });
        });

        describe('initiateGoogleAuth', () => {
                it('should redirect to ccbilling if user is already logged in', async () => {
                        const goto = vi.fn();

                        // Mock logged in state
                        Object.defineProperty(document, 'cookie', {
                                writable: true,
                                value: 'auth=some-valid-token'
                        });

                        await initiateGoogleAuth('/projects/ccbilling', goto);

                        expect(goto).toHaveBeenCalledWith('/projects/ccbilling');
                });

                it('should set redirectPath cookie and request code with GIS if not logged in', async () => {
                        // Mock not logged in state
                        Object.defineProperty(document, 'cookie', {
                                writable: true,
                                value: ''
                        });

                        const initCodeClientMock = vi.fn(() => ({
                                requestCode: vi.fn()
                        }));
                        window.google.accounts.oauth2.initCodeClient = initCodeClientMock;

                        await initiateGoogleAuth('/some-path');

                        expect(document.cookie).toContain('redirectPath=/some-path');
                        expect(initCodeClientMock).toHaveBeenCalledWith(
                                expect.objectContaining({
                                        client_id: '263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com',
                                        scope: 'openid profile email',
                                        ux_mode: 'redirect',
                                        state: 'mock-state-id',
                                        redirect_uri: getRedirectUri()
                                })
                        );
                });

                it('should load GIS script if not already loaded', async () => {
                        // Mock GIS not loaded
                        window.google = undefined;

                        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
                        const script = document.createElement('script');
                        script.src = 'https://accounts.google.com/gsi/client';
                        script.nonce = '%sveltekit.nonce%';

                        // Mock script loading success
                        appendChildSpy.mockImplementationOnce((s) => {
                                s.onload(); // Simulate script loading
                        });

                        // Mock GIS loaded after script
                        window.google = {
                                accounts: {
                                        id: {
                                                initialize: vi.fn(),
                                                renderButton: vi.fn(),
                                                prompt: vi.fn()
                                        },
                                        oauth2: {
                                                initCodeClient: vi.fn(() => ({
                                                        requestCode: vi.fn()
                                                }))
                                        }
                                }
                        };

                        await initiateGoogleAuth();

                        expect(appendChildSpy).toHaveBeenCalledWith(expect.any(HTMLScriptElement));
                        expect(window.google.accounts.id.initialize).toHaveBeenCalledWith(
                                expect.objectContaining({
                                        client_id: '263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com'
                                })
                        );
                        expect(window.google.accounts.oauth2.initCodeClient).toHaveBeenCalled();
                });

                it('should handle GIS script loading errors', async () => {
                        // Mock GIS not loaded
                        window.google = undefined;

                        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
                        appendChildSpy.mockImplementationOnce((s) => {
                                s.onerror(); // Simulate script loading error
                        });

                        await expect(initiateGoogleAuth()).rejects.toThrow('Google gsi script failed to load');
                });

                it('should handle GIS initialization errors', async () => {
                        // Mock GIS not loaded
                        window.google = undefined;

                        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
                        appendChildSpy.mockImplementationOnce((s) => {
                                s.onload(); // Simulate script loading
                        });

                        // Mock GIS loaded but id not initialized
                        window.google = {
                                accounts: {
                                        id: undefined,
                                        oauth2: undefined
                                }
                        };

                        await expect(initiateGoogleAuth()).rejects.toThrow('Google Identity Services failed to load properly');
                });

                it('should handle initCodeClient errors', async () => {
                        // Mock not logged in state
                        Object.defineProperty(document, 'cookie', {
                                writable: true,
                                value: ''
                        });

                        const initCodeClientMock = vi.fn(() => ({
                                requestCode: vi.fn()
                        }));
                        window.google.accounts.oauth2.initCodeClient = initCodeClientMock;

                        // Simulate an error in the callback
                        initCodeClientMock.mockImplementationOnce((options) => {
                                options.callback({ error: 'access_denied' });
                                return { requestCode: vi.fn() };
                        });

                        await expect(initiateGoogleAuth()).rejects.toThrow('Failed to initCodeClient');
                });

                it('should handle state mismatch error', async () => {
                        // Mock not logged in state
                        Object.defineProperty(document, 'cookie', {
                                writable: true,
                                value: ''
                        });

                        const initCodeClientMock = vi.fn(() => ({
                                requestCode: vi.fn()
                        }));
                        window.google.accounts.oauth2.initCodeClient = initCodeClientMock;

                        // Simulate a state mismatch in the callback
                        initCodeClientMock.mockImplementationOnce((options) => {
                                options.callback({ state: 'mismatched-state' });
                                return { requestCode: vi.fn() };
                        });

                        await expect(initiateGoogleAuth()).rejects.toThrow('State mismatch');
                });
        });
});