import { expect, vi, describe, it, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { screen, fireEvent } from '@testing-library/dom';
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

	it('logs in', async () => {
		const { initiateGoogleAuth, isUserAuthenticated } = await import('$lib/client/google-auth.js');

		// Mock isUserAuthenticated to return false (not logged in)
		isUserAuthenticated.mockReturnValue(false);

		render(Login, {
			children: () => '<button>Login</button>'
		});
		const button = screen.getByRole('button');

		// Click the button
		fireEvent.click(button);

		// Should call the shared Google auth utility
		expect(initiateGoogleAuth).toHaveBeenCalledWith('/projects/ccbilling');
	});

	it('redirects to ccbilling if already logged in', async () => {
		const { goto } = await import('$app/navigation');
		const { initiateGoogleAuth, isUserAuthenticated } = await import('$lib/client/google-auth.js');

		// Mock isUserAuthenticated to return true (logged in)
		isUserAuthenticated.mockReturnValue(true);

		render(Login, {
			children: () => '<button>Login</button>'
		});
		const button = screen.getByRole('button');

		// Click the button
		fireEvent.click(button);

		// Should redirect to ccbilling
		expect(goto).toHaveBeenCalledWith('/projects/ccbilling');
		// Should not call initiateGoogleAuth
		expect(initiateGoogleAuth).not.toHaveBeenCalled();
	});
});
