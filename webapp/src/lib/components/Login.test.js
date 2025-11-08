import { expect, vi, describe, it, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Login from './Login.svelte';

// Mock the shared Google auth utility
vi.mock('$lib/client/google-auth.js', () => ({
	initiateGoogleAuth: vi.fn(),
	isUserAuthenticated: vi.fn()
}));

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('Login correctly', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Clear all mocks and timers to prevent leaks
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.restoreAllMocks();
	});

	it('logs in', async () => {
		const { initiateGoogleAuth, isUserAuthenticated } = await import('$lib/client/google-auth.js');
		const { goto } = await import('$app/navigation');

		// Mock isUserAuthenticated to return false (not logged in)
		isUserAuthenticated.mockReturnValue(false);

		const component = mount(Login, {
			target: document.body
		});

		const button = document.querySelector('button');

		// Click the button
		button.click();

		flushSync();

		// Should call the shared Google auth utility
		expect(initiateGoogleAuth).toHaveBeenCalledWith();
		
		unmount(component);
	});

	it('redirects to current path if already logged in', async () => {
		const { goto } = await import('$app/navigation');
		const { initiateGoogleAuth, isUserAuthenticated } = await import('$lib/client/google-auth.js');

		// Mock isUserAuthenticated to return true (logged in)
		isUserAuthenticated.mockReturnValue(true);

		// Mock window.location.pathname
		const originalPathname = window.location.pathname;
		Object.defineProperty(window, 'location', {
			writable: true,
			value: { pathname: '/current-page' }
		});

		const component = mount(Login, {
			target: document.body
		});

		// Wait for onMount to run and check auth status
		await new Promise(resolve => setTimeout(resolve, 10));
		flushSync();

		const button = document.querySelector('button');

		// Click the button
		button.click();

		flushSync();

		// Should redirect to current path
		expect(goto).toHaveBeenCalledWith('/current-page');
		// Should not call initiateGoogleAuth
		expect(initiateGoogleAuth).not.toHaveBeenCalled();
		
		unmount(component);

		// Restore original window.location.pathname
		Object.defineProperty(window, 'location', {
			writable: true,
			value: { pathname: originalPathname }
		});
	});
});
