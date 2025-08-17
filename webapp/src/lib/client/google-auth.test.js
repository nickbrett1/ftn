import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initiateGoogleAuth, getRedirectUri } from './google-auth.js';

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock nanoid
vi.mock('nanoid', () => ({
	nanoid: vi.fn(() => 'mock-state-id')
}));

describe('Google Auth Utils', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset document.cookie
		Object.defineProperty(document, 'cookie', {
			writable: true,
			value: ''
		});
		// Reset window.google
		delete window.google;
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
			
			expect(goto).toHaveBeenCalledWith('/projects/ccbilling');
		});

		it('should not redirect if auth cookie is deleted', async () => {
			const { goto } = await import('$app/navigation');
			
			// Mock deleted auth state
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: 'auth=deleted'
			});

			await initiateGoogleAuth('/projects/ccbilling');
			
			expect(goto).not.toHaveBeenCalled();
		});

		it('should not redirect if no auth cookie', async () => {
			const { goto } = await import('$app/navigation');
			
			// Mock no auth state
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: ''
			});

			await initiateGoogleAuth('/projects/ccbilling');
			
			expect(goto).not.toHaveBeenCalled();
		});

		it('should handle missing auth cookie gracefully', async () => {
			const { goto } = await import('$app/navigation');
			
			// Mock no auth cookie by setting it to empty
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: ''
			});

			await initiateGoogleAuth('/projects/ccbilling');
			
			expect(goto).not.toHaveBeenCalled();
		});

		it('should use Google GIS if already loaded', async () => {
			const { goto } = await import('$app/navigation');
			
			// Mock Google GIS already loaded
			window.google = {
				accounts: {
					oauth2: {
						initCodeClient: vi.fn(() => ({
							requestCode: vi.fn()
						}))
					}
				}
			};

			await initiateGoogleAuth('/projects/ccbilling');
			
			expect(goto).not.toHaveBeenCalled();
			expect(window.google.accounts.oauth2.initCodeClient).toHaveBeenCalled();
		});

		it('should load Google GIS script if not already loaded', async () => {
			const { goto } = await import('$app/navigation');
			
			// Mock script loading
			const mockScript = {
				src: '',
				nonce: '',
				onload: vi.fn(),
				onerror: vi.fn()
			};
			
			vi.spyOn(document, 'createElement').mockReturnValue(mockScript);
			vi.spyOn(document.body, 'appendChild').mockImplementation(() => {
				// Simulate script load
				setTimeout(() => mockScript.onload(), 0);
			});

			await initiateGoogleAuth('/projects/ccbilling');
			
			expect(document.createElement).toHaveBeenCalledWith('script');
			expect(mockScript.src).toBe('https://accounts.google.com/gsi/client');
			expect(mockScript.nonce).toBe('%sveltekit.nonce%');
		});

		it('should handle script loading errors', async () => {
			const { goto } = await import('$app/navigation');
			
			// Mock script loading with error
			const mockScript = {
				src: '',
				nonce: '',
				onload: vi.fn(),
				onerror: vi.fn()
			};
			
			vi.spyOn(document, 'createElement').mockReturnValue(mockScript);
			vi.spyOn(document.body, 'appendChild').mockImplementation(() => {
				// Simulate script error immediately
				mockScript.onerror();
			});

			await expect(initiateGoogleAuth('/projects/ccbilling')).rejects.toThrow('Google gsi script failed to load');
		});

		it('should initialize Google Identity Services when script loads', async () => {
			const { goto } = await import('$app/navigation');
			
			// Mock script loading
			const mockScript = {
				src: '',
				nonce: '',
				onload: vi.fn(),
				onerror: vi.fn()
			};
			
			vi.spyOn(document, 'createElement').mockReturnValue(mockScript);
			vi.spyOn(document.body, 'appendChild').mockImplementation(() => {
				// Simulate script load and initialize Google GIS immediately
				window.google = {
					accounts: {
						id: {
							initialize: vi.fn()
						},
						oauth2: {
							initCodeClient: vi.fn(() => ({
								requestCode: vi.fn()
							}))
						}
					}
				};
				// Call onload after setting up google
				setTimeout(() => mockScript.onload(), 0);
			});

			await initiateGoogleAuth('/projects/ccbilling');
			
			// Wait a bit for the async operations
			await new Promise(resolve => setTimeout(resolve, 10));
			
			expect(window.google.accounts.id.initialize).toHaveBeenCalled();
			expect(window.google.accounts.oauth2.initCodeClient).toHaveBeenCalled();
		});

		it('should handle state mismatch in OAuth callback', async () => {
			const { goto } = await import('$app/navigation');
			
			// Mock Google GIS with state mismatch
			window.google = {
				accounts: {
					id: {
						initialize: vi.fn()
					},
					oauth2: {
						initCodeClient: vi.fn(() => ({
							requestCode: vi.fn()
						}))
					}
				}
			};

			// Mock the callback to simulate state mismatch
			const initCodeClientSpy = vi.spyOn(window.google.accounts.oauth2, 'initCodeClient');
			initCodeClientSpy.mockImplementation((config) => {
				// Simulate state mismatch in callback immediately
				config.callback({ state: 'wrong-state' });
				return { requestCode: vi.fn() };
			});

			await expect(initiateGoogleAuth('/projects/ccbilling')).rejects.toThrow('State mismatch');
		});

		it('should handle OAuth errors in callback', async () => {
			const { goto } = await import('$app/navigation');
			
			// Mock Google GIS with OAuth error
			window.google = {
				accounts: {
					id: {
						initialize: vi.fn()
					},
					oauth2: {
						initCodeClient: vi.fn(() => ({
							requestCode: vi.fn()
						}))
					}
				}
			};

			// Mock the callback to simulate OAuth error
			const initCodeClientSpy = vi.spyOn(window.google.accounts.oauth2, 'initCodeClient');
			initCodeClientSpy.mockImplementation((config) => {
				// Simulate OAuth error in callback immediately
				config.callback({ error: 'access_denied' });
				return { requestCode: vi.fn() };
			});

			await expect(initiateGoogleAuth('/projects/ccbilling')).rejects.toThrow('Failed to initCodeClient');
		});
	});

	describe('Edge cases', () => {
		it('should handle empty document.cookie', async () => {
			const { goto } = await import('$app/navigation');
			
			// Mock empty document.cookie
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: ''
			});

			await initiateGoogleAuth('/projects/ccbilling');
			
			expect(goto).not.toHaveBeenCalled();
		});
	});
});