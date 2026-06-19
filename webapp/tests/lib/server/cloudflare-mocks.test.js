import { describe, it, expect } from 'vitest';
import { EmailMessage, RpcTarget, exports } from '../../../src/lib/server/cloudflare-mocks.js';

describe('cloudflare-mocks', () => {
	it('exports EmailMessage class', () => {
		const message = new EmailMessage();
		expect(message).toBeInstanceOf(EmailMessage);
	});

	it('exports RpcTarget class', () => {
		const target = new RpcTarget();
		expect(target).toBeInstanceOf(RpcTarget);
	});

	it('exports an empty exports object', () => {
		expect(exports).toEqual({});
	});
});
