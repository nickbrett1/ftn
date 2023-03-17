import { expect, describe, it, vi, beforeEach } from 'vitest';
import { GET } from './+server.js';
import { createServer } from 'miragejs';

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
	let disableFauna;
	beforeEach(async () => {
		disableFauna = false;

		server = createServer({
			routes() {
				this.get('https://bemstudios.uk', () => ({}));
				this.get('https://bemstudios.uk/home', (x) => x);
				this.post('https://oauth2.googleapis.com/token', () => ({ json: '' }));
				this.get('https://www.googleapis.com/oauth2/v2/userinfo', () => ({
					verified_email: true,
					email: TEST_USER
				}));
				this.post('https://oauth2.googleapis.com/revoke');
				this.post('https://graphql.us.fauna.com/graphql', () =>
					disableFauna ? { data: { user: null } } : { data: { user: { email: TEST_USER } } }
				);
			}
		});

		return () => {
			server.shutdown();
		};
	});

	it('auth allows access if in KV', async () => {
		const res = await GET({
			request: new Request('https://bemstudios.uk/auth?code=123'),
			platform: { env: { KV: { put: () => {} } } }
		});

		expect(res.headers.get('Location')).toEqual('https://bemstudios.uk/home');
	});

	it('redirect to preview if not in database', async () => {
		disableFauna = true;
		const res = await GET({
			request: new Request('https://bemstudios.uk/auth?code=123'),
			platform: { env: { KV: { put: () => {} } } }
		});

		expect(res.headers.get('Location')).toEqual('https://bemstudios.uk/preview');
	});
});
