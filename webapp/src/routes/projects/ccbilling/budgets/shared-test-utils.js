import { vi } from 'vitest';

/**
 * Comprehensive shared test utilities for budget management
 * Eliminates code duplication and standardizes test patterns
 */

// ========== MOCK FACTORIES ==========

export const createMockFetch = () => {
	const mockFetch = vi.fn();
	global.fetch = mockFetch;
	return mockFetch;
};

export const createMockEvent = (overrides = {}) => ({
	params: {},
	url: new URL('http://localhost/projects/ccbilling/budgets'),
	request: {
		headers: new Map(),
		json: vi.fn()
	},
	...overrides
});

// ========== TEST DATA FACTORIES ==========

export const createBudgetData = (overrides = {}) => ({
	id: 1,
	name: 'Groceries',
	created_at: '2025-01-01T00:00:00Z',
	...overrides
});

export const createMerchantData = (overrides = {}) => ({
	merchant: 'Walmart',
	...overrides
});

export const createBudgetList = (count = 2) => 
	Array.from({ length: count }, (_, i) => createBudgetData({
		id: i + 1,
		name: ['Groceries', 'Utilities', 'Entertainment', 'Transport'][i] || `Budget ${i + 1}`
	}));

export const createMerchantList = (merchants = ['Walmart', 'Target']) =>
	merchants.map(merchant => ({ merchant }));

// ========== RESPONSE FACTORIES ==========

export const createSuccessResponse = (data = { success: true }) => ({
	ok: true,
	json: () => Promise.resolve(data)
});

export const createErrorResponse = (error = 'An error occurred', status = 400) => ({
	ok: false,
	status,
	json: () => Promise.resolve({ error })
});

export const createNetworkError = (message = 'Network error') => 
	new Error(message);

// ========== MOCK SETUP HELPERS ==========

export const setupMockFetch = (defaultResponse = createSuccessResponse()) => {
	const mockFetch = createMockFetch();
	mockFetch.mockResolvedValue(defaultResponse);
	return mockFetch;
};

export const setupAuthMock = (requireUser, shouldSucceed = true) => {
	if (shouldSucceed) {
		requireUser.mockResolvedValue({ email: 'test@test.com' });
	} else {
		requireUser.mockResolvedValue(new Response(null, { 
			status: 307, 
			headers: { Location: '/preview' } 
		}));
	}
	return requireUser;
};

export const setupDatabaseMocks = (mocks, defaultData = []) => {
	Object.entries(mocks).forEach(([name, mock]) => {
		mock.mockResolvedValue(defaultData);
	});
	return mocks;
};

// ========== API TESTING HELPERS ==========

export const expectApiCall = (fetchMock, url, method = 'GET', body = null) => {
	const expectedOptions = { method };
	
	if (body) {
		expectedOptions.headers = { 'Content-Type': 'application/json' };
		expectedOptions.body = JSON.stringify(body);
	}
	
	return expect(fetchMock).toHaveBeenCalledWith(url, expect.objectContaining(expectedOptions));
};

export const expectBudgetCreation = (fetchMock, name) => 
	expectApiCall(fetchMock, '/projects/ccbilling/budgets', 'POST', { name });

export const expectBudgetUpdate = (fetchMock, id, name) =>
	expectApiCall(fetchMock, `/projects/ccbilling/budgets/${id}`, 'PUT', { name });

export const expectBudgetDeletion = (fetchMock, id) =>
	expectApiCall(fetchMock, `/projects/ccbilling/budgets/${id}`, 'DELETE');

export const expectMerchantCreation = (fetchMock, budgetId, merchant) =>
	expectApiCall(fetchMock, `/projects/ccbilling/budgets/${budgetId}/merchants`, 'POST', { merchant });

export const expectMerchantDeletion = (fetchMock, budgetId, merchant) =>
	expectApiCall(fetchMock, `/projects/ccbilling/budgets/${budgetId}/merchants`, 'DELETE', { merchant });

// ========== VALIDATION HELPERS ==========

export const testInputValidation = (value, shouldBeValid = false) => {
	const isValid = !!(value && value.trim && value.trim().length > 0);
	return expect(isValid).toBe(shouldBeValid);
};

