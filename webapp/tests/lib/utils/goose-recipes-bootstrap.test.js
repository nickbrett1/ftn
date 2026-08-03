import { describe, it, expect } from 'vitest';
import { generateGooseSetupScript } from '$lib/utils/file-generator';

describe('goose recipes bootstrap in generated projects', () => {
	const ctx = { capabilities: ['coding-agents', 'doppler'], configuration: {} };

	it('adds GOOSE_RECIPE_GITHUB_REPO to the generated config', () => {
		const script = generateGooseSetupScript(ctx);
		expect(script).toContain('GOOSE_RECIPE_GITHUB_REPO: "nickbrett1/goose-recipes"');
	});

	it('clones/pulls the recipes repo into the global recipes dir', () => {
		const script = generateGooseSetupScript(ctx);
		expect(script).toContain('$HOME/.config/goose/recipes');
		expect(script).toContain('git clone --quiet https://github.com/nickbrett1/goose-recipes.git');
		expect(script).toContain('git pull --ff-only --quiet');
	});

	it('keeps existing MCP server config intact', () => {
		const script = generateGooseSetupScript(ctx);
		expect(script).toContain('fintechnick:');
		expect(script).toContain('GOOSECFGEOF');
	});
});
