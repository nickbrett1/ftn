import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initiateGoogleAuth, getRedirectUri, isUserAuthenticated } from './google-auth.js';

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock nanoid
vi.mock('nanoid', () => ({
	nanoid: vi.fn(() => 'mock-state-id')
}));

describe('Google Auth Utils', () => {
	let originalCreateElement;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset document.cookie
		Object.defineProperty(document, 'cookie', {
			writable: true,
			value: ''
		});
		// Reset window.google
		delete globalThis.google;

		originalCreateElement = document.createElement;
		// Mock document.createElement to return a mock script element
		vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
			if (tagName === 'script') {
				const script = originalCreateElement.call(document, 'script');
				vi.spyOn(script, 'setAttribute');
				vi.spyOn(script, 'remove');
				return script;
			}
			// For other elements, call the original createElement
			return originalCreateElement.call(document, tagName);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.clearAllTimers();
	});

	describe('getRedirectUri', () => {
		it('should return development URI in development environment', () => {
			const originalEnvironment = process.env.NODE_ENV;
			process.env.NODE_ENV = 'development';

			const uri = getRedirectUri();
			expect(uri).toBe('http://127.0.0.1:5173/auth');

			process.env.NODE_ENV = originalEnvironment;
		});

		it('should return production URI in production environment', () => {
			const originalEnvironment = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';

			// Mock browser environment for production test
			const originalLocation = globalThis.location;
			Object.defineProperty(globalThis, 'location', {
				writable: true,
				configurable: true,
				value: {
					origin: 'https://fintechnick.com'
				}
			});

			const uri = getRedirectUri();
			expect(uri).toBe('https://fintechnick.com/auth');

			// Clean up
			Object.defineProperty(globalThis, 'location', {
				writable: true,
				configurable: true,
				value: originalLocation
			});
			process.env.NODE_ENV = originalEnvironment;
		});

		it('should return preview URI for preview deployments', () => {
			const originalEnvironment = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';

			// Mock browser environment for preview deployment
			const originalLocation = globalThis.location;
			Object.defineProperty(globalThis, 'location', {
				writable: true,
				configurable: true,
				value: {
					origin: 'https://ftn-preview.nick-brett1.workers.dev'
				}
			});

			const uri = getRedirectUri();
			expect(uri).toBe('https://ftn-preview.nick-brett1.workers.dev/auth');

			// Clean up
			Object.defineProperty(globalThis, 'location', {
				writable: true,
				configurable: true,
				value: originalLocation
			});
			process.env.NODE_ENV = originalEnvironment;
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
			const { goto } = await import('$app/navigation');

			// Mock logged in state
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: 'auth=some-valid-token'
			});

			await initiateGoogleAuth('/projects/ccbilling');

			expect(goto).toHaveBeenCalledWith('/projects/ccbilling');
		});

		it('should redirect to default path if no path specified', async () => {
			const { goto } = await import('$app/navigation');

			// Mock logged in state
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: 'auth=some-valid-token'
			});

			await initiateGoogleAuth();

			expect(goto).toHaveBeenCalledWith(globalThis.location.pathname);
		});

		it('should set redirectPath cookie and request code with GIS if not logged in', async () => {
			// Mock not logged in state
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: ''
			});

			// Mock globalThis.google.accounts.oauth2
			globalThis.google = {
				accounts: {
					oauth2: {
						initCodeClient: vi.fn(() => ({
							requestCode: vi.fn()
						}))
					}
				}
			};

			await initiateGoogleAuth('/some-path');

			expect(document.cookie).toContain('redirectPath=/some-path');
			expect(globalThis.google.accounts.oauth2.initCodeClient).toHaveBeenCalledWith(
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

			globalThis.google = undefined;

			const appendSpy = vi.spyOn(document.body, 'append');

			// Call initiateGoogleAuth once

			const initiateAuthPromise = initiateGoogleAuth();

			// Expect appendChild to have been called with a script element

			expect(appendSpy).toHaveBeenCalledWith(expect.any(HTMLScriptElement));

			const scriptElement = appendSpy.mock.calls[0][0];

			expect(scriptElement.src).toBe('https://accounts.google.com/gsi/client');

			// Mock GIS loaded after script, but before onload is triggered

			globalThis.google = {
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

			// Simulate script loading success
			scriptElement.dispatchEvent(new Event('load'));

			// Wait for the initiateAuthPromise to resolve

			await initiateAuthPromise;

			expect(globalThis.google.accounts.id.initialize).toHaveBeenCalledWith(
				expect.objectContaining({
					client_id: '263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com'
				})
			);

			expect(globalThis.google.accounts.oauth2.initCodeClient).toHaveBeenCalled();
		});
		it('should handle GIS script loading errors', async () => {
			// Mock GIS not loaded
			globalThis.google = undefined;

			const appendSpy = vi.spyOn(document.body, 'append');
			appendSpy.mockImplementationOnce((scriptElement) => {
				scriptElement.dispatchEvent(new Event('error')); // Simulate script loading error
			});

			await expect(initiateGoogleAuth()).rejects.toThrow('Google gsi script failed to load');
		});

		it('should handle GIS initialization errors', async () => {
			// Mock GIS not loaded
			globalThis.google = undefined;

			const appendSpy = vi.spyOn(document.body, 'append');
			appendSpy.mockImplementationOnce((scriptElement) => {
				scriptElement.dispatchEvent(new Event('load')); // Simulate script loading
			});

			// Mock GIS loaded but id not initialized
			globalThis.google = {
				accounts: {
					id: undefined,
					oauth2: undefined
				}
			};

			await expect(initiateGoogleAuth()).rejects.toThrow(
				'Google Identity Services failed to load properly'
			);
		});

		it('should handle initCodeClient errors', async () => {
			// Mock not logged in state
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: ''
			});

			// Mock window.google.accounts.oauth2
			globalThis.google = {
				accounts: {
					oauth2: {
						initCodeClient: vi.fn(() => {
							throw new Error('Failed to initCodeClient');
						})
					}
				}
			};

			await expect(initiateGoogleAuth()).rejects.toThrow('Failed to initCodeClient');
		});

		it('should handle state mismatch error', async () => {
			// Mock not logged in state
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: ''
			});

			// Mock globalThis.google.accounts.oauth2
			globalThis.google = {
				accounts: {
					oauth2: {
						initCodeClient: vi.fn(() => ({
							requestCode: vi.fn()
						}))
					}
				}
			};

			// Simulate a state mismatch in the callback
			globalThis.google.accounts.oauth2.initCodeClient.mockImplementationOnce((options) => {
				options.callback({ state: 'mismatched-state' });
				return { requestCode: vi.fn() };
			});

			await expect(initiateGoogleAuth()).rejects.toThrow('State mismatch');
		});
	});
});
