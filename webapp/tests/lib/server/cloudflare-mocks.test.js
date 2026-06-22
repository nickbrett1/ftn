import { describe, it, expect } from 'vitest';
import * as mocks from '../../../src/lib/server/cloudflare-mocks.js';

describe('cloudflare-mocks', () => {
	it('exports expected classes', () => {
		expect(new mocks.EmailMessage().isMock).toBe(true);
		expect(new mocks.RpcTarget().isMock).toBe(true);
		expect(new mocks.WorkflowEntrypoint().isMock).toBe(true);
		expect(new mocks.WorkflowEvent().isMock).toBe(true);
		expect(new mocks.DurableObject().isMock).toBe(true);
	});

	it('exports expected functions', () => {
		expect(mocks.connect()).toBeNull();
	});

	it('exports expected constants', () => {
		expect(mocks.env).toEqual({});
		expect(mocks.exports).toEqual({});
	});
});
