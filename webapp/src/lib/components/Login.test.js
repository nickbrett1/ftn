import { expect, vi, describe, it, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Login from './Login.svelte';
import { setMockUser } from '../../test-setup.js'; // Import setMockUser
import * as GoogleAuth from '$lib/client/google-auth.js';

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock initiateGoogleAuth
vi.spyOn(GoogleAuth, 'initiateGoogleAuth').mockImplementation(
	async (redirectPath, gotoFunction) => {
		const goto = gotoFunction || (await import('$app/navigation')).goto;
		goto('/mock-google-auth-redirect'); // Simulate Google auth redirect
	}
);

describe('Login correctly', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setMockUser(null); // Set user to null before each test
		// Mock globalThis.location.pathname for deterministic testing
		Object.defineProperty(globalThis, 'location', {
			value: { pathname: '/projects/genproj' },
			writable: true
		});
	});

	afterEach(() => {
		// Clear all mocks and timers to prevent leaks
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.restoreAllMocks();
		// Restore original globalThis.location
		Object.defineProperty(globalThis, 'location', { value: globalThis.location, writable: true });
	});

	it('initiates Google auth when user is not logged in', async () => {
		const { goto } = await import('$app/navigation');

		const component = mount(Login, {
			target: document.body
		});

		const button = document.querySelector('button');

		// Click the button
		button.click();

		flushSync();

		// Should initiate Google auth with the current pathname
		expect(GoogleAuth.initiateGoogleAuth).toHaveBeenCalledWith(globalThis.location.pathname);

		unmount(component);
	});
});
