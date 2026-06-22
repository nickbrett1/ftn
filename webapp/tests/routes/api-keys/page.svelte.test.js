// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ApiKeysPage from '../../../src/routes/api-keys/+page.svelte';

// Mock the components
vi.mock('../../../src/lib/components/Header.svelte', () => ({
    default: vi.fn()
}));
vi.mock('../../../src/lib/components/Footer.svelte', () => ({
    default: vi.fn()
}));
vi.mock('svelte-awesome-icons', () => ({
    PlusSolid: vi.fn(),
    TrashCanSolid: vi.fn(),
    CheckCircleSolid: vi.fn(),
    CopyRegular: vi.fn()
}));

describe('ApiKeys Page', () => {
    beforeEach(() => {
        globalThis.fetch = vi.fn();
    });

    it('renders and fetches keys successfully', async () => {
        globalThis.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ keys: [{ id: '1', name: 'Test Key', createdAt: '2023-01-01T00:00:00.000Z' }] })
        });

        render(ApiKeysPage);

        // Should eventually show the test key
        const keyName = await screen.findByText('Test Key');
        expect(keyName).toBeTruthy();
    });

    it('shows init prompt when fetch fails with no such column error', async () => {
        globalThis.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'SQLITE_ERROR: no such column: rate_limit_count at offset 27' })
        });

        render(ApiKeysPage);

        const initButton = await screen.findByText('Initialize Database Schema');
        expect(initButton).toBeTruthy();

        const promptText = await screen.findByText(/The API Keys database table is missing or needs a schema update/i);
        expect(promptText).toBeTruthy();
    });
});
