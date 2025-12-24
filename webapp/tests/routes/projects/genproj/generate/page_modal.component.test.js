import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import Page from '../../../../../src/routes/projects/genproj/generate/+page.svelte';

// Mock dependencies
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/client/github-auth.js', () => ({
	initiateGitHubAuth: vi.fn()
}));

vi.mock('$lib/components/Header.svelte', () => ({
	default: vi.fn()
}));

vi.mock('$lib/components/Footer.svelte', () => ({
	default: vi.fn()
}));

describe('Generate Page Component', () => {
	const data = {
		projectName: 'test-project',
		repositoryUrl: 'https://github.com/user/test-project',
		selected: 'sveltekit,tailwindcss',
		previewData: { files: [] }
	};

	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.fetch = vi.fn();
	});

	it('should show modal when REPOSITORY_EXISTS error occurs', async () => {
		// Mock 409 response
		globalThis.fetch.mockResolvedValueOnce({
			ok: false,
			status: 409,
			json: async () => ({ code: 'REPOSITORY_EXISTS', message: 'Repository already exists' })
		});

		const { getByText, getByRole } = render(Page, { data });

		// Click Generate button
		const generateButton = getByRole('button', { name: /generate project/i });
		await fireEvent.click(generateButton);

		// Check if modal appears
		expect(getByText('Repository Already Exists')).toBeTruthy();
		expect(screen.getAllByText('test-project').length).toBeGreaterThan(0);
	});

	it('should handle rename option', async () => {
		// 1. Initial fail with 409
		globalThis.fetch.mockResolvedValueOnce({
			ok: false,
			status: 409,
			json: async () => ({ code: 'REPOSITORY_EXISTS', message: 'Repository already exists' })
		});

		const { getByText, getByRole, getByLabelText } = render(Page, { data });

		// Trigger modal
		await fireEvent.click(getByRole('button', { name: /generate project/i }));

		// 2. Mock success for second attempt (rename)
		globalThis.fetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ repositoryUrl: 'https://github.com/user/new-name' })
		});

		// Type new name
		const input = getByLabelText('Option 1: Choose a different name');
		await fireEvent.input(input, { target: { value: 'new-name' } });

		// Click Rename
		await fireEvent.click(getByRole('button', { name: 'Rename' }));

		// Verify API call with new name
		expect(globalThis.fetch).toHaveBeenLastCalledWith(
			'/projects/genproj/api/generate',
			expect.objectContaining({
				body: expect.stringContaining('"name":"new-name"')
			})
		);
	});

	it('should handle overwrite option', async () => {
		// 1. Initial fail with 409
		globalThis.fetch.mockResolvedValueOnce({
			ok: false,
			status: 409,
			json: async () => ({ code: 'REPOSITORY_EXISTS', message: 'Repository already exists' })
		});

		const { getByText, getByRole } = render(Page, { data });

		// Trigger modal
		await fireEvent.click(getByRole('button', { name: /generate project/i }));

		// 2. Mock success for overwrite attempt
		globalThis.fetch.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ repositoryUrl: 'https://github.com/user/test-project' })
		});

		// Click Overwrite
		await fireEvent.click(getByRole('button', { name: /overwrite/i }));

		// Verify API call with overwrite: true
		expect(globalThis.fetch).toHaveBeenLastCalledWith(
			'/projects/genproj/api/generate',
			expect.objectContaining({
				body: expect.stringContaining('"overwrite":true')
			})
		);
	});
});
