import { expect, vi, describe, it } from 'vitest';
import { render, act } from '@testing-library/svelte';
import { screen, fireEvent } from '@testing-library/dom';
import Login from './Login.svelte';

describe('Login correctly', () => {
	vi.mock('@tsparticles/engine');

	it('logs in', () => {
		const loginSpy = vi.fn();
		const mockedInitialize = vi.fn();
		const mockedRequestCode = vi.fn();
		const mockedInitCodeClient = vi.fn(() => ({
			initialize: mockedInitialize,
			requestCode: mockedRequestCode
		}));

		vi.stubGlobal('google', {
			accounts: {
				id: { initialize: mockedInitialize },
				oauth2: {
					initCodeClient: mockedInitCodeClient
				}
			}
		});

		render(Login);
		const button = screen.getByRole('button');
		button.onclick = loginSpy;

		fireEvent.click(button);
		expect(loginSpy).toBeCalled();

		act(() => {
			document.querySelector('script').onload();
		});

		expect(mockedInitialize).toBeCalled();
		expect(() => mockedInitialize.mock.calls[0][0].callback({ credential: {} })).toThrow();
		expect(() => mockedInitCodeClient.mock.calls[0][0].callback({ error: 'error' })).toThrow();
		expect(mockedInitCodeClient.mock.calls[0][0].redirect_uri).toBe('https://fintechnick.com/auth');

		expect(mockedRequestCode).toBeCalled();
		expect(() => screen.querySelector('script').onerror()).toThrow();

		fireEvent.click(button);
		expect(mockedRequestCode).toBeCalledTimes(2);
	});

	vi.mock('$app/navigation');
});
