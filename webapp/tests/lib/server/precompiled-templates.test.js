import { describe, it, expect, beforeAll } from 'vitest';
import Handlebars from 'handlebars';

describe('precompiled-templates', () => {
    beforeAll(async () => {
        globalThis.Handlebars = Handlebars;
        await import('../../../src/lib/server/precompiled-templates.js');
    });

    it('should register templates in Handlebars.templates', () => {
        expect(Handlebars.templates).toBeDefined();
        expect(Handlebars.templates['playwright-config.hbs']).toBeDefined();

        const output = Handlebars.templates['playwright-config.hbs']({});
        expect(output).toContain('export default defineConfig');
    });
});
