import { describe, it, expect, beforeEach, vi } from 'vitest';
import Handlebars from 'handlebars';

describe('precompiled-templates.js', () => {
	beforeEach(() => {
		// Expose Handlebars globally as expected by the generated precompiled IIFE
		globalThis.Handlebars = Handlebars;
		globalThis.Handlebars.templates = {};
		vi.resetModules();
	});

	it('should populate Handlebars.templates with precompiled templates', async () => {
		// Importing the file should execute the IIFE and populate Handlebars.templates
		await import('../../../src/lib/server/precompiled-templates.js');

		expect(globalThis.Handlebars.templates).toBeDefined();
		expect(Object.keys(globalThis.Handlebars.templates).length).toBeGreaterThan(0);

		// Spot check a few known templates
		expect(globalThis.Handlebars.templates['devcontainer-node-dockerfile.hbs']).toBeDefined();
		expect(typeof globalThis.Handlebars.templates['devcontainer-node-dockerfile.hbs']).toBe('function');

		expect(globalThis.Handlebars.templates['devcontainer-java-dockerfile.hbs']).toBeDefined();
		expect(typeof globalThis.Handlebars.templates['devcontainer-java-dockerfile.hbs']).toBe('function');
	});
});
