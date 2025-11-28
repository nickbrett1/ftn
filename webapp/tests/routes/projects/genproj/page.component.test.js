import { render, fireEvent, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Page from '../../../../src/routes/projects/genproj/+page.svelte';
import * as googleAuth from '$lib/client/google-auth';

// Mock the google-auth module
vi.mock('$lib/client/google-auth', () => ({
	initiateGoogleAuth: vi.fn(),
	isUserAuthenticated: vi.fn(() => false),
	getRedirectUri: vi.fn(() => 'http://localhost/auth')
}));

// Mock logging
vi.mock('$lib/utils/logging', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn()
	}
}));

// Mock navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock env
vi.mock('$app/environment', () => ({
	browser: true,
	dev: true
}));

// Mock AuthFlow component
vi.mock('$lib/components/genproj/AuthFlow.svelte', () => {
	return {
		default: class {
			constructor({ target }) {
				const div = document.createElement('div');
				div.dataset.testid = 'auth-flow-mock';
				target.append(div);
			}
			$destroy() {}
		}
	};
});

// Mock global constants used in Footer
globalThis.__GIT_BRANCH__ = 'test-branch';
globalThis.__GIT_COMMIT__ = 'test-commit';
globalThis.__BUILD_TIME__ = new Date().toISOString();

describe('GenProj Page Component', () => {
	const mockCapabilities = [
		{
			id: 'core-cap',
			name: 'Core Capability',
			category: 'core',
			description: 'Core cap',
			dependencies: [],
			conflicts: [],
			requiresAuth: []
		},
		{
			id: 'test-cap',
			name: 'Test Capability',
			category: 'ci-cd',
			description: 'Test cap',
			dependencies: [],
			conflicts: [],
			requiresAuth: []
		}
	];

	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.fetch = vi.fn();

		Object.defineProperty(globalThis, 'location', {
			value: {
				pathname: '/projects/genproj',
				origin: 'http://localhost',
				hostname: 'localhost',
				href: 'http://localhost/projects/genproj',
				assign: vi.fn()
			},
			writable: true,
			configurable: true
		});

		Object.defineProperty(globalThis, 'location', {
			value: {
				pathname: '/projects/genproj',
				origin: 'http://localhost',
				hostname: 'localhost',
				href: 'http://localhost/projects/genproj',
				assign: vi.fn()
			},
			writable: true,
			configurable: true
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should pass selected options to initiateGoogleAuth when login is clicked', async () => {
		const { component } = render(Page, {
			data: {
				isAuthenticated: false,
				capabilities: mockCapabilities,
				selectedCapabilities: ['core-cap']
			}
		});

		const loginButton = screen.getByRole('button', { name: /Login/i });
		expect(loginButton).toBeTruthy();

		await fireEvent.click(loginButton);

		expect(googleAuth.initiateGoogleAuth).toHaveBeenCalled();
		const calledArgument = googleAuth.initiateGoogleAuth.mock.calls[0][0];

		expect(calledArgument).toContain('selected=core-cap');
		expect(calledArgument).toContain('/projects/genproj');
	});

	it('should NOT automatically show AuthFlow on mount when authenticated and ready', async () => {
		// Setup data that previously triggered auto-show
		const data = {
			isAuthenticated: true,
			capabilities: mockCapabilities,
			selectedCapabilities: ['core-cap'],
			projectName: 'my-project'
		};

		const { component } = render(Page, { data });

		// Wait a bit because the previous logic had a setTimeout
		await new Promise((r) => setTimeout(r, 200));

		// Verify that the Generate button is visible and enabled (meaning we are ready)
		const generateButton = screen.getByTestId('generate-button');
		expect(generateButton).toBeTruthy();
		expect(generateButton.disabled).toBe(false);

		// Verify that AuthFlow is NOT visible
		// Since we mocked it to render 'data-testid="auth-flow-mock"', we look for that
		const authFlow = screen.queryByTestId('auth-flow-mock');
		expect(authFlow).toBeNull();
	});
});
