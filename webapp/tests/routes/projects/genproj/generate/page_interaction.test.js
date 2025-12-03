import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    });

    it('displays success message on successful generation', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                message: 'Success',
                repositoryUrl: 'https://github.com/user/repo'
            })
        });

        render(Page, { data: defaultData });

        const generateBtn = screen.getByRole('button', { name: /Generate Project/i });
        await fireEvent.click(generateBtn);

        // Expect success message
        await waitFor(() => {
            expect(screen.getByText(/Project generated successfully/i)).toBeTruthy();
        });

        // Ensure goto is called eventually
        await waitFor(() => {
             expect(goto).toHaveBeenCalledWith('https://github.com/user/repo');
        }, { timeout: 3000 }); // Increase timeout to account for delay
    });
});
