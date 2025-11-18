import { vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte/svelte5';
import { tick } from 'svelte';

/**
 * CONSOLIDATED TEST HELPERS FOR BUDGET MANAGEMENT
 * Eliminates duplication and provides standardized testing patterns
 */

// ========== COMMON SETUP ==========
export const setupTest = () => {
	vi.clearAllMocks();
	globalThis.fetch = vi.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({ success: true })
	});
	return globalThis.fetch;
};

export const setupMocks = () => {
	vi.mock('$app/navigation', () => ({
		goto: vi.fn(),
		invalidateAll: vi.fn()
	}));
};

// ========== DATA FACTORIES ==========
export const createBudget = (id = 1, name = 'Groceries') => ({
	id,
	name,
	created_at: '2025-01-01T00:00:00Z'
});

export const createMerchant = (name = 'Walmart') => ({ merchant: name });

export const createBudgetData = (budgets = []) => ({ budgets });

export const createDetailData = (budget, merchants = []) => ({ budget, merchants });

// ========== API HELPERS ==========
export const mockApiSuccess = (data = { success: true }) => ({
	ok: true,
	json: () => Promise.resolve(data)
});

export const mockApiError = (error = 'An error occurred', status = 400) => ({
	ok: false,
	status,
	json: () => Promise.resolve({ error })
});

export const expectApiCall = (fetchMock, url, method, body) => {
	const expectedOptions = { method };
	if (body) {
		expectedOptions.headers = { 'Content-Type': 'application/json' };
		expectedOptions.body = JSON.stringify(body);
	}
	return expect(fetchMock).toHaveBeenCalledWith(url, expect.objectContaining(expectedOptions));
};

// ========== UI INTERACTION HELPERS ==========
export const findButtonByText = (container, text) =>
	[...container.querySelectorAll('button')].find((button) => button.textContent?.includes(text));

export const findFormInput = (container, type = 'text') =>
	container.querySelector(`input[type="${type}"]`);

export const fillInput = async (input, value) => {
	await fireEvent.input(input, { target: { value } });
	await tick();
};

export const submitForm = async (container) => {
	const form = container.querySelector('form');
	if (form) {
		await fireEvent.submit(form);
		await tick();
	}
	return form;
};

export const clickButton = async (button) => {
	if (button) {
		await fireEvent.click(button);
		await tick();
	}
	return button;
};

// ========== COMMON TEST SCENARIOS ==========
export const testBasicRendering = (Component, properties, expectedContent) => {
	const { container } = render(Component, { props: properties });
	for (const content of expectedContent) {
		expect(container.innerHTML).toContain(content);
	}
	return container;
};

export const testEmptyState = (Component, properties, expectedEmptyContent) => {
	const { container } = render(Component, { props: properties });
	for (const content of expectedEmptyContent) {
		expect(container.innerHTML).toContain(content);
	}
	return container;
};

export const testFormValidation = async (Component, properties, buttonText, errorMessage) => {
	const { container } = render(Component, { props: properties });

	const button = findButtonByText(container, buttonText);
	if (button) {
		await clickButton(button);
		await submitForm(container);
		await waitFor(() => {
			expect(container.innerHTML).toContain(errorMessage);
		});
	}

	return container;
};

export const testSuccessfulSubmission = async (
	Component,
	properties,
	{ buttonText, inputValue, expectedUrl, expectedMethod, expectedBody }
) => {
	const fetchMock = setupTest();
	const { container } = render(Component, { props: properties });

	const button = findButtonByText(container, buttonText);
	if (button) {
		await clickButton(button);

		const input = findFormInput(container);
		if (input) {
			await fillInput(input, inputValue);
			await submitForm(container);

			expectApiCall(fetchMock, expectedUrl, expectedMethod, expectedBody);
		}
	}

	return { container, fetchMock };
};

export const testErrorHandling = async (
	Component,
	properties,
	{ buttonText, inputValue, errorResponse, expectedError }
) => {
	const fetchMock = setupTest();
	fetchMock.mockResolvedValueOnce(errorResponse);

	const { container } = render(Component, { props: properties });

	const button = findButtonByText(container, buttonText);
	if (button) {
		await clickButton(button);

		const input = findFormInput(container);
		if (input) {
			await fillInput(input, inputValue);
			await submitForm(container);

			await waitFor(() => {
				expect(container.innerHTML).toContain(expectedError);
			});
		}
	}

	return { container, fetchMock };
};

