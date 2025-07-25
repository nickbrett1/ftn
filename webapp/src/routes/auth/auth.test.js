import { expect, describe, it, vi, beforeEach } from 'vitest';
import { GET } from './+server.js';
import { createServer } from 'miragejs';

const TEST_USER = 'test@test.com';

vi.mock('$env/static/private', async () => {
	return {
		GOOGLE_CLIENT_SECRET: '123',
		GOOGLE_CLIENT_ID: '123'
	};
});

describe('Auth', () => {
	let server;

	beforeEach(async () => {
		server = createServer({
			routes() {
				this.get('https://fintechnick.com', () => ({}));
				this.get('https://fintechnick.com/projects/ccbilling', (x) => x);
				this.post('https://oauth2.googleapis.com/token', () => ({
					access_token: 'mock_access_token',
					expires_in: 3600
				}));
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
		const res = await GET({
			request: new Request('https://fintechnick.com/auth?code=123'),
			platform: {
				env: {
					// Mock KV.get to simulate user being allowed
					KV: {
						get: vi.fn().mockResolvedValue('some_value_indicating_existence'), // User's email exists in KV
						put: vi.fn().mockResolvedValue(undefined)
					}
				}
			}
		});

		expect(res.headers.get('Location')).toEqual('https://fintechnick.com/projects/ccbilling');
	});

	it('redirect to preview if not in KV', async () => {
		const res = await GET({
			request: new Request('https://fintechnick.com/auth?code=123'),
			platform: {
				env: {
					// Mock KV.get to simulate user not being allowed
					KV: {
						get: vi.fn().mockResolvedValue(null), // User's email does not exist in KV
						put: vi.fn().mockResolvedValue(undefined) // KV.put shouldn't be called in this path
					}
				}
			}
		});

		expect(res.headers.get('Location')).toEqual('https://fintechnick.com/preview');
	});
});
