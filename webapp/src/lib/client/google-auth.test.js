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

		it('should redirect to current path if no path specified and user is logged in', async () => {
			const goto = vi.fn();
			
			// Mock logged in state
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: 'auth=some-valid-token'
			});

			// Mock window.location.pathname
			const originalPathname = window.location.pathname;
			Object.defineProperty(window, 'location', {
				writable: true,
				value: { pathname: '/current-page' }
			});

			await initiateGoogleAuth(undefined, goto);
			
			expect(goto).toHaveBeenCalledWith('/current-page');

			// Restore original window.location.pathname
			Object.defineProperty(window, 'location', {
				writable: true,
				value: { pathname: originalPathname }
			});
		});

		it('should not redirect if auth cookie is deleted', async () => {
			const goto = vi.fn();
			
			// Mock deleted auth state
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: 'auth=deleted'
			});

			// Mock Google GIS for OAuth flow
			window.google = {
				accounts: {
					oauth2: {
						initCodeClient: vi.fn(() => ({
							requestCode: vi.fn()
						}))
					}
				}
			};

			await initiateGoogleAuth('/projects/ccbilling', goto);
			
			expect(goto).not.toHaveBeenCalled();
		});

		it('should not redirect if no auth cookie', async () => {
			const goto = vi.fn();
			
			// Mock no auth state
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: ''
			});

			// Mock Google GIS for OAuth flow
			window.google = {
				accounts: {
					oauth2: {
						initCodeClient: vi.fn(() => ({
							requestCode: vi.fn()
						}))
					}
				}
			};

			await initiateGoogleAuth('/projects/ccbilling', goto);
			
			expect(goto).not.toHaveBeenCalled();
		});

		it('should handle missing auth cookie gracefully', async () => {
			const goto = vi.fn();
			
			// Mock no auth cookie by setting it to empty
			Object.defineProperty(document, 'cookie', {
				writable: true,
				value: ''
			});

			// Mock Google GIS for OAuth flow
			window.google = {
				accounts: {
					oauth2: {
						initCodeClient: vi.fn(() => ({
							requestCode: vi.fn()
						}))
					}
				}
			};

			await initiateGoogleAuth('/projects/ccbilling', goto);
			
			expect(goto).not.toHaveBeenCalled();
		});

		it('should use Google GIS if already loaded', async () => {
			const goto = vi.fn();
			
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

			await initiateGoogleAuth('/projects/ccbilling', goto);
			
			expect(goto).not.toHaveBeenCalled();
			expect(window.google.accounts.oauth2.initCodeClient).toHaveBeenCalled();
		});

		it('should load Google GIS script if not already loaded', async () => {
			const goto = vi.fn();
			// Explicitly delete window.google to force script loading
			delete window.google;
			
			// Mock script loading
			const mockScript = {
				src: '',
				nonce: '',
				onload: vi.fn(),
				onerror: vi.fn()
			};
			
			vi.spyOn(document, 'createElement').mockReturnValue(mockScript);
			vi.spyOn(document.body, 'appendChild').mockImplementation(() => {
				// Simulate script load with proper Google GIS mock
				setTimeout(() => {
					// Set up the mock before calling onload
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
					// Now call onload which will trigger the OAuth flow
					mockScript.onload();
				}, 0);
			});

			await initiateGoogleAuth('/projects/ccbilling', goto);
			
			// Wait for async operations to complete
			await new Promise(resolve => setTimeout(resolve, 10));
			
			expect(document.createElement).toHaveBeenCalledWith('script');
			expect(mockScript.src).toBe('https://accounts.google.com/gsi/client');
			expect(mockScript.nonce).toBe('%sveltekit.nonce%');
		});

		        it('should handle script loading errors', async () => {
					const goto = vi.fn();
		            // Explicitly delete window.google to force script loading
		            delete window.google;
		            
		            // Mock script loading with error
		            const mockScript = {
		                src: '',
		                nonce: '',
		                onload: vi.fn(),
		                onerror: vi.fn()
		            };
		            
		            vi.spyOn(document, 'createElement').mockReturnValue(mockScript);
		            vi.spyOn(document.body, 'appendChild').mockImplementation(() => {
		                // Simulate script error immediately - don't call onload
		                setTimeout(() => {
		                    if (mockScript.onerror) {
		                        mockScript.onerror();
		                    }
		                }, 0);
		            });
		
		            await expect(initiateGoogleAuth('/projects/ccbilling', goto)).rejects.toThrow('Google gsi script failed to load');
		        });

		it('should handle state mismatch in OAuth callback', async () => {
			const goto = vi.fn();
			
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

			await expect(initiateGoogleAuth('/projects/ccbilling', goto)).rejects.toThrow('State mismatch');
		});

		it('should handle OAuth errors in callback', async () => {
			const goto = vi.fn();
			
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

			await expect(initiateGoogleAuth('/projects/ccbilling', goto)).rejects.toThrow('Failed to initCodeClient');
		});
	});

});