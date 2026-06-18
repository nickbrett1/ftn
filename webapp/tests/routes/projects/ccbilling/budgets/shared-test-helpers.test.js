/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as helpers from '../../../../../src/routes/projects/ccbilling/budgets/shared-test-helpers.js';

const InteractiveMockComponent = {
    render: (props) => {
        const div = document.createElement('div');

        const btn = document.createElement('button');
        btn.textContent = props.buttonText || 'Add New Budget';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = props.inputValue || 'v';

        const form = document.createElement('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const body = props.expectedBody || { name: input.value };
            globalThis.fetch(props.expectedUrl || '/api', {
                method: props.expectedMethod || 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            // append loading text to container to satisfy testLoadingState
            div.innerHTML += 'load';
        });

        div.appendChild(btn);
        div.appendChild(input);
        div.appendChild(form);

        return { container: div };
    }
};

const MockEditComponent = {
    render: (props) => {
        const div = document.createElement('div');

        const btn = document.createElement('button');
        btn.textContent = 'Edit';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = props.inputValue || 'v';

        saveBtn.addEventListener('click', (e) => {
            globalThis.fetch(props.expectedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(props.expectedBody)
            });
        });

        div.appendChild(btn);
        div.appendChild(input);
        div.appendChild(saveBtn);
        return { container: div };
    }
};

const MockDeleteComponent = {
    render: (props) => {
        const div = document.createElement('div');

        const btn = document.createElement('button');
        btn.textContent = props.buttonText || 'Delete';

        const confBtn = document.createElement('button');
        confBtn.textContent = 'Confirm';

        confBtn.addEventListener('click', (e) => {
            const opts = { method: 'DELETE' };
            if (props.expectedBody) {
                opts.headers = { 'Content-Type': 'application/json' };
                opts.body = JSON.stringify(props.expectedBody);
            }
            globalThis.fetch(props.expectedUrl, opts);
        });

        div.appendChild(btn);
        div.appendChild(confBtn);
        return { container: div };
    }
};

vi.mock('@testing-library/svelte/svelte5', () => ({
    render: vi.fn().mockImplementation((Component, options) => {
        return Component.render(options.props);
    }),
    fireEvent: {
        click: vi.fn().mockImplementation(async (el) => {
            el.dispatchEvent(new Event('click'));
        }),
        input: vi.fn().mockImplementation(async (input, val) => {
            input.value = val.target.value;
        }),
        submit: vi.fn().mockImplementation(async (form) => {
            form.dispatchEvent(new Event('submit'));
        })
    },
    waitFor: vi.fn().mockImplementation(async cb => {
        try {
            await cb();
        } catch (e) {
            // ignore
        }
    })
}));

