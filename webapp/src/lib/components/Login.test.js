import { expect, vi, describe, it, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import Login from './Login.svelte';
import { setMockUser } from '../../test-setup.js'; // Import setMockUser

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('Login correctly', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setMockUser(null); // Set user to null before each test
	});

	afterEach(() => {
		// Clear all mocks and timers to prevent leaks
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.restoreAllMocks();
	});

	it('redirects to github auth', async () => {
		const { goto } = await import('$app/navigation');

		const component = mount(Login, {
			target: document.body
		});

		const button = document.querySelector('button');

		// Click the button
		button.click();

		flushSync();

		// Should redirect to github auth
		expect(goto).toHaveBeenCalledWith('/auth');

		unmount(component);
	});
});
