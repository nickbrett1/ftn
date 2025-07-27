import { vi } from 'vitest';

/**
 * Shared test utilities for budget management tests
 * Reduces code duplication and standardizes test setup
 */

export const mockFetch = () => {
	global.fetch = vi.fn();
	return global.fetch;
};

export const createMockEvent = (params = {}, url = 'http://localhost/projects/ccbilling/budgets') => ({
	params,
	url: new URL(url),
	request: {
		headers: new Map(),
		json: vi.fn()
	}
});

export const createMockBudgets = () => [
	{ id: 1, name: 'Groceries', created_at: '2025-01-01' },
	{ id: 2, name: 'Utilities', created_at: '2025-01-02' }
];

export const createMockMerchants = () => [
	{ merchant: 'Walmart' },
	{ merchant: 'Target' }
];

export const mockSuccessResponse = (data = { success: true }) => ({
	ok: true,
	json: () => Promise.resolve(data)
});

export const mockErrorResponse = (error = 'An error occurred') => ({
	ok: false,
	json: () => Promise.resolve({ error })
});

export const mockRedirectResponse = (location = '/preview') => new Response(null, {
	status: 307,
	headers: { Location: location }
});

/**
 * Common mock setups for dependencies
 */
export const setupRequireUserMock = (requireUser) => {
	requireUser.mockResolvedValue({ email: 'test@test.com' });
	return requireUser;
};

export const setupDatabaseMocks = (mocks) => {
	Object.entries(mocks).forEach(([name, mock]) => {
		mock.mockResolvedValue([]);
	});
	return mocks;
};

/**
 * Common test scenarios
 */
export const testAuthenticationRedirect = async (loadFunction, event, requireUser) => {
	requireUser.mockResolvedValue(mockRedirectResponse());
	
	try {
		await loadFunction(event);
		throw new Error('Should have thrown redirect');
	} catch (error) {
		if (!(error instanceof Response)) {
			throw error;
		}
		return error;
	}
};

export const testDatabaseError = async (loadFunction, event, dbFunction, errorMessage = 'Database error') => {
	dbFunction.mockRejectedValue(new Error(errorMessage));
	
	try {
		await loadFunction(event);
		throw new Error('Should have thrown database error');
	} catch (error) {
		if (error.message === 'Should have thrown database error') {
			throw error;
		}
		return error;
	}
};

/**
 * Assertion helpers
 */
export const expectApiCall = (fetchMock, url, method = 'GET', body = null) => {
	const expectedOptions = {
		method,
		headers: { 'Content-Type': 'application/json' }
	};
	
	if (body) {
		expectedOptions.body = JSON.stringify(body);
	}
	
	expect(fetchMock).toHaveBeenCalledWith(url, expect.objectContaining(expectedOptions));
};

export const expectRedirect = (response, status = 307) => {
	expect(response).toBeInstanceOf(Response);
	expect(response.status).toBe(status);
};