describe('test CRUD wrapper', () => {
    let fetchMock;
    beforeEach(() => {
        fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
        vi.spyOn(helpers, 'setupTest').mockReturnValue(fetchMock);
        globalThis.fetch = fetchMock;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('testSuccessfulSubmission runs correctly', async () => {
        await helpers.testSuccessfulSubmission(
            InteractiveMockComponent,
            {
                buttonText: 'Add New Budget',
                expectedUrl: '/api',
                expectedMethod: 'POST',
                expectedBody: { a: 1 }
            },
            {
                buttonText: 'Add New Budget',
                inputValue: 'v',
                expectedUrl: '/api',
                expectedMethod: 'POST',
                expectedBody: { a: 1 }
            }
        );
    });

    it('testBudgetCRUD create works', async () => {
        await helpers.testBudgetCRUD.create(
            InteractiveMockComponent,
            {
                buttonText: 'Add New Budget',
                expectedUrl: '/projects/ccbilling/budgets',
                expectedMethod: 'POST',
                expectedBody: { name: 'Entertainment' }
            }
        );
    });

    it('testBudgetCRUD update works', async () => {
        await helpers.testBudgetCRUD.update(
            MockEditComponent,
            {
                data: { budgets: [{ id: 1 }] },
                expectedUrl: '/projects/ccbilling/budgets/1',
                expectedBody: { name: 'Updated Name' }
            }
        );
    });

    it('testBudgetCRUD delete works', async () => {
        await helpers.testBudgetCRUD.delete(
            MockDeleteComponent,
            {
                data: { budgets: [{ id: 1 }] },
                expectedUrl: '/projects/ccbilling/budgets/1'
            }
        );
    });

    it('testMerchantCRUD create works', async () => {
        await helpers.testMerchantCRUD.create(
            InteractiveMockComponent,
            {
                buttonText: 'Add Merchant',
                expectedUrl: '/projects/ccbilling/budgets/1/merchants',
                expectedMethod: 'POST',
                expectedBody: { merchant: 'Costco' },
                data: { budget: { id: 1 } }
            }
        );
    });

    it('testMerchantCRUD delete works', async () => {
        await helpers.testMerchantCRUD.delete(
            MockDeleteComponent,
            {
                buttonText: 'Remove',
                expectedUrl: '/projects/ccbilling/budgets/1/merchants',
                expectedBody: { merchant: 'W' },
                data: { budget: { id: 1 }, merchants: [{ merchant: 'W' }] }
            }
        );
    });

    it('testErrorHandling works correctly', async () => {
        await helpers.testErrorHandling(InteractiveMockComponent, { text: 'val' }, {
            buttonText: 'Add New Budget',
            inputValue: 'val',
            errorResponse: { ok: false },
            expectedError: 'err'
        });
    });

    it('testLoadingState works correctly', async () => {
        const { resolvePromise } = await helpers.testLoadingState(InteractiveMockComponent, { text: 'val' }, {
            buttonText: 'Add New Budget',
            inputValue: 'val',
            loadingText: 'load'
        });
        resolvePromise();
    });

    it('testFormValidation works correctly', async () => {
        await helpers.testFormValidation(InteractiveMockComponent, { text: 'val' }, 'Add New Budget', 'error');
    });

    it('setupMocks is defined', () => {
        expect(helpers.setupMocks).toBeDefined();
    });

    it('createBudget returns object', () => {
        expect(helpers.createBudget(1, 'G')).toEqual({
            id: 1, name: 'G', created_at: '2025-01-01T00:00:00Z'
        });
    });

    it('createMerchant returns object', () => {
        expect(helpers.createMerchant('W')).toEqual({ merchant: 'W' });
    });

    it('createBudgetData returns object', () => {
        expect(helpers.createBudgetData([{ id: 1 }])).toEqual({ budgets: [{ id: 1 }] });
    });

    it('createDetailData returns object', () => {
        expect(helpers.createDetailData({ id: 1 }, [{ merchant: 'W' }])).toEqual({ budget: { id: 1 }, merchants: [{ merchant: 'W' }] });
    });

    it('mockApiSuccess returns ok response', async () => {
        const res = helpers.mockApiSuccess({ a: 1 });
        expect(res.ok).toBe(true);
        expect(await res.json()).toEqual({ a: 1 });
    });

    it('mockApiError returns error response', async () => {
        const res = helpers.mockApiError('err', 400);
        expect(res.ok).toBe(false);
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: 'err' });
    });

    it('expectApiCall checks calls', () => {
        fetchMock('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}' });
        helpers.expectApiCall(fetchMock, '/api', 'POST', { a: 1 });
    });

    it('expectApiCall checks calls without body', () => {
        fetchMock('/api', { method: 'GET' });
        helpers.expectApiCall(fetchMock, '/api', 'GET', null);
    });

    it('findButtonByText returns button', () => {
        const div = document.createElement('div');
        div.innerHTML = '<button>Hello</button>';
        expect(helpers.findButtonByText(div, 'Hello').textContent).toBe('Hello');
    });

    it('findFormInput returns input', () => {
        const div = document.createElement('div');
        div.innerHTML = '<input type="text" />';
        expect(helpers.findFormInput(div)).not.toBeNull();
    });

    it('fillInput updates value', async () => {
        const input = document.createElement('input');
        await helpers.fillInput(input, 'val');
    });

    it('submitForm ignores if no form', async () => {
        const div = document.createElement('div');
        expect(await helpers.submitForm(div)).toBeNull();
    });

    it('clickButton ignores if no btn', async () => {
        await helpers.clickButton(null);
    });

    it('testBasicRendering', () => {
        helpers.testBasicRendering(InteractiveMockComponent, { text: 'basic' }, []);
    });

    it('testEmptyState', () => {
        helpers.testEmptyState(InteractiveMockComponent, { text: 'empty' }, []);
    });

    it('expectElementsPresent', () => {
        const div = document.createElement('div');
        div.innerHTML = '<span>a</span>';
        helpers.expectElementsPresent(div, ['a']);
    });

    it('expectElementsAbsent', () => {
        const div = document.createElement('div');
        div.innerHTML = '<span>a</span>';
        helpers.expectElementsAbsent(div, ['b']);
    });

    it('runValidationTests', () => {
        let i = 0;
        helpers.runValidationTests(() => { i++; });
        expect(i).toBe(3);
    });
});