export const testLoadingState = async (
	Component,
	properties,
	{ buttonText, inputValue, loadingText }
) => {
	let resolvePromise;
	const delayedPromise = new Promise((resolve) => {
		resolvePromise = resolve;
	});

	const fetchMock = setupTest();
	fetchMock.mockReturnValueOnce(delayedPromise);

	const { container } = render(Component, { props: properties });

	const button = findButtonByText(container, buttonText);
	if (button) {
		await clickButton(button);

		const input = findFormInput(container);
		if (input) {
			await fillInput(input, inputValue);
			fireEvent.submit(container.querySelector('form')); // Don't await
			await tick();

			expect(container.innerHTML).toContain(loadingText);

			resolvePromise(mockApiSuccess());
		}
	}

	return { container, fetchMock, resolvePromise };
};

// ========== BUDGET-SPECIFIC HELPERS ==========
export const testBudgetCRUD = {
	async create(Component, properties, budgetName = 'Entertainment') {
		return testSuccessfulSubmission(Component, properties, {
			buttonText: 'Add New Budget',
			inputValue: budgetName,
			expectedUrl: '/projects/ccbilling/budgets',
			expectedMethod: 'POST',
			expectedBody: { name: budgetName }
		});
	},

	async update(Component, properties, budgetName = 'Updated Name') {
		const { container } = render(Component, { props: properties });

		const editButton = findButtonByText(container, 'Edit');
		if (editButton) {
			await clickButton(editButton);

			const input = findFormInput(container);
			if (input) {
				await fillInput(input, budgetName);

				const saveButton = findButtonByText(container, 'Save');
				if (saveButton) {
					await clickButton(saveButton);

					expectApiCall(
						globalThis.fetch,
						`/projects/ccbilling/budgets/${properties.data.budgets[0].id}`,
						'PUT',
						{ name: budgetName }
					);
				}
			}
		}

		return container;
	},

	async delete(Component, properties) {
		const { container } = render(Component, { props: properties });

		const deleteButton = findButtonByText(container, 'Delete');
		if (deleteButton) {
			await clickButton(deleteButton);

			const confirmButton = findButtonByText(container, 'Confirm');
			if (confirmButton) {
				await clickButton(confirmButton);

				expectApiCall(
					globalThis.fetch,
					`/projects/ccbilling/budgets/${properties.data.budgets[0].id}`,
					'DELETE'
				);
			}
		}

		return container;
	}
};

export const testMerchantCRUD = {
	async create(Component, properties, merchantName = 'Costco') {
		return testSuccessfulSubmission(Component, properties, {
			buttonText: 'Add Merchant',
			inputValue: merchantName,
			expectedUrl: `/projects/ccbilling/budgets/${properties.data.budget.id}/merchants`,
			expectedMethod: 'POST',
			expectedBody: { merchant: merchantName }
		});
	},

	async delete(Component, properties) {
		const { container } = render(Component, { props: properties });

		const removeButton = findButtonByText(container, 'Remove');
		if (removeButton) {
			await clickButton(removeButton);

			const confirmButton = findButtonByText(container, 'Confirm');
			if (confirmButton) {
				await clickButton(confirmButton);

				expectApiCall(
					globalThis.fetch,
					`/projects/ccbilling/budgets/${properties.data.budget.id}/merchants`,
					'DELETE',
					{ merchant: properties.data.merchants[0].merchant }
				);
			}
		}

		return container;
	}
};

// ========== VALIDATION HELPERS ==========
export const runValidationTests = (testFunction) => {
	const cases = [
		{ input: '', expected: false, name: 'empty' },
		{ input: '   ', expected: false, name: 'whitespace' },
		{ input: 'Valid', expected: true, name: 'valid' }
	];

	for (const { input, expected, name } of cases) {
		testFunction(input, expected, name);
	}
};

// ========== COMMON ASSERTIONS ==========
export const expectElementsPresent = (container, elements) => {
	for (const element of elements) {
		expect(container.innerHTML).toContain(element);
	}
};

export const expectElementsAbsent = (container, elements) => {
	for (const element of elements) {
		expect(container.innerHTML).not.toContain(element);
	}
};
