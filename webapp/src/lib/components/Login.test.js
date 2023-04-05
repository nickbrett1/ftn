import { expect, vi, describe, it } from 'vitest';
import { render, act } from '@testing-library/svelte';
import { screen, fireEvent } from '@testing-library/dom';
import Login from './Login.svelte';

/**
 * @vitest-environment jsdom
 */
describe('Login correctly', () => {
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

		render(Login, { loggedInText: 'Home', loggedOutText: 'Login', class: '' });
		const button = screen.getByText('Login');
		button.onclick = loginSpy;

		fireEvent.click(button);
		expect(loginSpy).toBeCalled();

		act(() => {
			document.querySelector('script').onload();
		});

		expect(mockedInitialize).toBeCalled();
		expect(() => mockedInitialize.mock.calls[0][0].callback({ credential: {} })).toThrow();
		expect(() => mockedInitCodeClient.mock.calls[0][0].callback({ error: 'error' })).toThrow();
		expect(mockedInitCodeClient.mock.calls[0][0].redirect_uri).toBe('https://bemstudios.uk/auth');

		expect(mockedRequestCode).toBeCalled();
		expect(() => screen.querySelector('script').onerror()).toThrow();

		fireEvent.click(button);
		expect(mockedRequestCode).toBeCalledTimes(2);
	});

	vi.mock('$app/navigation');

	it('goes to home after login', () => {
		document.cookie = 'auth=123';
		render(Login, { loggedInText: 'Home', loggedOutText: 'Login', class: '' });
		act(() => {
			fireEvent.click(screen.getByText('Home'));
		});
	});
});
