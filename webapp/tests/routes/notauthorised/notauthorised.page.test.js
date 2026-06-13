import { describe, it, expect } from 'vitest';
import { load } from '../../../src/routes/notauthorised/+page.js';

describe('Not Authorised Page Load', () => {
	it('should return redirectTo parameter from URL when present', () => {
		const url = new URL('http://localhost/notauthorised?redirectTo=/projects/agent-swarm');
		const result = load({ url });
		expect(result).toEqual({ redirectTo: '/projects/agent-swarm' });
	});

	it('should default to / when redirectTo parameter is missing', () => {
		const url = new URL('http://localhost/notauthorised');
		const result = load({ url });
		expect(result).toEqual({ redirectTo: '/' });
	});

	it('should default to / when redirectTo parameter is empty', () => {
		const url = new URL('http://localhost/notauthorised?redirectTo=');
		const result = load({ url });
		expect(result).toEqual({ redirectTo: '/' });
	});
});
