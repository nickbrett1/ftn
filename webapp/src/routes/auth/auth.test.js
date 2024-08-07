import { expect, describe, it, vi, beforeEach } from 'vitest';
import { GET } from './+server.js';
import { createServer } from 'miragejs';

const mocks = vi.hoisted(() => {
	return {
		Client: vi.fn(),
		fql: vi.fn()
	};
});

vi.mock('fauna', () => {
	return {
		Client: mocks.Client,
		fql: mocks.fql
	};
});

const TEST_USER = 'test@test.com';

vi.mock('$env/static/private', async () => {
	return {
		GOOGLE_CLIENT_SECRET: '123',
		GOOGLE_CLIENT_ID: '123',
		FAUNA_AUTH: '123'
	};
});

describe('Auth', () => {
	let server;

	beforeEach(async () => {
		server = createServer({
			routes() {
				this.get('https://fintechnick.com', () => ({}));
				this.get('https://fintechnick.com/home', (x) => x);
				this.post('https://oauth2.googleapis.com/token', () => ({ json: '' }));
				this.get('https://www.googleapis.com/oauth2/v2/userinfo', () => ({
					verified_email: true,
					email: TEST_USER
				}));
				this.post('https://oauth2.googleapis.com/revoke');
			}
		});

		return () => {
			server.shutdown();
		};
	});

	it('auth allows access if in KV', async () => {
		mocks.Client.mockImplementation(() => {
			return {
				query: vi.fn().mockImplementation(() => ({
					data: { data: [{ user: { email: TEST_USER } }] }
				}))
			};
		});

		const res = await GET({
			request: new Request('https://fintechnick.com/auth?code=123'),
			platform: { env: { KV: { put: () => {} } } }
		});

		expect(res.headers.get('Location')).toEqual('https://fintechnick.com/home');
		mocks.Client.mockRestore();
	});

	it('redirect to preview if not in database', async () => {
		mocks.Client.mockImplementation(() => {
			return {
				query: vi.fn().mockImplementation(() => ({
					data: { data: [] }
				}))
			};
		});

		const res = await GET({
			request: new Request('https://fintechnick.com/auth?code=123'),
			platform: { env: { KV: { put: () => {} } } }
		});

		expect(res.headers.get('Location')).toEqual('https://fintechnick.com/preview');
		mocks.Client.mockRestore();
	});
});
