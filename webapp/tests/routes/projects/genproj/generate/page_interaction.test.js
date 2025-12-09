import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Page from '../../../../../src/routes/projects/genproj/generate/+page.svelte';
import { goto } from '$app/navigation';

// Mock child components
vi.mock('$lib/components/Header.svelte', () => ({ default: vi.fn() }));
vi.mock('$lib/components/Footer.svelte', () => ({ default: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/utils/logging.js', () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('$lib/client/github-auth.js', () => ({ initiateGitHubAuth: vi.fn() }));

describe('Generate Page Interaction', () => {
	const defaultData = {
		projectName: 'test-project',
		repositoryUrl: '',
		selected: 'core',
		previewData: { files: [] }
	};

	beforeEach(() => {
		global.fetch = vi.fn();
		vi.clearAllMocks();
		vi.useFakeTimers();

		// Mock window.location.href
		Object.defineProperty(window, 'location', {
			value: {
				href: '',
				origin: 'http://localhost'
			},
			writable: true
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('displays success message on successful generation and redirects', async () => {
		const repoUrl = 'https://github.com/user/repo';
		global.fetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				message: 'Success',
				repositoryUrl: repoUrl
			})
		});

		render(Page, { data: defaultData });

		const generateBtn = screen.getByRole('button', { name: /Generate Project/i });
		await fireEvent.click(generateBtn);

		// Expect success message
		await waitFor(() => {
			expect(screen.getByText(/Project generated successfully/i)).toBeTruthy();
		});

		// Fast-forward timers to trigger redirection
		vi.runAllTimers();

		// Check redirection
		// Since repoUrl starts with http, it should use window.location.href
		expect(window.location.href).toBe(repoUrl);
		expect(goto).not.toHaveBeenCalled();
	});
});