export const testInputTrimming = (input, expected) => {
	const trimmed = input.trim();
	return expect(trimmed).toBe(expected);
};

// ========== REDIRECT TESTING ==========

export const testRedirectScenario = async (loadFunction, event, expectedLocation = '/preview') => {
	let caughtError;
	try {
		await loadFunction(event);
	} catch (error) {
		caughtError = error;
	}
	
	// Generate expected redirect error for comparison
	let expectedError;
	try {
		const { redirect } = await import('@sveltejs/kit');
		redirect(307, expectedLocation);
	} catch (redirectError) {
		expectedError = redirectError;
	}
	
	expect(caughtError).toEqual(expectedError);
};

// ========== ERROR TESTING ==========

export const testErrorHandling = async (operation, expectedError = 'Database error') => {
	try {
		await operation();
		throw new Error('Expected operation to throw');
	} catch (error) {
		if (error.message === 'Expected operation to throw') {
			throw error;
		}
		expect(error.message).toBe(expectedError);
	}
};

// ========== COMPONENT TESTING HELPERS ==========

export const setupComponentTest = () => ({
	mockFetch: setupMockFetch(),
	mockData: {
		budgets: createBudgetList(),
		budget: createBudgetData(),
		merchants: createMerchantList()
	}
});

export const simulateFormSubmission = async (fireEvent, screen, formData) => {
	const { inputValue, submitButtonText, inputSelector = 'textbox' } = formData;
	
	const input = screen.getByRole(inputSelector);
	await fireEvent.input(input, { target: { value: inputValue } });
	
	const submitButton = screen.getByText(submitButtonText);
	await fireEvent.click(submitButton);
	
	return { input, submitButton };
};

export const expectFormValidation = (screen, errorMessage) => {
	return expect(screen.getByText(errorMessage)).toBeInTheDocument();
};

export const expectLoadingState = (screen, loadingText) => {
	return expect(screen.getByText(loadingText)).toBeInTheDocument();
};

// ========== TEST LIFECYCLE HELPERS ==========

export const standardBeforeEach = () => {
	vi.clearAllMocks();
	return setupMockFetch();
};

export const standardTestSetup = (mocks = {}) => {
	const mockFetch = standardBeforeEach();
	
	// Setup common mocks
	if (mocks.requireUser) {
		setupAuthMock(mocks.requireUser, true);
	}
	
	if (mocks.database) {
		setupDatabaseMocks(mocks.database, []);
	}
	
	return { mockFetch, ...mocks };
};

// ========== COMMON TEST SCENARIOS ==========

export const createCommonScenarios = (testSuite) => ({
	authentication: () => testSuite('redirects unauthenticated users'),
	validation: () => testSuite('validates input correctly'),
	apiSuccess: () => testSuite('handles successful API calls'),
	apiError: () => testSuite('handles API errors gracefully'),
	networkError: () => testSuite('handles network errors'),
	loading: () => testSuite('shows loading states'),
	emptyState: () => testSuite('handles empty data')
});

// ========== BATCH OPERATIONS ==========

export const runValidationTests = (testRunner) => {
	const validationCases = [
		{ input: '', valid: false, name: 'empty string' },
		{ input: '   ', valid: false, name: 'whitespace only' },
		{ input: 'Valid Name', valid: true, name: 'valid input' },
		{ input: '  Valid Name  ', valid: true, name: 'valid input with whitespace' }
	];
	
	validationCases.forEach(({ input, valid, name }) => {
		testRunner(input, valid, name);
	});
};

export const runApiTests = (testRunner) => {
	const apiScenarios = [
		{ type: 'success', response: createSuccessResponse(), shouldSucceed: true },
		{ type: 'client error', response: createErrorResponse('Bad Request', 400), shouldSucceed: false },
		{ type: 'server error', response: createErrorResponse('Server Error', 500), shouldSucceed: false },
		{ type: 'network error', response: createNetworkError(), shouldSucceed: false }
	];
	
	apiScenarios.forEach(({ type, response, shouldSucceed }) => {
		testRunner(type, response, shouldSucceed);
	});
};