import { expect, vi, describe, it, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { screen, fireEvent } from '@testing-library/dom';
import Login from './Login.svelte';

// Mock the shared Google auth utility
vi.mock('$lib/client/google-auth.js', () => ({
	initiateGoogleAuth: vi.fn()
}));

// Mock SvelteKit navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('Login correctly', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('logs in', async () => {
						const { initiateGoogleAuth } = await import('$lib/client/google-auth.js');
		const { goto } = await import('$app/navigation');

		// Mock document.cookie to simulate not logged in
		Object.defineProperty(document, 'cookie', {
			writable: true,
			value: ''
		});

		render(Login);
		const button = screen.getByRole('button');

		// Click the button
		fireEvent.click(button);

		// Should call the shared Google auth utility
		expect(initiateGoogleAuth).toHaveBeenCalledWith('/projects/ccbilling');
	});

	it('redirects to ccbilling if already logged in', async () => {
		const { goto } = await import('$app/navigation');

		// Mock document.cookie to simulate logged in
		Object.defineProperty(document, 'cookie', {
			writable: true,
			value: 'auth=some-auth-token'
		});

		render(Login);
		const button = screen.getByRole('button');

		// Click the button
		fireEvent.click(button);

		// Should redirect to ccbilling
		expect(goto).toHaveBeenCalledWith('/projects/ccbilling');
	});
});
