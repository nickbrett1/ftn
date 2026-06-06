import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '../../../../../src/routes/projects/ccbilling/cards/+page.server.js';

// Mock SvelteKit redirect function
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn()
}));

// Mock the requireUser function
vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

// Mock the ccbilling-db functions
vi.mock('$lib/server/ccbilling-db.js', () => ({
	listCreditCards: vi.fn()
}));

describe('CCBilling Cards Page Server Route', () => {
	let mockEvent;
	let mockPlatform;
	let mockRequireUser;
	let mockRedirect;
	let mockListCreditCards;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Mock platform environment
		mockPlatform = {
			env: {
				KV: {
					get: vi.fn()
				},
				CCBILLING_DB: {
					prepare: vi.fn()
				}
			}
		};

		// Mock event object
		mockEvent = {
			platform: mockPlatform,
			cookies: {
				get: vi.fn()
			},
			request: {
				headers: {
					get: vi.fn()
				}
			},
			depends: vi.fn(),
            url: { pathname: '/projects/ccbilling/cards' }
		};

		// Get mocked functions
		mockRequireUser = (await import('$lib/server/require-user.js')).requireUser;
		mockRedirect = (await import('@sveltejs/kit')).redirect;
		mockListCreditCards = (await import('$lib/server/ccbilling-db.js')).listCreditCards;
	});

	describe('load function', () => {
		it('should redirect to /notauthorised when user is not authenticated', async () => {
			const authResponse = new Response('Not authenticated', { status: 401 });
			mockRequireUser.mockResolvedValue(authResponse);

			await expect(load(mockEvent)).rejects.toThrow();
			expect(mockRedirect).toHaveBeenCalledWith(307, `/notauthorised?redirectTo=${encodeURIComponent(mockEvent.url.pathname)}`);
		});

		it('should return credit cards data when user is authenticated', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);

			// Mock credit cards data
			const cardsData = [{ id: 1, name: 'Card 1' }];
			mockListCreditCards.mockResolvedValue(cardsData);

			const result = await load(mockEvent);

			expect(result).toEqual({ creditCards: cardsData });
			expect(mockRequireUser).toHaveBeenCalledWith(mockEvent);
			expect(mockListCreditCards).toHaveBeenCalledWith(mockEvent);
		});
	});
});
